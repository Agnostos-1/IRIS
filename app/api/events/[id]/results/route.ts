// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { computeFairnessCoefficients, computeFairnessBreakdown } from '@/lib/iris/pareto-engine'

interface SnapshotPerUser { userId: string; uPrime: number; ri: number; fB: number; fS: number; fD: number }
interface Snapshot {
  id: string; date: string; dayLabel: string
  activities: { id: string; name: string; type: string; duration: number; cost: number; address: string | null; lat: number | null; lng: number | null }[]
  timeline: { actId: string; start: number; end: number; travelBefore: number; waitBefore: number }[]
  windowStart: number; windowEnd: number
  totalCost: number; totalTimeMinutes: number; totalWaitMinutes: number
  groupScore: number
  perUser: SnapshotPerUser[]
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: event } = await adminSupabase
    .from('events')
    .select('id, name, phase, created_by, group_id, group_ids, winning_scenario_snapshot, vote_result, selected_date, budget_global')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  const voteResult = event.vote_result as {
    method?: 'direct' | 'condorcet' | 'borda'
    pairwise?: Record<string, Record<string, number>>
    bordaScores?: Record<string, number>
    candidates?: string[]
    candidateLabels?: Record<string, string>
    outcome?: 'scenario' | 'none'
  } | null

  const isNoneOutcome = voteResult?.outcome === 'none'

  if (!isNoneOutcome && (event.phase < 7 || !event.winning_scenario_snapshot)) {
    return NextResponse.json({ error: 'Les résultats ne sont pas encore disponibles pour cet événement.' }, { status: 400 })
  }

  // ── Cas "Aucun de ces scénarios" — pas de scénario gagnant ni de compensation,
  // uniquement la transparence du vote (le groupe repart en Phase Activités) ──
  if (isNoneOutcome) {
    const candidates = (voteResult!.candidates ?? [])
    const labels     = voteResult!.candidateLabels ?? {}
    const pairwise   = voteResult!.pairwise ?? {}

    const ranking = candidates.map(id => {
      let wins = 0, losses = 0, ties = 0
      for (const other of candidates) {
        if (other === id) continue
        const forC    = pairwise[id]?.[other] ?? 0
        const against = pairwise[other]?.[id] ?? 0
        if (forC > against) wins++
        else if (forC < against) losses++
        else ties++
      }
      return { id, label: id === 'NONE' ? 'Aucun de ces scénarios' : (labels[id] ?? id), wins, losses, ties }
    }).sort((a, b) => b.wins - a.wins || a.losses - b.losses)

    const matrix = candidates.map(id => ({
      id, label: id === 'NONE' ? 'Aucun de ces scénarios' : (labels[id] ?? id),
      against: candidates.filter(o => o !== id).map(o => {
        const count = pairwise[id]?.[o] ?? 0
        const opponentCount = pairwise[o]?.[id] ?? 0
        return { id: o, label: o === 'NONE' ? 'Aucun de ces scénarios' : (labels[o] ?? o), count, opponentCount, won: count > opponentCount }
      }),
    }))

    return NextResponse.json({
      outcome: 'none' as const,
      event: { id: event.id, name: event.name, created_by: event.created_by },
      voteMethod: voteResult!.method ?? null,
      condorcetSummary: { ranking, matrix },
      currentUserId: user.id,
      isOrganizer: event.created_by === user.id,
    })
  }

  const snapshot = event.winning_scenario_snapshot as Snapshot
  const myEntry  = snapshot.perUser.find(p => p.userId === user.id) ?? null

  // Rᵢ APPLIQUÉ pour ce résultat (basé sur l'historique AVANT cet événement — déjà figé dans le snapshot)
  const appliedAvgRi = snapshot.perUser.length
    ? parseFloat((snapshot.perUser.reduce((s, p) => s + p.ri, 0) / snapshot.perUser.length).toFixed(3))
    : 1.0
  const appliedAllNeutral = snapshot.perUser.every(p => p.ri === 1.0)

  // Rᵢ MIS À JOUR pour le PROCHAIN événement — recalculé maintenant, l'historique de CET
  // événement vient d'être écrit à la conclusion du vote, donc ce calcul le prend en compte.
  const effectiveGroupIds = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])
  const participantIds = snapshot.perUser.map(p => p.userId)
  const updatedRiMap = await computeFairnessCoefficients(adminSupabase, effectiveGroupIds, participantIds)
  const myUpdatedRi = updatedRiMap[user.id] ?? 1.0
  const updatedAvgRi = participantIds.length
    ? parseFloat((participantIds.reduce((s, id) => s + (updatedRiMap[id] ?? 1.0), 0) / participantIds.length).toFixed(3))
    : 1.0
  const updatedAllNeutral = participantIds.every(id => (updatedRiMap[id] ?? 1.0) === 1.0)

  // Détail par groupe ET global — indispensable dès que la personne appartient à
  // plusieurs des groupes de l'événement, où "votre coefficient POUR CE groupe" n'a
  // plus de sens sans préciser DUQUEL. "Avant" exclut explicitement CET événement de
  // l'historique (déjà écrit à la conclusion du vote) pour isoler proprement ce qui a
  // été appliqué de ce qui vient de changer.
  const { data: myGroupMemberships } = effectiveGroupIds.length > 0
    ? await adminSupabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', user.id).in('group_id', effectiveGroupIds)
    : { data: [] }

  const myGroupsForThisEvent = ((myGroupMemberships ?? []) as unknown as
    { group_id: string; groups: { id: string; name: string } | null }[])
    .map((m) => m.groups)
    .filter((g: { id: string; name: string } | null): g is { id: string; name: string } => !!g)

  const perGroupCompensation = await Promise.all(myGroupsForThisEvent.map(async (g) => {
    const before = await computeFairnessBreakdown(adminSupabase, user.id, g.id, eventId)
    const after  = await computeFairnessBreakdown(adminSupabase, user.id, g.id)
    return {
      groupId: g.id, groupName: g.name,
      before: parseFloat((before.riGroup ?? 1.0).toFixed(3)),
      after:  parseFloat((after.riGroup  ?? 1.0).toFixed(3)),
    }
  }))

  const globalBefore = await computeFairnessBreakdown(adminSupabase, user.id, null, eventId)
  const globalAfter  = await computeFairnessBreakdown(adminSupabase, user.id, null)
  const globalCompensation = {
    before: parseFloat(globalBefore.riGlobal.toFixed(3)),
    after:  parseFloat(globalAfter.riGlobal.toFixed(3)),
  }

  // Résumé victoires/défaites par candidat (hors "NONE", non pertinent en page résultats
  // puisqu'on n'atteint la phase 7 que si un scénario a effectivement gagné)
  let condorcetSummary: {
    ranking: { id: string; label: string; wins: number; losses: number; ties: number }[]
    matrix:  { id: string; label: string; against: { id: string; label: string; count: number; opponentCount: number; won: boolean }[] }[]
  } | null = null

  if (voteResult?.pairwise && voteResult.candidates && voteResult.candidateLabels) {
    const scenarioCandidates = voteResult.candidates.filter(c => c !== 'NONE')
    const labels = voteResult.candidateLabels
    const pairwise = voteResult.pairwise

    const ranking = scenarioCandidates.map(id => {
      let wins = 0, losses = 0, ties = 0
      for (const other of scenarioCandidates) {
        if (other === id) continue
        const forC  = pairwise[id]?.[other] ?? 0
        const against = pairwise[other]?.[id] ?? 0
        if (forC > against) wins++
        else if (forC < against) losses++
        else ties++
      }
      return { id, label: labels[id] ?? id, wins, losses, ties }
    }).sort((a, b) => b.wins - a.wins || a.losses - b.losses)

    const matrix = scenarioCandidates.map(id => ({
      id, label: labels[id] ?? id,
      against: scenarioCandidates.filter(o => o !== id).map(o => {
        const count = pairwise[id]?.[o] ?? 0
        const opponentCount = pairwise[o]?.[id] ?? 0
        return { id: o, label: labels[o] ?? o, count, opponentCount, won: count > opponentCount }
      }),
    }))

    condorcetSummary = { ranking, matrix }
  }

  return NextResponse.json({
    outcome: 'scenario' as const,
    event: { id: event.id, name: event.name, created_by: event.created_by },
    winningScenario: {
      id:               snapshot.id,
      date:             snapshot.date,
      dayLabel:         snapshot.dayLabel,
      activities:       snapshot.activities,
      timeline:         snapshot.timeline,
      windowStart:      snapshot.windowStart,
      windowEnd:        snapshot.windowEnd,
      totalCost:        snapshot.totalCost,
      totalTimeMinutes: snapshot.totalTimeMinutes,
      totalWaitMinutes: snapshot.totalWaitMinutes,
      groupScore:       snapshot.groupScore,
    },
    myUtility: myEntry ? { value: myEntry.uPrime, ri: myEntry.ri, fB: myEntry.fB, fS: myEntry.fS, fD: myEntry.fD } : null,
    participantCount: snapshot.perUser.length,
    compensation: {
      applied: { averageRi: appliedAvgRi, allNeutral: appliedAllNeutral },
      updated: { myRi: myUpdatedRi, averageRi: updatedAvgRi, allNeutral: updatedAllNeutral },
      perGroup: perGroupCompensation,
      global: globalCompensation,
    },
    voteMethod: voteResult?.method ?? null,
    condorcetSummary,
    currentUserId: user.id,
    isOrganizer: event.created_by === user.id,
  })
}
