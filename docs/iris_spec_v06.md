---
title: "IRIS v0.6 — Spécification technique"
lang: fr-FR
---

# IRIS v0.6 — Spécification technique de référence

**Version alignée sur la démo technique v0.6**
**Licence : Creative Commons BY-SA 4.0** — voir section 10.

---

## 1. Vision synthétique

IRIS (*Inclusive Rational Interaction System*) est une application web de planification d'activités collectives. Elle remplace la négociation informelle (messagerie, sondages, tableurs) par un pipeline algorithmique en sept phases qui :

1. collecte les disponibilités et contraintes de chacun,
2. génère automatiquement les combinaisons d'activités faisables,
3. évalue leur **équité** via un score de bien-être collectif inspiré du Nash Social Welfare,
4. réduit l'espace de choix à un nombre restreint de scénarios réellement compétitifs (filtre de Pareto),
5. tranche démocratiquement via un scrutin de Condorcet lorsque plusieurs scénarios restent en lice.

Le principe directeur : **maximiser la satisfaction collective en pénalisant les grands écarts entre participants**, plutôt que de maximiser une simple moyenne qui pourrait sacrifier une minorité.

Cette version (v0.6) est une démo technique fonctionnelle à échelle réduite (groupes d'amis, événement à date unique). Les extensions prévues (séjours multi-jours, notifications, sous-types d'activités) sont documentées en section 11 mais **non implémentées** dans ce périmètre.

---

## 2. Modèle de données

Schéma réel (PostgreSQL / Supabase). Les types simplifiés ci-dessous omettent les colonnes techniques (`created_at`, `updated_at`, clés étrangères) sauf quand elles sont significatives pour l'algorithme.

### 2.1 Utilisateur (`users`)

| Champ | Type | Rôle |
|---|---|---|
| `id` | uuid | Identifiant, lié à `auth.users` |
| `display_name` | text | Nom affiché |
| `zone` | text | Adresse de départ (libre) |
| `home_lat`, `home_lng` | double | Coordonnées géolocalisées (via Nominatim/OSM) |
| `transport` | text | `foot` \| `transit` \| `car` |
| `distance_max` | int | Distance de confort en km (décroissance exponentielle au-delà) |
| `budget` | int | Budget habituel par sortie (€) |
| `social_level` | int (1–5) | Préférence d'ambiance : 1 = calme, 5 = festif |
| `weights` | jsonb | Poids des 5 dimensions d'utilité (section 5) |
| `hard_constraints` | jsonb | 19 contraintes dures activables (section 2.3) |
| `activity_prefs` | jsonb | Appréciation 0–100 par type d'activité, extensible |

### 2.2 Poids des critères (`weights`)

$$w = (w_{\text{activité}},\ w_{\text{horaires}},\ w_{\text{distance}},\ w_{\text{budget}},\ w_{\text{social}})$$

Valeurs par défaut : $w = (35,\ 25,\ 20,\ 10,\ 10)$, contrainte $\sum w_k = 100$.

### 2.3 Contraintes dures (19)

Réparties en 4 catégories :

- **Mobilité (4)** : PMR, escaliers, cardio, vertige, aquatique
- **Accompagnement (2)** : enfants, animal d'assistance
- **Alimentaire (8)** : noix, régime médical, vegan, gluten, fruits de mer, halal/casher, alcool, grossesse
- **Environnement (4)** : bruit, épilepsie/stroboscope, tabac, allergie animaux

Quatre d'entre elles sont **désactivables ponctuellement** (situationnelles, pas physiques) : enfants, animal, allergie animaux, bruit. L'utilisateur peut cocher un *override* par activité ("mes enfants seront gardés ce jour-là"), stocké dans `availabilities.constraint_overrides` (jsonb, scope événement).

### 2.4 Groupe (`groups`, `group_members`)

