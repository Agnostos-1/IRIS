// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Profil tel que GET /api/profile le renvoie et que PATCH /api/profile
 * l'attend. Les deux listes de champs sont identiques, ce qui n'est pas un
 * hasard : voir enregistrerProfil plus bas.
 */
export type ProfilComplet = {
  display_name: string | null
  zone: string | null
  home_lat: number | null
  home_lng: number | null
  transport: string | null
  distance_max: number | null
  budget: number | null
  social_level: number | null
  weights: Record<string, number> | null
  hard_constraints: Record<string, boolean> | null
  activity_prefs: Record<string, number> | null
  onboarding_done: boolean | null
  fairness?: { riGlobal: number; hasHistory: boolean }
}

// ─── Critères de pondération ─────────────────────────────────────────────────

export const LIBELLES_CRITERES: Record<string, string> = {
  activity: "Type d'activité",
  schedule: 'Horaires',
  distance: 'Distance',
  budget:   'Budget',
  social:   'Ambiance sociale',
}

/** Ordre stable, pour que les curseurs ne se réordonnent pas en cours d'édition. */
export const ORDRE_CRITERES = ['activity', 'schedule', 'distance', 'budget', 'social']

export const POIDS_PAR_DEFAUT: Record<string, number> = {
  activity: 35, schedule: 25, distance: 20, budget: 10, social: 10,
}

/**
 * Ramène des poids quelconques à une somme de 100, sans arrondir.
 * Les valeurs en base peuvent être d'anciennes échelles ; on normalise au
 * chargement pour que les curseurs portent directement le pourcentage.
 */
export function normaliserPoids(poids: Record<string, number>): Record<string, number> {
  const valeurs = ORDRE_CRITERES.map(c => poids[c] ?? 0)
  const somme = valeurs.reduce((s, v) => s + v, 0)
  if (somme <= 0) return { ...POIDS_PAR_DEFAUT }
  return Object.fromEntries(
    ORDRE_CRITERES.map((c, i) => [c, (valeurs[i] / somme) * 100])
  )
}

/**
 * Déplace un critère à la valeur voulue et répartit le reste sur les autres,
 * proportionnellement à ce qu'ils valaient. La somme reste à 100, donc chaque
 * curseur se replace tout seul à sa nouvelle part.
 */
export function ajusterPoids(
  poids: Record<string, number>,
  cle: string,
  valeur: number,
): Record<string, number> {
  const borne  = Math.min(Math.max(valeur, 0), 100)
  const autres = ORDRE_CRITERES.filter(c => c !== cle)
  const sommeAutres = autres.reduce((s, c) => s + (poids[c] ?? 0), 0)
  const restant = 100 - borne

  const resultat: Record<string, number> = { [cle]: borne }
  if (sommeAutres <= 0) {
    // Les autres étaient tous à zéro : aucune proportion à préserver.
    autres.forEach(c => { resultat[c] = restant / autres.length })
  } else {
    autres.forEach(c => { resultat[c] = ((poids[c] ?? 0) / sommeAutres) * restant })
  }
  return resultat
}

/**
 * Arrondit à l'entier en garantissant une somme de 100 : l'écart d'arrondi,
 * au plus quelques unités, est reporté sur le critère le plus élevé, où il se
 * voit le moins.
 */
export function arrondirPoids(poids: Record<string, number>): Record<string, number> {
  const arrondis: Record<string, number> = Object.fromEntries(
    ORDRE_CRITERES.map(c => [c, Math.round(poids[c] ?? 0)])
  )
  const ecart = 100 - Object.values(arrondis).reduce((s, v) => s + v, 0)
  if (ecart !== 0) {
    const plusGrand = ORDRE_CRITERES.reduce((a, b) => (arrondis[a] >= arrondis[b] ? a : b))
    arrondis[plusGrand] += ecart
  }
  return arrondis
}

