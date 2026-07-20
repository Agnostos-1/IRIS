# Changelog

Toutes les modifications notables du projet IRIS sont documentées ici.

## [Non publié] — Chantiers post-V&V initiale

### Ajouté

**Budget organisateur ("l'organisateur finance tout")**
- Mode de financement global avec seuil de dépassement configurable et visibilité optionnelle du montant aux participants
- Filtre dur au stade Pareto (exclusion des scénarios dépassant le budget × seuil)
- Redistribution du poids budgétaire vers les autres facteurs de score plutôt que neutralisation simple (évite un avantage artificiel pour qui pondère personnellement le budget)
- Édition du budget/seuil/description directement depuis la page événement après création

**Sélection de membres à l'invitation**
- Cases à cocher par membre lors de la sélection d'un groupe à la création d'un événement, cochées par défaut
- Colonne `events.invited_member_ids` (`NULL` = tout le groupe, tableau = liste explicite)
- Exclusion respectée dans toutes les routes de dérivation de participants (Disponibilités, Activités, Scénarios, Pareto, Vote)
- Un exclu ne voit plus l'événement nulle part (Dashboard, page Groupe)

**Gestion des invités hors groupe ("extras")**
- Invitation par email directement depuis la page événement (si "invitation ouverte" activée)
- Reconnaissance des invités par lien d'événement comme participants individuels de l'événement, jamais comme membres du groupe sous-jacent
- Proposition de rattachement à un groupe existant, nouveau groupe, ou aucun changement — au choix de l'organisateur, à la clôture des Disponibilités, uniquement pour ceux ayant réellement répondu

**Duplication d'événement**
- Préremplissage du formulaire de création à partir d'un événement existant (nom, description, groupes, budget, activités)
- Accessible à tout participant de l'événement source, pas seulement l'organisateur d'origine (le budget masqué reste protégé)
- Les groupes de la source restent de vrais groupes sélectionnables (avec exclusion individuelle), y compris ceux auxquels le dupliqueur n'appartient pas lui-même

**Suppression de compte**
- "Supprimer mon compte" réinitialise le profil (nom, préférences, contraintes) mais conserve le Rᵢ et l'historique de compensation, rattachés au même compte — empêche un contournement du Rᵢ par un aller-retour suppression/réinscription
- Formulaire de transfert de propriété (groupes possédés, événements organisés non conclus) avant réinitialisation

**Transparence Rᵢ multi-groupes**
- Calcul et mise à jour du Rᵢ correctement gérés pour un événement lié à plusieurs groupes, ou pour un participant membre de plusieurs groupes invités au même événement
- Page Résultats : détail explicite par groupe + global (avant/après), plutôt qu'un coefficient combiné opaque
- Page Pareto : même détail par groupe affiché une fois en haut de page

**Visibilité des conflits de contraintes (organisateur)**
- Vue dédiée à l'organisateur sur la page Activités : nombre de participants (anonymisé) dont une contrainte dure exclut chaque activité proposée
- Calcul par activité, tenant compte des dérogations individuelles (`constraint_overrides`) posées pour cette activité précise
- Restreint à l'organisateur volontairement (un affichage temps réel visible par tous créerait une incitation à ajuster ses déclarations pour éviter un conflit visible)
- Étiquettes en français (remplace les clés techniques brutes précédemment affichées)

**Autres**
- Bandeau incitatif à proposer des activités dès la phase Disponibilités
- Avertissement organisateur si des participants n'ont pas complété leur profil, à la clôture de la phase Activités
- Historique du Dashboard et des pages Groupe réorganisé en trois catégories : en développement / à venir / historique (repliable), avec tag "non disponible" pour qui n'était pas sur la date retenue
- Bouton de sauvegarde explicite des préférences d'activité (en plus de la synchronisation automatique)
- Marge minimale de 48h avant l'événement pour la deadline de vote, harmonisation visuelle avec la deadline des disponibilités

### Corrigé
- Disponibilité conditionnelle (`'cond'`) exclue par erreur de la génération de scénarios (mauvaise valeur de statut testée)
- Participants invités par lien d'événement invisibles pour le calcul de scénarios/Pareto/vote (uniquement les membres de groupe étaient considérés)
- Filtrage des événements par groupe reposant sur le champ singulier `group_id` plutôt que le tableau `group_ids` (Dashboard, page Groupe)
- Vitesses de trajet voiture/transport en commun ajustées à la hausse (valeurs plus réalistes)
- Contraste texte insuffisant sur plusieurs champs de saisie (fond blanc explicite ajouté)
- Sous-types d'activité apparaissant à tort dans le menu des types racines

### Reporté (voir KNOWN_LIMITATIONS.md)
- Fenêtres horaires personnalisées et leur impact sur la génération de scénarios
- Mécanisme de feedback post-événement et mise à jour différée du Rᵢ
