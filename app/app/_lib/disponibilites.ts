// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/** Les trois statuts stockés en base, tels que les écrit la page web. */
export type Statut = 'ok' | 'cond' | 'no'

export const STATUTS: { valeur: Statut; libelle: string; couleur: string; fond: string }[] = [
  { valeur: 'ok',   libelle: 'Disponible',   couleur: '#34D399', fond: 'rgba(52, 211, 153, 0.16)' },
  { valeur: 'cond', libelle: 'Peut-être',    couleur: '#FBBF24', fond: 'rgba(251, 191, 36, 0.16)' },
  { valeur: 'no',   libelle: 'Indisponible', couleur: '#FB7185', fond: 'rgba(251, 113, 133, 0.16)' },
]

/**
 * Probabilité de présence par défaut pour un « peut-être », et bornes du
 * curseur. Mêmes valeurs que le web : elle pondère le poids de la personne
 * dans le score de la date, une présence à 50 % comptant pour 0,5.
 */
export const PROBA_DEFAUT = 70
export const PROBA_MIN = 10
export const PROBA_MAX = 90
export const PROBA_PAS = 10

export function libelleStatut(statut: Statut): string {
  return STATUTS.find(s => s.valeur === statut)?.libelle ?? statut
}

export type Creneau = { start: string; end: string }

export type MesDisponibilites = {
  statuses: Record<string, Statut>
  probas: Record<string, number>
  slots: Record<string, Creneau>
  budget: number | null
  startLat: number | null
  startLng: number | null
  startAddress: string | null
  submitted: boolean
}

/**
 * Enregistre mes disponibilités.
 *
 * `submitted` distingue un brouillon d'une réponse ferme : seules les réponses
 * fermes comptent pour le quorum et pour la relance automatique. Le serveur
 * promeut au passage une adhésion « invité » en « actif », répondre valant
 * engagement dans l'événement.
 */
export async function enregistrerDisponibilites(
  evenementId: string,
  dispos: MesDisponibilites,
): Promise<void> {
  const reponse = await fetch(`/api/events/${evenementId}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      statuses: dispos.statuses,
      probas: dispos.probas,
      slots: dispos.slots,
      budget: dispos.budget,
      startLat: dispos.startLat,
      startLng: dispos.startLng,
      startAddress: dispos.startAddress,
      submitted: dispos.submitted,
    }),
  })

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    throw new Error(
      reponse.status === 401
        ? 'Votre session a expiré. Reconnectez-vous.'
        : donnees.error ?? `Enregistrement impossible (${reponse.status}).`
    )
  }
}

/**
 * Score d'une date, reproduit à l'identique du calcul de la page web : un
 * point par personne disponible, la probabilité pour un conditionnel, rien
 * pour une indisponibilité. Sert uniquement à l'affichage — le moteur a sa
 * propre évaluation.
 */
export function scoreDate(
  date: string,
  participants: { statuses: Record<string, string>; probas: Record<string, number> }[],
): { score: number; ok: number; cond: number; no: number } {
  let score = 0, ok = 0, cond = 0, no = 0
  for (const p of participants) {
    const statut = p.statuses[date] ?? 'no'
    if (statut === 'ok')   { score += 1; ok++ }
    else if (statut === 'cond') { score += (p.probas[date] ?? PROBA_DEFAUT) / 100; cond++ }
    else { no++ }
  }
  return { score, ok, cond, no }
}