// ─── Autres réglages ─────────────────────────────────────────────────────────

// Mêmes valeurs que la page Profil du web. Les libellés sont débarrassés de
// leurs emoji : la convention du projet les proscrit dans l'interface.
export const TRANSPORTS = [
  { valeur: 'foot',    libelle: 'À pied',      detail: '~5 km/h' },
  { valeur: 'transit', libelle: 'Transports',  detail: '~20 km/h' },
  { valeur: 'car',     libelle: 'Voiture',     detail: '~30 km/h' },
]

export const NIVEAUX_SOCIAUX = [
  { valeur: 1, libelle: 'Calme' },
  { valeur: 2, libelle: 'Cosy' },
  { valeur: 3, libelle: 'Équilibré' },
  { valeur: 4, libelle: 'Vivant' },
  { valeur: 5, libelle: 'Festif' },
]

export const CONTRAINTES: { cle: string; libelle: string; categorie: string }[] = [
  { cle: 'PMR',          libelle: 'PMR',                        categorie: 'Mobilité' },
  { cle: 'stair',        libelle: "Pas d'escaliers",            categorie: 'Mobilité' },
  { cle: 'cardio',       libelle: 'Condition cardio',           categorie: 'Mobilité' },
  { cle: 'vertigo',      libelle: 'Vertige',                    categorie: 'Mobilité' },
  { cle: 'aquatic',      libelle: 'Non-nageur',                 categorie: 'Mobilité' },
  { cle: 'nuts',         libelle: 'Allergie noix',              categorie: 'Alimentaire' },
  { cle: 'diet',         libelle: 'Régime médical',             categorie: 'Alimentaire' },
  { cle: 'vegan',        libelle: 'Vegan',                      categorie: 'Alimentaire' },
  { cle: 'gluten',       libelle: 'Sans gluten',                categorie: 'Alimentaire' },
  { cle: 'seafood',      libelle: 'Allergie fruits de mer',     categorie: 'Alimentaire' },
  { cle: 'halal_kosher', libelle: 'Viande confessionnelle',     categorie: 'Alimentaire' },
  { cle: 'alcohol',      libelle: 'Sans alcool',                categorie: 'Alimentaire' },
  { cle: 'pregnancy',    libelle: 'Grossesse',                  categorie: 'Alimentaire' },
  { cle: 'noise',        libelle: 'Hyperacousie',               categorie: 'Environnement' },
  { cle: 'epilepsy',     libelle: 'Photosensibilité',           categorie: 'Environnement' },
  { cle: 'smoke',        libelle: 'Zone non-fumeur',            categorie: 'Environnement' },
  { cle: 'allergy_pets', libelle: 'Allergie animaux',           categorie: 'Environnement' },
  { cle: 'kids',         libelle: 'Enfants',                    categorie: 'Accompagnement' },
  { cle: 'pets',         libelle: "Animal d'assistance",        categorie: 'Accompagnement' },
]

export const CATEGORIES_CONTRAINTES = ['Mobilité', 'Alimentaire', 'Environnement', 'Accompagnement']

// ─── Enregistrement ──────────────────────────────────────────────────────────

/**
 * Enregistre le profil.
 *
 * ATTENTION — PATCH /api/profile n'est PAS une mise à jour partielle : la route
 * réécrit tous les champs à chaque appel. N'envoyer que le champ modifié
 * remettrait display_name à null, viderait activity_prefs et effacerait
 * home_lat / home_lng, donc l'adresse du domicile et toutes les préférences
 * d'activité.
 *
 * On envoie donc toujours le profil complet. C'est ce que fait déjà la page
 * Profil du web. Tant que la route n'accepte pas de mise à jour partielle,
 * toute écriture doit passer par ici.
 */
