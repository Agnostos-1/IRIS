# Limites connues

Ce document liste les limites actuelles d'IRIS, distinguant ce qui bloque une
expérience complète de ce qui relève d'une amélioration future planifiée.

## À traiter en priorité avant/juste après diffusion

### Envoi d'email non fonctionnel
Aucun email réel n'est envoyé actuellement (intégration Resend/Brevo non
branchée). Conséquences concrètes :
- L'authentification par lien magique ne fonctionne pas ; le mot de passe est
  utilisé comme solution de repli
- Les invitations par email (page événement, page groupe) ajoutent la personne
  aux listes internes mais n'envoient aucune notification — elle ne découvre
  l'invitation qu'en se connectant elle-même
- Le rappel automatique "J-2 avant la deadline" (réglage existant dans l'UI)
  ne déclenche rien

## Limitations architecturales reconnues (fonctionnement correct, non optimal)

### Fenêtres horaires personnalisées
Le moteur de génération de scénarios calcule une seule fenêtre horaire par
date, par intersection stricte (la plus restrictive commune à tous les
participants actifs). Si une seule personne n'est disponible qu'à partir d'une
heure tardive, la fenêtre entière se retrouve contrainte pour tout le groupe —
plutôt que d'explorer aussi une fenêtre plus large où cette personne serait
pénalisée sur son propre score d'horaire mais le reste du groupe profiterait
d'une journée complète. Les scénarios produits restent valides et correctement
scorés ; l'ensemble de candidats explorés n'est simplement pas exhaustif.

### Vote Condorcet — départage des égalités
En cas d'absence de vainqueur Condorcet net (cycle), le départage se fait
directement via Borda (dérivé des bulletins réels), sans passer par le score
de groupe algorithmique au préalable. Décision délibérée : privilégier le
jugement démocratique plutôt que reconfirmer l'avis de l'algorithme dans les
cas où les préférences humaines divergent le plus. La méthode de Schulze n'est
pas implémentée.

### Vote — pas de pondération par probabilité de présence
Chaque bulletin compte pour une voix pleine, indépendamment de la probabilité
de présence du votant (disponibilité conditionnelle). Décision délibérée :
distinguer "avoir voix au chapitre" de "certitude de présence physique".

## Fonctionnalités volontairement reportées (roadmap)

- **Feedback post-événement** : confrontation du scénario retenu au vécu réel,
  et mise à jour différée du Rᵢ (appliquée après la date de l'événement plutôt
  qu'immédiatement à la conclusion du vote), avec validation croisée par les
  participants pour la disponibilité conditionnelle. Priorité haute, dès que
  l'envoi d'email est opérationnel.
- **Événements récurrents** : une série avec rythme défini et génération
  automatique des occurrences (distinct de la duplication ponctuelle, déjà
  implémentée)
- **Covoiturage** : pour fluidifier le calcul de temps de trajet, actuellement
  basé sur le mode de transport le plus lent du groupe pour toute la timeline
- **Fusion de deux groupes existants** en un seul (au-delà du rattachement
  d'un participant à un groupe, déjà implémenté)

## Éléments de mise en ligne non encore traités
- Mise à jour des pages Accueil / Méthode / Science
- Dépôt GitHub, connexion Vercel, récupération du domaine
- Licences sur le code et les images utilisées