Un groupe rassemble des personnes planifiant ensemble dans la durée. `group_members.status` vaut `invited` (invitation en attente) ou `active` (a rejoint et participé au moins une fois). Un groupe possède un `invite_code` (lien d'adhésion direct).

### 2.5 Événement (`events`)

| Champ | Rôle |
|---|---|
| `phase` | Entier 1–7, voir section 3 |
| `group_ids` | Groupes invités (un événement peut réunir plusieurs groupes) |
| `proposed_dates` | Dates candidates, chacune avec `date`, `startTime`, `endTime` |
| `selected_date` | Date retenue après clôture Phase 2 |
| `budget_global` | Plafond de dépense collectif optionnel |
| `vote_started_at` | Horodatage d'ouverture du vote (Phase 6) — sert au calcul du délai |
| `winning_scenario_snapshot` | jsonb — scénario gagnant figé (voir section 3.7) |
| `vote_result` | jsonb — méthode de décision, matrice des duels, libellés (transparence) |

### 2.6 Disponibilité (`availabilities`)

Une ligne par (utilisateur, événement, date) : `status` (`ok` \| `maybe` \| `no`), `probability` (0–1, poids de présence), `slot_start`/`slot_end` (créneau horaire personnalisé optionnel), `budget_personal`, `constraint_overrides`.

### 2.7 Activité (`activities`)

Nom, `type` (libre, extensible par les participants), adresse géolocalisée, `duration_minutes`, `cost_per_person`, `social_level`, `opening_hours` (jsonb par jour de semaine, avec pause optionnelle — voir 3.4 pour le cas restaurant), et les 19 attributs booléens miroir des contraintes dures (`no_stairs`, `seafood_ok`, etc.).

### 2.8 Vote (`votes`)

Une ligne par (utilisateur, événement) : `ranking` (tableau ordonné d'identifiants de scénarios + le pseudo-candidat `NONE`), `is_default` (true si auto-généré faute de vote explicite avant l'échéance).

### 2.9 Historique de compensation (`utility_history`)

Une ligne par (utilisateur, événement, groupe) : `utility` (la satisfaction réellement obtenue sur le scénario retenu). Alimentée à la conclusion de chaque événement, lue par les événements futurs du même groupe pour calculer $R_i$ (section 6).

---

## 3. Pipeline algorithmique (7 phases)

### Phase 1 — Création de l'événement

L'organisateur choisit le(s) groupe(s) invités, propose une ou plusieurs dates candidates (avec créneau horaire), un quorum optionnel, un budget global optionnel.

### Phase 2 — Disponibilités

Chaque participant répond par date (`ok` / `maybe` / `no`), peut préciser un créneau horaire personnel plus étroit que celui de l'événement, un budget personnel, et remplit son profil de préférences s'il ne l'a pas encore fait. **Confidentialité** : seule une médiane de groupe est affichée pour le budget ; le budget individuel de chaque personne n'est visible que par elle-même. À la clôture (organisateur), la date la mieux couverte est verrouillée dans `selected_date`.

### Phase 3 — Activités

Chaque participant peut proposer une activité, avec type (liste extensible), adresse (autocomplétée via Nominatim/OpenStreetMap avec géocodage), prix, durée, horaires, et contraintes concernées. Chacun voit en plus son appréciation du type (pré-remplie depuis son profil, modifiable localement), la distance depuis son domicile, et un badge de compatibilité avec ses contraintes personnelles. Les créateurs peuvent modifier ou supprimer leurs propres suggestions tant que la phase n'est pas close.

**Horaires de service (restaurants)** : les types alimentaires (Restaurant, Gastronomie, Brunch) utilisent une plage `open`→`close` avec pause optionnelle `break_start`/`break_end` représentant les deux services (déjeuner / dîner) plutôt qu'une simple coupure méridienne.

À la clôture, chaque participant ayant modifié une appréciation de type se voit proposer de synchroniser son profil permanent (mise à jour du type existant, ou création d'un sous-type distinct — ex. différencier "Restaurant" et "Restaurant japonais").

### Phase 4 — Génération des scénarios

Pour la date retenue, le moteur (`lib/iris/scenario-engine.ts`) :

1. Détermine les **participants actifs** (statut `ok` ou `maybe`) et la fenêtre horaire commune.
2. Filtre les activités **atteignables** dans cette fenêtre (horaires d'ouverture réels, y compris fermetures nocturnes normalisées : une plage `22:00`→`02:00` est traitée comme `22:00`→`26:00`).
3. Génère toutes les combinaisons de **1 à 3 activités** parmi les activités viables.
4. Élimine les combinaisons où **au moins un participant actif** a un conflit de contrainte dure avec **au moins une activité** de la combinaison (règle du consensus total : le groupe fait les activités ensemble, aucune activité de la combinaison ne doit être bloquante pour personne).
5. Pour chaque combinaison retenue, teste **tous les ordres possibles** (permutations) pour trouver l'agencement temporel minimisant le temps d'attente, puis la durée totale. Une activité inaccessible à l'heure d'arrivée naturelle peut être atteinte via un temps d'attente explicite (ex. attendre l'ouverture du service du soir).

Aucun score n'est calculé à ce stade — uniquement la faisabilité. Le calcul d'utilité complet est réservé à la Phase 5, pour permettre à l'organisateur de revenir sur la liste d'activités sans recalcul coûteux si le nombre de scénarios est insuffisant.

### Phase 5 — Filtre Pareto

#### 5.1 Utilité individuelle par activité

Pour chaque activité $a$ d'un scénario et chaque utilisateur $u$ :

$$f_A(u,a) = \frac{\text{activity\_prefs}[u][\text{type}(a)]}{100} \qquad f_O(u,a) = 1 - \frac{|\,\text{social\_level}(u) - \text{social\_level}(a)\,|}{4}$$

Ces deux facteurs sont **centrés** ($1 \to +1$ parfait, $0.5 \to 0$ neutre, $0 \to -1$ horrible) puis **combinés par activité** avec des poids renormalisés entre eux uniquement :

$$r_A = \frac{w_{\text{activité}}}{w_{\text{activité}} + w_{\text{social}}} \qquad r_O = \frac{w_{\text{social}}}{w_{\text{activité}} + w_{\text{social}}}$$

$$c(u,a) = 2\big(r_A \cdot f_A(u,a) + r_O \cdot f_O(u,a)\big) - 1$$

#### 5.2 Agrégation des activités d'un scénario — sigmoïde hyperbolique

La somme des valeurs centrées sur les $k$ activités du scénario est ramenée dans $[0,1]$ via la tangente hyperbolique :

$$u_{\text{act}}(u,s) = \frac{\tanh\!\Big(\sum_{j=1}^{k} c(u,a_j)\Big) + 1}{2}$$

**Justification** : une moyenne géométrique appliquée ici pénaliserait mécaniquement tout scénario à plusieurs activités par rapport à la meilleure d'entre elles prise isolément ($\text{GM}(a,b) < \max(a,b)$ dès que $a \neq b$), ce qui est l'inverse de l'intuition réelle (le plaisir de plusieurs bonnes activités s'additionne). La somme centrée + tanh restitue cet effet cumulatif tout en pénalisant réellement l'ajout d'une activité franchement mauvaise (valeur centrée négative), sans jamais dépasser les bornes $[0,1]$.

#### 5.3 Facteurs de scénario (calculés une fois, indépendamment du nombre d'activités)

**Horaires** — chevauchement entre le créneau réel du scénario et le créneau personnel déclaré par l'utilisateur (s'il en a précisé un), pénalisé par le temps d'attente total :

