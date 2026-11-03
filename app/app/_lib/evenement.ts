// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export type Groupe = {
  id: string
  name: string
  description: string | null
  owner: boolean
}

/** Créneau proposé, dans la forme attendue par POST /api/events. */
export type Creneau = {
  date: string       // AAAA-MM-JJ
  label: string      // « Lun. 3 août »
  startTime: string  // HH:MM
  endTime: string    // HH:MM
}

export const HEURE_DEBUT_DEFAUT = '10:00'
export const HEURE_FIN_DEFAUT   = '18:00'

/**
 * Libellé lisible d'une date. Reprend exactement la mise en forme de la page
 * de création du web : midi est forcé pour éviter qu'un fuseau négatif ne
 * fasse basculer la date à la veille.
 */
export function formaterLibelleDate(date: string): string {
  const d = new Date(date + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return date
  return d
    .toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

export function aujourdhui(): string {
  return new Date().toISOString().split('T')[0]
}

/** Durée du créneau en minutes, comme la calcule la page du web. */
export function fenetreMinutes(debut: string, fin: string): number {
  const [hd, md] = debut.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return (hf * 60 + mf) - (hd * 60 + md)
}

/**
 * Liste mes groupes.
 *
 * GET /api/groups renvoie deux listes séparées — ceux que je possède et mes
 * adhésions actives — et c'est la page de création du web qui les assemble.
 * On reprend la même route plutôt que d'en ajouter une : une seule définition
 * de « mes groupes » côté serveur.
 */
export async function listerGroupes(): Promise<Groupe[]> {
  const reponse = await fetch('/api/groups')
  if (!reponse.ok) {
    throw new Error(
      reponse.status === 401
        ? 'Votre session a expiré. Reconnectez-vous.'
        : `Impossible de charger vos groupes (${reponse.status}).`
    )
  }
  const donnees: {
    owned?: { id: string; name: string; description: string | null }[]
    memberships?: { groups: { id: string; name: string; description: string | null } | null }[]
  } = await reponse.json()

  const groupes: Groupe[] = (donnees.owned ?? []).map(g => ({
    id: g.id, name: g.name, description: g.description, owner: true,
  }))

  // Le propriétaire figure aussi parmi les membres de ses propres groupes :
  // sans ce filtre, ils apparaîtraient deux fois.
  const vus = new Set(groupes.map(g => g.id))
  for (const adhesion of donnees.memberships ?? []) {
    const g = adhesion.groups
    if (!g || vus.has(g.id)) continue
    vus.add(g.id)
    groupes.push({ id: g.id, name: g.name, description: g.description, owner: false })
  }

  return groupes
}

/**
 * Crée un événement et renvoie son identifiant.
 *
 * La route n'exige que trois choses : un nom, au moins un groupe et au moins
 * une date. Tout le reste est facultatif et sera réglable depuis la page de
 * l'événement — on ne reproduit pas ici l'assistant complet du web.
 */
export async function creerEvenement(params: {
  nom: string
  groupeIds: string[]
  creneaux: Creneau[]
  description?: string
  lieu?: string
  modeLieu?: 'zone' | 'hub'
  emailsSupplementaires?: string[]
}): Promise<string> {
  const reponse = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:        params.nom.trim(),
      description: params.description?.trim() || null,
      groupIds:    params.groupeIds,
      location:    params.lieu?.trim() || null,
      locationMode: params.modeLieu ?? 'zone',
      extraEmails: params.emailsSupplementaires ?? [],
      openInvite:  false,
      proposedDates: params.creneaux.map(c => ({
        label:     c.label,
        date:      c.date,
        startTime: c.startTime,
        endTime:   c.endTime,
        window:    fenetreMinutes(c.startTime, c.endTime),
      })),
    }),
  })

  const donnees = await reponse.json().catch(() => ({}))
  if (!reponse.ok) {
    throw new Error(donnees.error ?? `Création impossible (${reponse.status}).`)
  }
  return donnees.id as string
}

/** Nombre maximal de dates proposées, comme sur le web. */
export const MAX_CRENEAUX = 5

/** Mode de localisation : zone de recherche ou point de rendez-vous fixe. */
export const MODES_LIEU = [
  {
    valeur: 'zone' as const,
    libelle: 'Zone de recherche',
    aide: 'Le moteur cherche des activités dans cette zone.',
    exemple: 'Ex : Paris centre, Lyon 2ème…',
  },
  {
    valeur: 'hub' as const,
    libelle: 'Lieu fixe',
    aide: 'Point de rendez-vous autour duquel les activités sont proposées.',
    exemple: 'Ex : Siège social, Domicile de Marie…',
  },
]

export type ModeLieu = 'zone' | 'hub'

/**
 * Validation d'adresse électronique volontairement identique à celle du web :
 * la seule présence d'un arobase. Un filtre plus strict rejetterait des
 * adresses valides, et la vérification réelle se fait de toute façon à
 * l'envoi du courriel.
 */
export function emailPlausible(valeur: string): boolean {
  return valeur.includes('@') && valeur.trim().length > 2
}

/** Crée un groupe et renvoie son identifiant. */
export async function creerGroupe(params: {
  nom: string
  description?: string
  emails?: string[]
}): Promise<string> {
  const reponse = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.nom.trim(),
      description: params.description?.trim() || null,
      emails: params.emails ?? [],
    }),
  })
  const donnees = await reponse.json().catch(() => ({}))
  if (!reponse.ok) {
    throw new Error(donnees.error ?? `Création du groupe impossible (${reponse.status}).`)
  }
  return donnees.id as string
}
