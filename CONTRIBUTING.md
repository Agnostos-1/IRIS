# Contribuer à IRIS

Merci de l'intérêt porté à ce projet ! IRIS est un logiciel libre (AGPLv3) et toute contribution — code, documentation, retour d'usage — est bienvenue.

## Avant de commencer

Pour tout changement conséquent (nouvelle fonctionnalité, modification d'algorithme), ouvrez d'abord une *issue* pour en discuter avant de vous lancer dans le code — ça évite le travail en double et les divergences de conception.

## Signaler un bug

Ouvrez une issue avec :
- Le comportement observé et celui attendu
- Les étapes précises pour reproduire
- La phase de l'événement concernée le cas échéant (Disponibilités, Activités, Scénarios, Pareto, Vote, Résultats)

## Proposer un changement

1. Forkez le dépôt et créez une branche depuis `main` (`git checkout -b fix/description-courte`)
2. Faites vos modifications
3. Vérifiez que le projet compile et lance sans erreur (`npm run build`)
4. Committez avec un message clair décrivant le *quoi* et le *pourquoi*
5. Ouvrez une Pull Request vers `main`, en décrivant le changement et en liant l'issue associée si applicable

## Conventions de code

- TypeScript strict, pas de `any` sauf nécessité documentée
- Les calculs algorithmiques (scoring, filtrage, vote) vivent dans `lib/iris/` et doivent rester des fonctions pures autant que possible, testables indépendamment des routes API
- Les écritures en base passent par le client admin Supabase dans les Route Handlers (`app/api/`), jamais directement depuis un composant client
- Respect de la confidentialité : aucune route ne doit renvoyer la donnée individuelle d'un autre participant que le demandeur — seulement des agrégats

## Modifier l'algorithme

Si votre contribution touche au calcul d'utilité, au filtre de Pareto, au vote ou à la compensation historique, merci de :
- Documenter la formule modifiée dans `docs/IRIS_spec_v06.md`
- Expliquer le raisonnement dans la description de la Pull Request (pas seulement le "quoi", le "pourquoi")
- Si possible, fournir un jeu de données de test avant/après montrant l'effet du changement

## Licence de vos contributions

En proposant une Pull Request, vous acceptez que votre contribution soit distribuée sous la même licence que le projet (AGPLv3 pour le code, CC BY-SA 4.0 pour la documentation).

## Code de conduite

Ce projet suit un [Code de Conduite](CODE_OF_CONDUCT.md). En participant, vous acceptez de le respecter.