$$f_S(u,s) = \text{overlap\_ratio}(u,s) \times \Big(1 - \min\big(0.5,\ \tfrac{\text{attente totale (min)}}{180}\big)\Big)$$

**Budget** — comparaison du coût total du scénario au budget personnel :

$$f_B(u,s) = \begin{cases} 1 & \text{si } \text{coût}(s) \le \text{budget}(u) \\ \max\!\big(0,\ 1 - \tfrac{\text{coût}(s) - \text{budget}(u)}{\text{budget}(u)}\big) & \text{sinon} \end{cases}$$

Le budget est un **frein souple** : un scénario dépassant le budget de quelqu'un n'est jamais éliminé, seulement pénalisé proportionnellement.

**Distance** — trajet complet aller-retour (domicile → activité 1 → … → activité $k$ → domicile), pas juste la distance à une activité isolée :

$$D_{\text{tot}}(u,s) = \text{haversine}(\text{domicile}, a_1) + \sum_{j=1}^{k-1}\text{haversine}(a_j, a_{j+1}) + \text{haversine}(a_k, \text{domicile})$$

$$f_D(u,s) = \exp\!\Big(-\frac{D_{\text{tot}}(u,s)}{2 \times \text{distance\_max}(u)}\Big)$$

*(Le facteur 2 au dénominateur compense l'aller-retour : pour un scénario à une seule activité, cette formule redonne exactement $\exp(-d/\text{distance\_max})$, la décroissance simple.)*

#### 5.4 Utilité individuelle du scénario

$$u'(u,s) = R_i \times \left[ \frac{w_{\text{activité}}+w_{\text{social}}}{100} \cdot u_{\text{act}}(u,s) \ +\ \frac{w_{\text{horaires}}}{100} \cdot f_S(u,s) \right.$$
$$\left. +\ \frac{w_{\text{budget}}}{100} \cdot f_B(u,s) \ +\ \frac{w_{\text{distance}}}{100} \cdot f_D(u,s) \right]$$

