// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Libellés des phases d'un événement.
 *
 * Mêmes intitulés que PHASE_LABELS du tableau de bord web — un participant ne
 * doit pas découvrir un vocabulaire différent selon l'écran. Seules les
 * couleurs changent : celles du web sont prévues pour un fond clair.
 *
 * Les fonds sont exprimés en rgba plutôt qu'en teintes opaques, pour rester
 * lisibles sur le thème sombre comme sur le thème clair sans les dédoubler.
 */
export const PHASES: Record<number, { label: string; couleur: string; fond: string }> = {
  0: { label: 'Brouillon',      couleur: '#94A3B8', fond: 'rgba(148, 163, 184, 0.14)' },
  1: { label: 'Disponibilités', couleur: '#60A5FA', fond: 'rgba(96, 165, 250, 0.14)' },
  2: { label: 'Disponibilités', couleur: '#60A5FA', fond: 'rgba(96, 165, 250, 0.14)' },
  3: { label: 'Activités',      couleur: '#C084FC', fond: 'rgba(192, 132, 252, 0.16)' },
  4: { label: 'Scénarios',      couleur: '#2DD4BF', fond: 'rgba(45, 212, 191, 0.14)' },
  5: { label: 'Filtre',         couleur: '#FBBF24', fond: 'rgba(251, 191, 36, 0.14)' },
  6: { label: 'Vote',           couleur: '#FB7185', fond: 'rgba(251, 113, 133, 0.14)' },
  7: { label: 'Terminé',        couleur: '#34D399', fond: 'rgba(52, 211, 153, 0.14)' },
}

/** Dernière phase atteignable — sert à l'affichage « étape N sur 7 ». */
export const DERNIERE_PHASE = 7

export function phaseDe(n: number | null | undefined) {
  return PHASES[n ?? 0] ?? PHASES[0]
}
