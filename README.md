# IRIS — Inclusive Rational Interaction System

**Planification collective d'activités, équitable par construction.**

IRIS remplace la négociation informelle (messagerie, sondages, tableurs) par un pipeline algorithmique en sept phases : collecte des disponibilités et contraintes, génération automatique des scénarios faisables, évaluation de leur équité via un score de bien-être collectif, filtrage de Pareto, puis décision démocratique par scrutin de Condorcet.

> Version actuelle : **v0.6** — démo technique fonctionnelle. Voir [`docs/CHANGELOG.md`](CHANGELOG.md) pour l'historique, et [`docs/`](docs/) pour la spécification complète.

## Fonctionnalités

- Profils de préférences individuels (types d'activités, contraintes dures, poids de décision)
- Collecte de disponibilités avec créneaux et budgets personnels, respectant la confidentialité de chacun
- Génération automatique de scénarios (combinaisons d'activités faisables, horaires, trajets)
- Score d'utilité individuelle à 5 dimensions, agrégé en score collectif équitable (moyenne géométrique pondérée)
- Filtrage de Pareto avec seuil adaptatif
- Vote de Condorcet avec repli Borda
- Compensation historique automatique entre événements successifs d'un même groupe

## Stack technique

- **Framework** : Next.js (App Router), TypeScript
- **Base de données** : Supabase (PostgreSQL, Auth, Row Level Security)
- **Style** : Tailwind CSS

## Démarrage rapide

### Prérequis

- Node.js ≥ 18
- Un projet Supabase (gratuit sur [supabase.com](https://supabase.com))

### Installation

```bash
git clone https://github.com/<votre-org>/iris.git
cd iris
npm install
cp .env.example .env.local
```

Renseignez `.env.local` avec les identifiants de votre projet Supabase (voir [`.env.example`](.env.example)).

### Base de données

Appliquez les migrations SQL fournies dans `supabase/migrations/` via l'éditeur SQL de votre projet Supabase, dans l'ordre chronologique.

### Lancement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

## Documentation

- [`docs/IRIS_spec_v06.md`](docs/IRIS_spec_v06.md) — spécification technique complète (algorithmes, formules)
- [`docs/IRIS_User_Case_v06.docx`](docs/IRIS_User_Case_v06.docx) — cas d'usage narratif complet

## Contribuer

Les contributions sont bienvenues — voir [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licence

L'AGPLv3 exige que toute réutilisation ou hébergement public de ce code, y compris sous forme de service web, rende aussi disponibles les modifications et le code source correspondants à ses utilisateurs.

- **Code source** : [GNU Affero General Public License v3.0](LICENSE) (AGPLv3)
- **Documentation** (`docs/`) : [Creative Commons BY-SA 4.0](docs/LICENSE)

Voir [`SECURITY.md`](SECURITY.md) pour signaler une vulnérabilité.
