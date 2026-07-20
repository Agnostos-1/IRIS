// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// ─── lib/iris/condorcet.ts ──────────────────────────────────────────────────
// Vainqueur de Condorcet (bat tous les autres candidats en duel) avec repli
// sur le score de Borda en cas de cycle (méthode de Black).

export interface CondorcetResult {
  winner:      string
  method:      'condorcet' | 'borda'
  pairwise:    Record<string, Record<string, number>>
  bordaScores?: Record<string, number>
}

export function computeCondorcetWinner(rankings: string[][], candidates: string[]): CondorcetResult {
  const pairwise: Record<string, Record<string, number>> = {}
  for (const a of candidates) {
    pairwise[a] = {}
    for (const b of candidates) pairwise[a][b] = 0
  }

  for (const ranking of rankings) {
    for (let i = 0; i < ranking.length; i++) {
      for (let j = i + 1; j < ranking.length; j++) {
        if (pairwise[ranking[i]] && pairwise[ranking[i]][ranking[j]] !== undefined) {
          pairwise[ranking[i]][ranking[j]]++
        }
      }
    }
  }

  let condorcetWinner: string | null = null
  for (const a of candidates) {
    let beatsAll = true
    for (const b of candidates) {
      if (a === b) continue
      if (pairwise[a][b] <= pairwise[b][a]) { beatsAll = false; break }
    }
    if (beatsAll) { condorcetWinner = a; break }
  }

  if (condorcetWinner) {
    return { winner: condorcetWinner, method: 'condorcet', pairwise }
  }

  // Repli Borda : somme des rangs (N-1 points pour le 1er choix, 0 pour le dernier)
  const bordaScores: Record<string, number> = Object.fromEntries(candidates.map(c => [c, 0]))
  for (const ranking of rankings) {
    ranking.forEach((id, idx) => {
      if (bordaScores[id] !== undefined) bordaScores[id] += (ranking.length - 1 - idx)
    })
  }
  const winner = candidates.reduce((best, c) => (bordaScores[c] > bordaScores[best] ? c : best), candidates[0])
  return { winner, method: 'borda', pairwise, bordaScores }
}
