// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export type Activite = {
  id: string
  name: string
  type: string
  type_parent: string | null
  address: string | null
  address_lat: number | null
  address_lng: number | null
  duration_minutes: number | null
  cost_per_person: number | null
  suggested_by: string
}

export type TypePrefereGroupe = {
  type: string
  avg: number
  count: number
}

export type DonneesActivites = {
  evenement: { id: string; name: string; phase: number; createdBy: string }
  activites: Activite[]
  typesPreferes: TypePrefereGroupe[]
  nbParticipants: number
  monId: string
  sousTypesConnus: string[]
}

/** Phase pendant laquelle les propositions sont ouvertes. */
export const PHASE_ACTIVITES = 3

/** Durées proposées, en minutes — évite de taper un nombre au clavier. */
export const DUREES = [
  { minutes: 60,  libelle: '1 h' },
  { minutes: 90,  libelle: '1 h 30' },
  { minutes: 120, libelle: '2 h' },
  { minutes: 180, libelle: '3 h' },
  { minutes: 240, libelle: '4 h' },
]

export function formaterDuree(minutes: number | null): string | null {
  if (minutes == null) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function formaterCout(euros: number | null): string | null {
  if (euros == null) return null
  return euros === 0 ? 'Gratuit' : `${euros} € / pers.`
}

export async function chargerActivites(evenementId: string): Promise<DonneesActivites> {
  const reponse = await fetch(`/api/events/${evenementId}/activities`)
  if (!reponse.ok) {
    throw new Error(
      reponse.status === 401 ? 'Votre session a expiré. Reconnectez-vous.'
      : reponse.status === 404 ? 'Cet événement est introuvable.'
      : `Le serveur a répondu ${reponse.status}.`
    )
  }
  const d = await reponse.json()
  return {
    evenement: {
      id: d.event.id,
      name: d.event.name,
      phase: d.event.phase,
      createdBy: d.event.created_by,
    },
    activites: d.activities ?? [],
    typesPreferes: d.groupTopTypes ?? [],
    nbParticipants: d.participantCount ?? 0,
    // Cette route-ci renvoie explicitement l'identifiant courant, contrairement
    // à celle du détail de l'événement : autant s'en servir.
    monId: d.currentUserId,
    sousTypesConnus: d.knownSubtypeNames ?? [],
  }
}

/**
 * Propose une activité.
 *
 * La route n'exige que le nom et le type ; tout le reste a des valeurs par
 * défaut côté serveur, notamment les dizaines de drapeaux de contrainte, qu'on
 * se garde bien de réécrire depuis ici.
 */
export async function proposerActivite(
  evenementId: string,
  activite: {
    nom: string
    type: string
    typeParent: string | null
    adresse: string | null
    lat: number | null
    lng: number | null
    dureeMinutes: number | null
    coutParPersonne: number | null
  },
): Promise<void> {
  const reponse = await fetch(`/api/events/${evenementId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: activite.nom.trim(),
      type: activite.type.trim(),
      type_parent: activite.typeParent,
      address: activite.adresse,
      address_lat: activite.lat,
      address_lng: activite.lng,
      duration_minutes: activite.dureeMinutes,
      cost_per_person: activite.coutParPersonne,
    }),
  })

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    throw new Error(donnees.error ?? `Proposition impossible (${reponse.status}).`)
  }
}

/** Supprime une activité. Le serveur n'autorise que son auteur, phase ouverte. */
export async function supprimerActivite(evenementId: string, activiteId: string): Promise<void> {
  const reponse = await fetch(`/api/events/${evenementId}/activities/${activiteId}`, {
    method: 'DELETE',
  })
  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    throw new Error(
      reponse.status === 403
        ? 'Vous ne pouvez retirer que vos propres propositions.'
        : donnees.error ?? `Suppression impossible (${reponse.status}).`
    )
  }
}
