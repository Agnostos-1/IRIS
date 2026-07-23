# IRIS — État du projet (mise à jour du 23 juillet 2026)

## Contexte

Ce fichier est la source de vérité pour reprendre le développement d'IRIS, que ce soit
via Claude Code ou en session claude.ai classique. Il remplace les handoffs manuels
ponctuels — à tenir à jour à chaque session significative plutôt que de repartir sur un
nouveau `.md` de handoff.

## Déploiement — EN LIGNE ET FONCTIONNEL

- **URL live** : https://iris-website.com (domaine propre, acheté via Vercel le 22/07/2026)
- L'ancienne URL https://try-iris.vercel.app reste active et fonctionnelle en parallèle
  (les deux domaines sont configurés côté Vercel)
- **GitHub** : https://github.com/Agnostos-1/IRIS — public, lien dans le footer
- **Licence** : AGPLv3 — `LICENSE` à la racine, mention dans `package.json` et README
- **Stack** : Next.js 16.2.7 (App Router, Turbopack) · TypeScript · Tailwind · Supabase
  (Postgres + Auth) · Vercel · npm (pas pnpm)
- **Auth** : mot de passe ET lien magique, tous deux fonctionnels et laissés au choix de
  l'utilisateur (décision assumée, pas un pis-aller temporaire)

## Email — CHANTIER TERMINÉ

Le chantier email (Brevo → Resend) est bouclé de bout en bout :

- **Cause du blocage Brevo** : expéditeur Gmail générique non conforme aux exigences
  DKIM/DMARC de Google/Yahoo/Microsoft. Abandonné au profit de Resend.
