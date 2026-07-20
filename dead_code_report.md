# Rapport de dead code / reliquats potentiels

> Analyse statique basée sur les imports, les exports nommés, les dépendances de package.json et la présence de fichiers de type brouillon ou doublon. Aucun fichier n'a été supprimé ni modifié.

## 1. Fichiers apparemment sans référence entrante

- [app/home-page.tsx](app/home-page.tsx) — version alternative de la landing page, non importée par aucun autre fichier du dépôt et très proche de [app/page.tsx](app/page.tsx).
- [app/New page.tsx](app/New%20page.tsx) — nom inhabituel avec espace et pas de convention de route Next standard ; il semble être un fichier de test, de brouillon ou de copie laissée par erreur.
- [app/science/ScientificMap.tsx](app/science/ScientificMap.tsx) — implémentation alternative d'une vue scientifique non importée ailleurs ; elle semble être une version de secours ou une expérience non branchée.
- [app/science/ScientificData.ts](app/science/ScientificData.ts) — module de données statiques de la page science non référencé par les pages actives du dépôt ; il semble être un reliquat de contenu de démonstration.
- [app/science/app/components/figma/ImageWithFallback.tsx](app/science/app/components/figma/ImageWithFallback.tsx) — composant de fallback image sans importation dans le reste du projet ; à vérifier s'il appartenait à une sous-app non branchée.
- [app/science/app/components/ui](app/science/app/components/ui) — l'ensemble des fichiers de ce dossier semble être un lot de composants UI de type boilerplate / shadcn non utilisés par les pages actives ; à vérifier s'ils constituent des restes d'une maquette scientifique abandonnée.

## 2. Exports nommés jamais importés ailleurs

- [app/science/ScientificMap.tsx](app/science/ScientificMap.tsx) — export nommé `ScienceClientView` ; il n'apparaît dans aucune importation externe.
- [app/science/ScientificData.ts](app/science/ScientificData.ts) — exports nommés `DISCIPLINES`, `CONNECTIONS` et `IRIS_CONNECTIONS` ; ils ne semblent jamais importés par les autres modules.
- [app/science/app/components/figma/ImageWithFallback.tsx](app/science/app/components/figma/ImageWithFallback.tsx) — export nommé `ImageWithFallback` ; aucun autre fichier ne l'importe.
- [app/science/app/components/ui/chart.tsx](app/science/app/components/ui/chart.tsx) — export nommé `ChartConfig` ; type apparemment non utilisé dans le reste du dépôt.
- [app/science/app/components/ui/use-mobile.ts](app/science/app/components/ui/use-mobile.ts) — export nommé `useIsMobile` ; aucune importation n'a été trouvée.
- [app/science/app/components/ui/utils.ts](app/science/app/components/ui/utils.ts) — export nommé `cn` ; il ne semble pas utilisé par les composants actifs du dépôt.
- [lib/algorithm/utility.ts](lib/algorithm/utility.ts) — exports nommés `hardBlockReason`, `utilitityDimensions` et `utilityActivity` ; aucune page ou route ne les importe apparemment.
- [lib/iris/constants.ts](lib/iris/constants.ts) — exports nommés `DIM_LABELS`, `ZONE_LBL` et `TRANSP_LBL` ; ils ne semblent pas être utilisés par les modules actifs.
- [lib/iris/engine.ts](lib/iris/engine.ts) — l'ensemble des exports de cette vieille implémentation `lib/iris` n'apparaît pas dans les imports du dépôt actuel ; à vérifier s'ils sont des restes d'une version précédente du moteur.
- [lib/iris/types.ts](lib/iris/types.ts) — exports nommés `TransportMode`, `HardConstraints`, `UserWeights` et `AvailStatus` ; ils ne semblent pas être importés ailleurs.
- [lib/iris/demo-data.ts](lib/iris/demo-data.ts) — exports nommés `DEMO_USERS`, `DEMO_ACTIVITIES`, `DEMO_DATES`, `DEMO_AVAIL`, `DEMO_COND_PROBA` et `DEMO_HIST` ; aucun autre module ne les importe apparemment.

## 3. Dépendances de package.json apparemment non utilisées dans le code

- [package.json](package.json) — `@auth/supabase-adapter` : aucune importation de ce package n'a été trouvée dans le code source du dépôt ; il semble être une dépendance résiduelle.

## 4. Fichiers de brouillon, doublons ou versions alternatives suspects

- [app/home-page.tsx](app/home-page.tsx) — doublon probable de [app/page.tsx](app/page.tsx) pour la page d'accueil.
- [app/New page.tsx](app/New%20page.tsx) — fichier de type brouillon ou copie accidentelle, probablement non utilisé.
- [app/science/ScientificMap.tsx](app/science/ScientificMap.tsx) — version alternative de [app/science/ScienceClientView.tsx](app/science/ScienceClientView.tsx) ; elle semble être un reliquat de développement.
- [app/science/ScientificData.ts](app/science/ScientificData.ts) — jeu de données statiques de démonstration probablement associé à une ancienne version de la page science.
- [app/science/app/components/ui](app/science/app/components/ui) — ensemble de composants générés ou de scaffolding UI qui ressemble à une maquette de science non branchée sur la page principale.