plafonnée à $1$. $R_i$ est le coefficient de compensation historique, section 4.

#### 5.5 Score collectif — moyenne géométrique pondérée (Nash Social Welfare)

$$\text{Score}(s) = \exp\!\left(\frac{\sum_{u} p(u) \cdot \ln\big(\varepsilon + u'(u,s)\big)}{\sum_{u} p(u)}\right), \qquad \varepsilon = 0.01$$

où $p(u)$ est le poids de présence de l'utilisateur (sa probabilité déclarée, réduite de 30 % s'il a répondu "peut-être" plutôt que "oui"). La moyenne géométrique — contrairement à une moyenne arithmétique — **pénalise fortement les grands écarts entre participants** : un scénario où une personne est ravie et une autre déteste obtient un moins bon score qu'un scénario où tout le monde est modérément satisfait, à moyenne arithmétique égale.

#### 5.6 Dominance de Pareto

Un scénario $s$ est **dominé** s'il existe un autre scénario $s'$ tel que :

$$\forall u:\ u'(u,s') \ge u'(u,s) \quad \text{et} \quad \exists u:\ u'(u,s') > u'(u,s)$$

Les scénarios dominés sont écartés avant même le calcul du seuil — ils ne représentent jamais un compromis pertinent, quel que soit leur score collectif.

#### 5.7 Seuil adaptatif (règle de Black modifiée)

```
non_dominés = scénarios − {dominés}
best        = max(Score(s)) parmi non_dominés
marge       = 10  (%)

tant que True:
    seuil      = best × (1 − marge/100)
    finalistes = { s ∈ non_dominés | Score(s) ≥ seuil }
    si |finalistes| > 10 : garder les 10 meilleurs scores
    si |finalistes| ≥ 2  : sortir
    si marge ≥ 50        : sortir
    marge += 5
```

- Si un seul scénario reste après la boucle (le seul non-dominé, ou survivant même à marge maximale) → il est recommandé **directement**, sans vote (Phase 6 sautée, passage direct en Phase 7).
- Sinon, les finalistes (2 à 10) passent au vote.

---

## 4. Compensation historique $R_i$

### 4.1 Principe

Un coefficient correcteur qui favorise, sur la durée, les participants systématiquement moins bien servis que la médiane du groupe — sans jamais dépasser un plafond raisonnable, pour ne pas créer d'effet de sur-correction.

### 4.2 Calcul du déficit — comparaison à la médiane de CHAQUE événement passé

Pour chaque événement passé $E$ auquel l'utilisateur $u$ a participé, on compare **son** utilité obtenue à la **médiane des utilités de tous les participants de ce même événement** (pas à la propre moyenne historique de $u$ — se comparer à soi-même ne détecte jamais d'écart avec le groupe) :

$$\delta(u, E) = \text{médiane}_{\,v \in E}\big(u'(v,E)\big) \;-\; u'(u,E)$$

$$R_i^{\text{brut}}(u) = 1 + \frac{1}{|\mathcal{E}_u|}\sum_{E \in \mathcal{E}_u} \delta(u,E) \times 0.2, \qquad R_i(u) = \text{clamp}\big(R_i^{\text{brut}}(u),\ 0.5,\ 1.2\big)$$

Un participant chroniquement en dessous de la médiane ($\delta > 0$) obtient $R_i > 1$ (boosté la prochaine fois) ; un participant chroniquement au-dessus obtient $R_i < 1$ (léger rééquilibrage).

### 4.3 Hybridation groupe / global

$$\alpha = \frac{\text{nombre d'événements de CE groupe dans l'historique de } u}{\text{nombre total d'événements de } u \text{ (tous groupes confondus)}}$$

$$R_i^{\text{effectif}} = \alpha \times R_i^{\text{groupe}} + (1-\alpha) \times R_i^{\text{global}}$$

Un membre régulier d'un seul groupe voit $\alpha \to 1$ (seul l'historique de ce groupe compte) ; un participant occasionnel multi-groupes voit $\alpha \to 0$ (l'historique global domine). **Première participation : $R_i = 1.0$ (neutre)**, aucun historique n'existe encore.

---

## 5. Vote de Condorcet (Phase 6)

### 5.1 Classement

Chaque participant ordonne librement les scénarios finalistes, plus un candidat spécial **« Aucun de ces scénarios ne me convient vraiment »**, positionnable n'importe où dans le classement (pas nécessairement en dernier). L'ordre par défaut proposé est trié selon l'utilité personnelle décroissante de l'utilisateur, avec le candidat "Aucun" en dernière position par défaut.

### 5.2 Matrice des duels et vainqueur

Pour chaque paire de candidats $(A,B)$, on compte le nombre de votants plaçant $A$ avant $B$. $A$ est **vainqueur de Condorcet** s'il bat tous les autres candidats en duel direct (majorité stricte face à chacun).

### 5.3 Repli — méthode de Black (score de Borda)

En l'absence de vainqueur de Condorcet (cycle), le classement est départagé par somme des rangs : le premier choix de chacun vaut $n-1$ points, le dernier $0$ point ; le total le plus élevé l'emporte.

### 5.4 Clôture

Le vote se conclut automatiquement dès que **tous les participants actifs ont voté**, ou que le **délai** est écoulé (48h par défaut à compter de l'ouverture du vote si la date de l'événement ne fournit pas une échéance exploitable). Les non-votants au délai reçoivent un classement par défaut (leur propre ordre d'utilité), tracé comme tel (`is_default = true`).

Si "Aucun de ces scénarios" l'emporte, l'événement retourne en Phase 3 (Activités) pour permettre au groupe de proposer d'autres idées — sans intervention nécessaire de l'organisateur.

---

## 6. Phase 7 — Résultats

Le scénario gagnant est figé (`winning_scenario_snapshot`) au moment de la conclusion, incluant la timeline complète, le coût, et l'utilité de chaque participant sur ce scénario précis — de façon à ne jamais dépendre d'un recalcul ultérieur si les données sources changent. L'historique de compensation (`utility_history`) est écrit à ce même instant, une ligne par participant actif.

La page affiche : le programme retenu, la satisfaction personnelle du visiteur et le score de groupe agrégé (jamais le détail nommé des autres), la méthode de décision (direct / Condorcet / Borda) avec la matrice des duels en transparence, et le coefficient de compensation — celui **appliqué** pour ce résultat (basé sur l'historique *avant* cet événement) ainsi que celui **mis à jour** pour le prochain événement du groupe (recalculé immédiatement après l'écriture du nouvel historique).

---

## 7. Architecture de confidentialité

Principe directeur : **chaque utilisateur ne voit jamais la donnée personnelle d'un autre**, seulement des agrégats.

- Les profils d'utilité (préférences, contraintes, budget, poids) ne quittent jamais le serveur vers un autre client que leur propriétaire.
- Les routes API (Pareto, Vote, Résultats) calculent le score de chacun côté serveur avec accès complet, mais **ne renvoient dans la réponse JSON que** : la valeur propre au demandeur, et l'agrégat de groupe (moyenne géométrique, déjà anonyme par construction).
- Le tableau des disponibilités n'affiche le budget individuel qu'au participant concerné ; les autres ne voient qu'une médiane de groupe.
- Le classement de vote de chacun reste privé — seule la matrice des duels (comptages agrégés, jamais nommés) est publique après clôture.

---

## 8. Résumé des variables et valeurs par défaut

| Variable | Valeur par défaut | Portée |
|---|---|---|
| Poids $(w_{\text{activité}},w_{\text{horaires}},w_{\text{distance}},w_{\text{budget}},w_{\text{social}})$ | $(35,25,20,10,10)$ | Profil, modifiable par événement |
| $\varepsilon$ (régularisation log) | $0.01$ | Global |
| Marge Pareto initiale | $10\%$ | Global, +5% par itération jusqu'à 50% max |
| Nombre max de finalistes | $10$ | Global |
| Combinaisons d'activités | 1 à 3 | Global |
| Pénalité d'attente max | $50\%$ de $f_S$ à 180 min d'attente cumulée | Global |
| Bornes $R_i$ | $[0.5,\ 1.2]$ | Par utilisateur |
| Coefficient de sensibilité $R_i$ | $0.2$ | Global |
| Délai de vote par défaut | 48h depuis l'ouverture du vote | Par événement, si date événement inexploitable |

---

## 9. Hors périmètre v0.6 (roadmap)

Documenté pour mémoire — **non implémenté** dans cette version :

- Événements multi-jours ("séjours")
- Sous-types d'activités formels (actuellement : types libres extensibles, sans hiérarchie parent/enfant)
- Notifications automatiques (rappels, alertes de clôture de phase)
- Feedback post-événement (évaluation a posteriori du scénario vécu)
- Prise en compte de notations externes (Google, etc.) dans le choix des activités

---

## 10. Licence

Cette spécification est publiée sous licence **Creative Commons Attribution – Partage dans les Mêmes Conditions 4.0 International (CC BY-SA 4.0)**.

Vous êtes libre de partager et d'adapter ce document, y compris à des fins commerciales, à condition de : (a) créditer les auteurs originaux, (b) indiquer si des modifications ont été apportées, et (c) diffuser toute œuvre dérivée sous la même licence.

Texte intégral de la licence : [https://creativecommons.org/licenses/by-sa/4.0/deed.fr](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)

Le code source d'IRIS est distribué séparément sous licence **AGPLv3**.

---

## 11. Journal des décisions majeures depuis la v5 (juin 2026)

| Date | Changement | Raison |
|---|---|---|
| Phase 4 | Passage de GM à somme centrée + tanh pour l'agrégation inter-activités | La GM pénalisait artificiellement les scénarios à plusieurs activités |
| Phase 5 | Distance recalculée en trajet complet aller-retour, sortie du groupe "par activité" | Modéliser le vrai coût de déplacement d'un scénario à plusieurs arrêts, pas juste une activité isolée |
| Phase 6 | Compensation $R_i$ : comparaison à la médiane de l'événement (pas à soi-même) + signe corrigé | Le calcul initial ne détectait jamais d'écart réel et inversait l'effet correcteur |
| Phase 6 | Vote : ajout du candidat "Aucun de ces scénarios", positionnable librement | Garde-fou anti-manipulation, sans bloquer le processus démocratique |
| Global | Renumérotation des phases 1–7 (Événement, Disponibilités, Activités, Scénarios, Pareto, Vote, Résultats) | Clarifier la séparation filtre/vote, initialement fusionnés dans la v5 |