- **Domaine vérifié sur Resend** : `iris-website.com` (auto-configuré via l'intégration
  Vercel de Resend — DNS poussé automatiquement, vérifié en moins d'une heure)
- **Sender email en production** : `noreply@iris-website.com` (Sender name: `IRIS`) —
  n'utilise plus l'adresse partagée `onboarding@resend.dev`, qui ne pouvait envoyer qu'à
  l'adresse du compte Resend lui-même (restriction découverte pendant le diagnostic)
- **Templates Supabase réécrits** (Magic Link, Confirm signup) : contenu plus étoffé et
  contextualisé en français, pour limiter le classement en spam (un lien nu était trop
  proche d'un pattern de bulk mail). Reste un point d'attention : premiers emails encore
  susceptibles d'atterrir en spam le temps que la réputation du domaine se construise —
  demander aux testeurs de signaler "non-spam" au premier email aide.
- **"Confirm email" activé** (Authentication → Sign In / Up, PAS dans le sous-menu
  Providers → Email comme on aurait pu s'y attendre — l'interface Supabase a déplacé ce
  réglage à un autre endroit que la documentation générale ne précise pas toujours)
- **Page de login (`app/auth/login/page.tsx`) mise à jour en conséquence** : l'ancienne
  hypothèse "email confirmé auto" après inscription par mot de passe ne tient plus. Un
  nouvel état `confirm-email` a été ajouté : après `signUp()`, on n'enchaîne plus sur une
  tentative de connexion automatique ; on affiche un écran "Confirmez votre email" (même
  esprit que l'écran "sent" du lien magique). Idem si un utilisateur existant tente de se
  connecter sans avoir confirmé (erreur Supabase `Email not confirmed` interceptée).
- **Callback (`app/auth/callback/route.ts`)** : gère bien à la fois signup et magic link
  via le flux PKCE (`code=`) — pas de distinction nécessaire, les deux redirigent
  correctement vers `next` après `exchangeCodeForSession`. Le flux de reset de mot de
  passe est indépendant (`redirectTo` vers `/auth/reset`, pas `/auth/callback`), et la
  page `app/auth/reset/page.tsx` attend bien l'événement `PASSWORD_RECOVERY` avant
  d'afficher le formulaire — pas de risque de connecter l'utilisateur sans lui laisser
  changer son mot de passe.
- **Logs de debug sécurisés** : les `console.log` du callback (notamment celui qui
  exposait le contenu de `exchangeCodeForSession`, donc les tokens de session) sont
  maintenant conditionnés via un helper `devLog` actif seulement si
  `NODE_ENV === 'development'` — silencieux sur Vercel (prod et preview), toujours
  disponible en local.

**Reste à faire sur l'email** : les emails applicatifs (invitation groupe/événement,
rappel J-2) ne sont toujours pas branchés — juste des entrées en base actuellement
(`extra_emails`, `group_members`). Prochain chantier logique maintenant que le SMTP
Resend + domaine sont opérationnels.

## URL Configuration Supabase (Authentication → URL Configuration)

- **Site URL** : `https://iris-website.com`
- **Redirect URLs** : `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`,
  `https://try-iris.vercel.app/**`, `https://iris-website.com/**` — donc le développement
  local fonctionne sans souci de redirection, en plus de la prod.

## Bugs remontés par les tests utilisateurs (session du 23/07/2026)

Regroupés par zone pour traitement, statut au moment de la rédaction :

**Groupe A — Profil / préférences (types personnalisés)** — non traité
- Le calcul du "type préféré" du groupe (médiane des préférences) gère mal les types
  d'activité personnalisés (ajoutés par les utilisateurs, hors liste prédéfinie).
- Les valeurs de sous-type reviennent à l'ancienne valeur après refresh de la page
  d'activité ; le tag "modifié" reste affiché à tort quand la préférence du sous-type
  diffère de celle du type parent.
- Le pop-up "créer comme sous-type" force parfois le nom du type parent (Sport) au lieu
  de laisser saisir le nom du sous-type correctement.

**Groupe B — Invitation / statut membre** — non traité
- Un membre invité par lien reste bloqué au statut "invité" au lieu de passer "actif" —
  conditions de transition à vérifier.

**Groupe C — Page événement** — non traité
- Bouton "Proposer" redondant à côté du texte "Vous pouvez déjà proposer des activités,
  sans attendre la clôture des disponibilités" — à retirer, ne garder que le texte.
- Besoin d'ajouter une adresse de départ alternative sur l'événement (cas où l'utilisateur
  est temporairement ailleurs que chez lui, ou part de chez quelqu'un d'autre) — actuellement
  seule l'adresse du profil (`home_lat`/`home_lng`) est utilisable pour le calcul de distance.
- Budget médian de l'événement parfois incohérent — possible souci de mise à jour, à
  creuser (pas encore diagnostiqué).

**Groupe D — Calcul et affichage du Rᵢ** — diagnostiqué, correction UI appliquée
- Pas un bug de calcul : le Rᵢ (`lib/iris/pareto-engine.ts`, `computeFairnessCoefficients`)
  compare l'utilité individuelle à la **médiane des utilités de tous les participants** de
  chaque événement passé — pas à la "Satisfaction du groupe" affichée sur la page résultats,
  qui est en fait la **moyenne géométrique pondérée** (`groupScore`, utilisée pour le choix
  du scénario gagnant, pas pour l'équité). Ces deux statistiques peuvent diverger nettement,
  ce qui créait une incohérence apparente (ex. 97% de satisfaction individuelle vs 86% de
  groupe, sans mouvement du Rᵢ).
- Correction appliquée : ajout d'une phrase explicative dans le bloc "Équité et historique"
  de `app/event/[id]/results/page.tsx`, précisant que le coefficient se base sur la médiane
  individuelle et non sur la moyenne géométrique affichée juste au-dessus.
- La piste d'un problème de timing (recalcul du Rᵢ "Mis à jour" avant l'écriture de
  l'historique) a été explicitement écartée après lecture du code — `persistWinningScenario`
  écrit bien `utility_history` avant que la route `results` ne recalcule le Rᵢ.

## Repères techniques utiles

- Moteur réel : `lib/iris/pareto-engine.ts` (scoring 5 facteurs + Rᵢ + filtre Pareto),
  `lib/iris/scenario-engine.ts` (génération combinatoire), `lib/iris/condorcet.ts` (vote).
  Bien distincts de l'ancien `lib/algorithm/*` (prototype v5, supprimé lors de la diffusion).
- Rᵢ : `Rᵢ = clamp(1 + moyenne(déficit) × 0.2, 0.5, 1.2)`, où
  `déficit = médiane_des_utilités_de_l'événement − utilité_de_la_personne` pour chaque
  événement passé, moyenné sur l'historique. Coefficient combiné groupe × global via
  `computeFairnessBreakdown` (détail par groupe + global, cf. route `results`).
- Style : pages fonctionnelles (dashboard, event, group...) en styles inline React ; pages
  informatives (Science, Roadmap, À propos) en Tailwind. Aucun emoji nulle part sur le
  site — convention stricte, sauf dans le contenu applicatif généré (ex. `TYPE_EMOJI` pour
  les types d'activité, qui est une décision produit distincte).
- Le fichier `AGENTS.md` à la racine contient actuellement un contenu suspect (instruction
  pointant vers un chemin `node_modules/next/dist/docs/` inexistant) — à nettoyer, ne pas
  suivre telle quelle si elle apparaît dans un contexte d'agent.

## Autres chantiers connus, non urgents

- **Responsive mobile** — pas du tout adapté aux petits écrans, gros chantier à part, pas
  commencé. Les testeurs restent sur ordinateur en attendant.
- **Feedback post-événement** (mise à jour différée du Rᵢ) — priorité fonctionnelle
  annoncée juste après le chantier email, avant les emails applicatifs si besoin.
- Fenêtres horaires personnalisées, événements récurrents, covoiturage, méthode de
  Schulze, fusion de groupes — reportés, détaillés dans `KNOWN_LIMITATIONS.md`.
- Question Engine (swipe UI) et délégation automatique — vision long terme.
- Régénération propre des types Supabase à terme, pour ne plus dépendre des
  `as unknown as` manuels posés en urgence lors de la diffusion.

## Préférences de travail (Agnostos)

- Ingénieur DOORS/requirements en reconversion vers le dev web assisté par IA.
- Préfère qu'on vérifie avant d'affirmer ; apprécie être repris quand une hypothèse est
  fausse plutôt qu'un acquiescement poli.
- Communique en français ; documentation et UI du projet également en français.
- Débute la transition vers Claude Code pour ce projet (depuis Claude Desktop, Pro) —
  ce fichier sert de pont de contexte entre les sessions claude.ai et Claude Code.