export async function enregistrerProfil(profil: ProfilComplet): Promise<void> {
  const reponse = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name:     profil.display_name,
      zone:             profil.zone,
      home_lat:         profil.home_lat,
      home_lng:         profil.home_lng,
      transport:        profil.transport,
      distance_max:     profil.distance_max,
      budget:           profil.budget,
      social_level:     profil.social_level,
      weights:          profil.weights,
      hard_constraints: profil.hard_constraints,
      activity_prefs:   profil.activity_prefs,
      onboarding_done:  profil.onboarding_done ?? true,
    }),
  })

  if (!reponse.ok) {
    throw new Error(
      reponse.status === 401
        ? 'Votre session a expiré. Reconnectez-vous.'
        : `Enregistrement impossible (le serveur a répondu ${reponse.status}).`
    )
  }
}

// ─── Types d'activité ────────────────────────────────────────────────────────

/**
 * Mêmes clés que la page Profil du web — ce sont elles qui sont stockées dans
 * activity_prefs et lues par le moteur. Les libellés sont repris tels quels,
 * sans leurs emoji.
 */
export const TYPES_ACTIVITE_PAR_DEFAUT: { cle: string; libelle: string }[] = [
  { cle: 'Escape Game', libelle: 'Escape Game' },
  { cle: 'Musée',       libelle: 'Musée / Culture' },
  { cle: 'Restaurant',  libelle: 'Restaurant' },
  { cle: 'Sport',       libelle: 'Sport / Plein air' },
  { cle: 'Détente',     libelle: 'Détente / Bien-être' },
  { cle: 'Spectacle',   libelle: 'Spectacle / Concert' },
  { cle: 'Jeux',        libelle: 'Jeux / Bowling' },
  { cle: 'Cinéma',      libelle: 'Cinéma' },
  { cle: 'Karaoké',     libelle: 'Karaoké' },
  { cle: 'Gastronomie', libelle: 'Gastronomie / Dégustation' },
  { cle: 'Randonnée',   libelle: 'Randonnée / Nature' },
  { cle: 'Visite',      libelle: 'Visite guidée / Tourisme' },
  { cle: 'Atelier',     libelle: 'Atelier créatif' },
  { cle: 'Pique-nique', libelle: 'Pique-nique / Plein air' },
  { cle: 'Soirée',      libelle: 'Soirée / Bar' },
  { cle: 'Shopping',    libelle: 'Shopping' },
]

/** Valeur neutre appliquée à un type jamais renseigné, comme sur le web. */
export const PREFERENCE_NEUTRE = 50

/**
 * Types à afficher : les seize types racine, suivis de ceux que la personne a
 * déjà notés et qui n'en font pas partie (sous-types créés dans un événement).
 */
export function listerTypesActivite(
  prefs: Record<string, number> | null,
): { cle: string; libelle: string; personnalise: boolean }[] {
  const racines = TYPES_ACTIVITE_PAR_DEFAUT.map(t => ({ ...t, personnalise: false }))
  const supplementaires = Object.keys(prefs ?? {})
    .filter(cle => !TYPES_ACTIVITE_PAR_DEFAUT.some(t => t.cle === cle))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map(cle => ({ cle, libelle: cle, personnalise: true }))
  return [...racines, ...supplementaires]
}

// ─── Géocodage ───────────────────────────────────────────────────────────────

export type AdresseTrouvee = { libelle: string; lat: number; lng: number }

/**
 * Recherche d'adresse via Nominatim, le même service que le composant
 * d'autocomplétion du web, pour que les deux interfaces résolvent une adresse
 * de la même manière.
 */
export async function rechercherAdresse(requete: string): Promise<AdresseTrouvee[]> {
  if (requete.trim().length < 3) return []
  const reponse = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(requete)}`,
    { headers: { 'Accept-Language': 'fr' } },
  )
  if (!reponse.ok) throw new Error('Recherche indisponible')
  const resultats: { display_name: string; lat: string; lon: string }[] = await reponse.json()
  return resultats.map(r => ({
    libelle: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}
