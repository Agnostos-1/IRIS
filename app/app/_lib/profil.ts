// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Profil tel que GET /api/profile le renvoie et que PATCH /api/profile
 * l'attend. Les deux listes de champs sont identiques, ce qui n'est pas un
 * hasard : voir enregistrerProfil ci-dessous.
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

export const LIBELLES_CRITERES: Record<string, string> = {
  activity: "Type d'activité",
  schedule: 'Horaires',
  distance: 'Distance',
  budget:   'Budget',
  social:   'Ambiance sociale',
}

/** Ordre d'affichage stable, pour que les curseurs ne sautent pas en cours d'édition. */
export const ORDRE_CRITERES = ['activity', 'schedule', 'distance', 'budget', 'social']

export const POIDS_PAR_DEFAUT: Record<string, number> = {
  activity: 35, schedule: 25, distance: 20, budget: 10, social: 10,
}

/**
 * Convertit des poids bruts en pourcentages dont la somme vaut 100.
 *
 * Le moteur ne consomme que des rapports entre critères, mais la page Profil
 * du web enregistre des valeurs déjà normalisées : on fait de même, pour que
 * les deux interfaces écrivent la même chose en base.
 */
export function normaliserPoids(poids: Record<string, number>): Record<string, number> {
  const somme = Object.values(poids).reduce((s, v) => s + v, 0)
  if (somme <= 0) return { ...POIDS_PAR_DEFAUT }
  return Object.fromEntries(
    Object.entries(poids).map(([cle, valeur]) => [cle, Math.round((valeur / somme) * 100)])
  )
}

/**
 * Enregistre le profil.
 *
 * ATTENTION — PATCH /api/profile n'est PAS une mise à jour partielle : la route
 * réécrit tous les champs à chaque appel. N'envoyer que le champ modifié
 * remettrait display_name à null, viderait activity_prefs et effacerait
 * home_lat / home_lng, donc l'adresse du domicile et toutes les préférences
 * d'activité.
 *
 * On renvoie donc toujours le profil complet, modification comprise. C'est ce
 * que fait déjà la page Profil du web. Tant que la route n'accepte pas de mise
 * à jour partielle, toute écriture doit passer par ici.
 */
export async function enregistrerProfil(
  profilActuel: ProfilComplet,
  modifications: Partial<ProfilComplet>,
): Promise<void> {
  const complet = { ...profilActuel, ...modifications }

  const reponse = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name:     complet.display_name,
      zone:             complet.zone,
      home_lat:         complet.home_lat,
      home_lng:         complet.home_lng,
      transport:        complet.transport,
      distance_max:     complet.distance_max,
      budget:           complet.budget,
      social_level:     complet.social_level,
      weights:          complet.weights,
      hard_constraints: complet.hard_constraints,
      activity_prefs:   complet.activity_prefs,
      onboarding_done:  complet.onboarding_done ?? true,
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
