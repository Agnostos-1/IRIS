// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/** Réglages d'un événement modifiables par son organisateur. */
export type ReglagesEvenement = {
  description: string | null
  deadline: string | null
  autoReminder: boolean
  revealAfterSubmit: boolean
  openInvite: boolean
  budgetGlobal: number | null
  budgetOverrunPct: number
}

/**
 * Enregistre les réglages d'un événement.
 *
 * ATTENTION — PATCH /api/events/[id] écrit systématiquement deadline,
 * auto_reminder et reveal_after_submit, que le corps les contienne ou non :
 * `deadline: deadline || null` transforme une absence en effacement. Envoyer
 * le seul champ modifié supprimerait donc l'échéance, et avec elle le rappel
 * automatique à J-2.
 *
 * Comme pour le profil, on renvoie l'ensemble des réglages à chaque fois.
 */
export async function enregistrerReglages(
  evenementId: string,
  reglages: ReglagesEvenement,
): Promise<void> {
  const reponse = await fetch(`/api/events/${evenementId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description:       reglages.description,
      deadline:          reglages.deadline,
      autoReminder:      reglages.autoReminder,
      revealAfterSubmit: reglages.revealAfterSubmit,
      openInvite:        reglages.openInvite,
      budgetGlobal:      reglages.budgetGlobal,
      budgetOverrunPct:  reglages.budgetOverrunPct,
    }),
  })

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    throw new Error(
      reponse.status === 401 ? 'Votre session a expiré. Reconnectez-vous.'
      : reponse.status === 403 ? "Seul l'organisateur peut modifier cet événement."
      : donnees.error ?? `Enregistrement impossible (${reponse.status}).`
    )
  }
}

/** Phase à partir de laquelle l'annulation est refusée par le serveur. */
export const PHASE_ANNULATION_BLOQUEE = 5

/**
 * Annule l'événement.
 *
 * Le serveur refuse au-delà de la phase 4 : une fois les scénarios calculés,
 * annuler permettrait à l'organisateur d'esquiver un résultat qui ne lui
 * convient pas.
 */
export async function annulerEvenement(evenementId: string): Promise<void> {
  const reponse = await fetch(`/api/events/${evenementId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel' }),
  })

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    throw new Error(donnees.error ?? `Annulation impossible (${reponse.status}).`)
  }
}

/** Convertit une échéance ISO en valeur acceptée par un champ de type date. */
export function dateVersChamp(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}
