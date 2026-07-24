// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { generateEventScenarios, DBActivity, DBUser, DBAvailability, DateObj } from '@/lib/iris/scenario-engine'
import { computeParetoResult, computeFairnessCoefficients, persistWinningScenario, ScoredScenario } from '@/lib/iris/pareto-engine'
import { computeCondorcetWinner } from '@/lib/iris/condorcet'

const NONE_OPTION = 'NONE'

function timeToMinutesLocal(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

const FALLBACK_VOTE_WINDOW_MS = 48 * 60 * 60 * 1000 // 48h — utilisé si la date de l'événement est déjà passée ou trop proche

// Le vote doit se clôturer avant l'événement, mais pas pile à son horaire — il faut
// laisser une marge pour que chacun prenne connaissance du résultat et s'organise.
// On retient 85% du temps disponible entre l'ouverture du vote et le début de
// l'événement ; les 15% restants sont une marge de sécurité logistique.
const DEADLINE_BUFFER_FRACTION = 0.85
// Marge minimale absolue avant l'événement — même si 85% du temps restant tombe plus
// tard, le vote ne doit jamais se clôturer à moins de 48h de l'événement lui-même,
// pour laisser le temps à chacun de prendre connaissance du résultat et de s'organiser.
const MIN_MARGIN_BEFORE_EVENT_MS = 48 * 60 * 60 * 1000

function computeDeadlineProgress(voteStartedAt: string | null, eventDate: string | undefined, eventStartTime: string | undefined) {
  if (!voteStartedAt) return { progressPct: 0, isExpired: false, deadlineISO: null as string | null }
  const start = new Date(voteStartedAt).getTime()
  const now   = Date.now()

  const eventMoment = eventDate ? new Date(`${eventDate}T${eventStartTime ?? '09:00'}:00`).getTime() : NaN
  let deadline = !isNaN(eventMoment) ? start + (eventMoment - start) * DEADLINE_BUFFER_FRACTION : NaN

  // Applique la marge minimale de 48h avant l'événement, même si le calcul proportionnel
  // (85%) donnerait un résultat plus tardif.
  if (!isNaN(eventMoment)) {
    deadline = Math.min(deadline, eventMoment - MIN_MARGIN_BEFORE_EVENT_MS)
  }

  // Si la date de l'événement est déjà passée (ou trop proche pour laisser une marge
  // exploitable), ce n'est pas un délai réaliste — on retombe sur une fenêtre par défaut de 48h.
  if (!eventDate || isNaN(deadline) || deadline <= start + 60 * 60 * 1000) {
    deadline = start + FALLBACK_VOTE_WINDOW_MS
  }

  const pct = Math.min(100, Math.max(0, ((now - start) / (deadline - start)) * 100))
  return { progressPct: pct, isExpired: pct >= 100, deadlineISO: new Date(deadline).toISOString() }
}

// ─── Récupère toutes les données nécessaires (event, activités, profils, dispos, scénarios) ──

async function loadEventAndScenarios(adminSupabase: ReturnType<typeof createAdminClient>, eventId: string) {
  const { data: event } = await adminSupabase
    .from('events')
    .select('id, name, phase, proposed_dates, group_id, group_ids, budget_global, budget_overrun_pct, budget_visible, invited_member_ids, created_by, selected_date, vote_started_at, winning_scenario_snapshot')
    .eq('id', eventId)
    .single()
  if (!event) return null

  const { data: activities } = await adminSupabase.from('activities').select('*').eq('event_id', eventId)
  const groupIds: string[] = event.group_ids ?? []
  const { data: groupMembers } = groupIds.length > 0
    ? await adminSupabase.from('group_members').select('user_id').in('group_id', groupIds)
    : { data: [] }
  const baseMemberIds = event.invited_member_ids?.length
    ? event.invited_member_ids
    : [...new Set((groupMembers ?? []).map((m: { user_id: string }) => m.user_id))]

  // Ajoute les "extras" invités uniquement par lien, sans groupe, ayant soumis une disponibilité.
  const { data: extraAvailRows } = await adminSupabase
    .from('availabilities')
    .select('user_id')
    .eq('event_id', eventId)
    .neq('date', '1970-01-01')
  const extraIds = [...new Set((extraAvailRows ?? []).map(r => r.user_id))].filter(uid => !baseMemberIds.includes(uid))
  const memberIds = [...baseMemberIds, ...extraIds]

  const { data: profiles } = memberIds.length > 0
    ? await adminSupabase
        .from('users')
        .select('id, display_name, home_lat, home_lng, transport, distance_max, budget, social_level, weights, hard_constraints, activity_prefs')
        .in('id', memberIds)
    : { data: [] }

  const { data: availabilities } = memberIds.length > 0
    ? await adminSupabase
        .from('availabilities')
        .select('user_id, date, status, probability, slot_start, slot_end, budget_personal, start_lat, start_lng, constraint_overrides')
        .eq('event_id', eventId)
        .in('user_id', memberIds)
    : { data: [] }

  const avails = (availabilities ?? []).filter(a => a.date !== '1970-01-01') as DBAvailability[]

  // Adresse de départ alternative pour CET événement, si renseignée — remplace celle
  // du profil pour le calcul de distance, sans jamais modifier le profil permanent.
  const startOverrideByUser = new Map<string, { lat: number; lng: number }>()
  for (const row of (availabilities ?? [])) {
    if (row.start_lat != null && row.start_lng != null) {
      startOverrideByUser.set(row.user_id, { lat: row.start_lat, lng: row.start_lng })
    }
  }
  const users = (profiles ?? []).map(p => {
    const override = startOverrideByUser.get(p.id)
    return override ? { ...p, home_lat: override.lat, home_lng: override.lng } : p
  }) as DBUser[]

  const selectedDate = event.selected_date as DateObj | null
  const rawDates: DateObj[] = selectedDate
    ? [selectedDate]
    : Array.isArray(event.proposed_dates)
      ? event.proposed_dates.map((d: string | DateObj) => typeof d === 'string' ? { date: d } : d)
      : []

  const { scenarios } = generateEventScenarios({
    rawDates,
    activities:   (activities ?? []) as DBActivity[],
    users,
    avails,
    budgetGlobal: event.budget_global,
  })

  const effectiveGroupIdsForRi = groupIds.length ? groupIds : (event.group_id ? [event.group_id] : [])
  const riMap = await computeFairnessCoefficients(adminSupabase, effectiveGroupIdsForRi, memberIds)
  const budgetGlobalParam = event.budget_global != null
    ? { amount: event.budget_global, overrunPct: event.budget_overrun_pct ?? 0 }
    : null
  const result = computeParetoResult(scenarios, riMap, budgetGlobalParam)

  return { event, result, selectedDate }
}

// ─── Tally : calcule le vainqueur et persiste le résultat ─────────────────────

async function tally(
  adminSupabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  groupIds: string[],
  finalists: ScoredScenario[],
  activeUserIds: string[]
) {
  const candidates = [...finalists.map(f => f.scenario.id), NONE_OPTION]
  const candidateLabels: Record<string, string> = Object.fromEntries(
    finalists.map(f => [f.scenario.id, f.scenario.activities.map(a => a.name).join(' + ')])
  )
  candidateLabels[NONE_OPTION] = 'Aucun de ces scénarios'

  const { data: existingVotes } = await adminSupabase
    .from('votes')
    .select('user_id, ranking')
    .eq('event_id', eventId)

  const votedIds = new Set((existingVotes ?? []).map(v => v.user_id))
  const rankings: string[][] = (existingVotes ?? []).map(v => v.ranking as string[])

  // Complète avec un classement par défaut pour les non-votants (leur propre utilité, NONE en dernier)
  const defaultRows: { event_id: string; user_id: string; ranking: string[]; is_default: boolean }[] = []
  for (const uid of activeUserIds) {
    if (votedIds.has(uid)) continue
    const sorted = [...finalists].sort((a, b) => {
      const ua = a.perUser.find(u => u.userId === uid)?.uPrime ?? 0
      const ub = b.perUser.find(u => u.userId === uid)?.uPrime ?? 0
      return ub - ua
    })
    const ranking = [...sorted.map(f => f.scenario.id), NONE_OPTION]
    rankings.push(ranking)
    defaultRows.push({ event_id: eventId, user_id: uid, ranking, is_default: true })
  }
  if (defaultRows.length > 0) {
    await adminSupabase.from('votes').upsert(defaultRows, { onConflict: 'event_id,user_id' })
  }

  const condorcet = computeCondorcetWinner(rankings, candidates)

  if (condorcet.winner === NONE_OPTION) {
    // Nettoie les votes de ce cycle — s'ils restaient en base, un futur second cycle de
    // vote sur ce même événement pourrait les compter à tort (ID de scénarios obsolètes,
    // compteur de votants déjà "complet" avant même que quiconque ait revoté).
    await adminSupabase.from('votes').delete().eq('event_id', eventId)
    // Idem pour les préférences en attente de synchro — sinon un participant qui n'a
    // jamais vu la pop-up du 1er tour pourrait se voir reproposer une synchro obsolète
    // si une activité du même type revient dans ce nouveau tour d'Activités.
    await adminSupabase.from('availabilities').update({ pref_overrides: {} }).eq('event_id', eventId)

    await adminSupabase
      .from('events')
      .update({
        phase: 3,
        vote_started_at: null,
        vote_result: { ...condorcet, candidates, candidateLabels, concludedAt: new Date().toISOString(), outcome: 'none' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
    // On mène vers la page Résultats (qui explique la décision et le pourquoi),
    // pas directement vers Activités — personne ne doit atterrir là sans comprendre
    // que c'est le groupe qui a collectivement choisi de repartir de zéro.
    return { phase: 3, redirectTo: 'results' as const }
  }

  const winning = finalists.find(f => f.scenario.id === condorcet.winner)!

  await persistWinningScenario(adminSupabase, eventId, groupIds, winning, {
    method: condorcet.method, pairwise: condorcet.pairwise, bordaScores: condorcet.bordaScores, candidates, candidateLabels,
  })

  return { phase: 7, redirectTo: 'results' as const }
}

// ─── GET /api/events/[id]/vote ─────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const loaded = await loadEventAndScenarios(adminSupabase, eventId)
  if (!loaded) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  const { event, result, selectedDate } = loaded

  if (event.phase >= 7) {
    return NextResponse.json({ concluded: true, redirectTo: 'results', currentUserId: user.id })
  }
  if (event.phase === 3) {
    return NextResponse.json({ concluded: true, redirectTo: 'activities', currentUserId: user.id })
  }
  if (event.phase !== 6) {
    return NextResponse.json({ error: 'Le vote n\'est pas encore ouvert pour cet événement.' }, { status: 400 })
  }

  const activeUserIds = result.finalists[0]?.scenario.activeUsers.map(u => u.userId) ?? []
  const effectiveGroupIds = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])

  const { data: existingVotes } = await adminSupabase.from('votes').select('user_id, ranking, is_default').eq('event_id', eventId)
  const votedCount = new Set((existingVotes ?? []).map(v => v.user_id)).size
  const totalParticipants = activeUserIds.length

  const { progressPct, isExpired, deadlineISO } = computeDeadlineProgress(
    event.vote_started_at, selectedDate?.date, selectedDate?.startTime
  )

  const shouldConclude = totalParticipants > 0 && (votedCount >= totalParticipants || isExpired)

  if (shouldConclude) {
    try {
      const outcome = await tally(adminSupabase, eventId, effectiveGroupIds, result.finalists, activeUserIds)
      return NextResponse.json({ concluded: true, redirectTo: outcome.redirectTo, currentUserId: user.id })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la clôture du vote.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const myVote = (existingVotes ?? []).find(v => v.user_id === user.id)

  const candidatesForClient = result.finalists.map(f => {
    const mine = f.perUser.find(u => u.userId === user.id)
    return {
      id:               f.scenario.id,
      dayLabel:         f.scenario.dayLabel,
      activities:       f.scenario.activities,
      timeline:         f.scenario.timeline,
      windowStart:      f.scenario.windowStart,
      windowEnd:        f.scenario.windowEnd,
      totalCost:        f.scenario.totalCost,
      totalTimeMinutes: f.scenario.totalTimeMinutes,
      totalWaitMinutes: f.scenario.totalWaitMinutes,
      groupScore:       f.groupScore,
      myScore:          mine ? mine.uPrime : null,
    }
  })

  return NextResponse.json({
    concluded: false,
    event: { id: event.id, name: event.name, phase: event.phase, created_by: event.created_by },
    candidates: candidatesForClient,
    myRanking: myVote ? myVote.ranking : null,
    progress: { votedCount, totalParticipants, progressPct, isExpired, deadlineISO },
    currentUserId: user.id,
  })
}

// ─── POST /api/events/[id]/vote ────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const ranking: string[] = body.ranking

  if (!Array.isArray(ranking) || !ranking.includes(NONE_OPTION)) {
    return NextResponse.json({ error: 'Classement invalide.' }, { status: 400 })
  }

  const loaded = await loadEventAndScenarios(adminSupabase, eventId)
  if (!loaded) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  const { event, result } = loaded

  if (event.phase !== 6) return NextResponse.json({ error: 'Le vote n\'est plus ouvert.' }, { status: 400 })

  const validIds = new Set([...result.finalists.map(f => f.scenario.id), NONE_OPTION])
  if (ranking.length !== validIds.size || !ranking.every(id => validIds.has(id))) {
    return NextResponse.json({ error: 'Le classement ne correspond pas aux scénarios proposés.' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('votes')
    .upsert({ event_id: eventId, user_id: user.id, ranking, is_default: false, submitted_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Vérifie si c'était le dernier vote nécessaire
  const activeUserIds = result.finalists[0]?.scenario.activeUsers.map(u => u.userId) ?? []
  const effectiveGroupIds = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])

  const { data: existingVotes } = await adminSupabase.from('votes').select('user_id').eq('event_id', eventId)
  const votedCount = new Set((existingVotes ?? []).map(v => v.user_id)).size

  if (activeUserIds.length > 0 && votedCount >= activeUserIds.length) {
    try {
      const outcome = await tally(adminSupabase, eventId, effectiveGroupIds, result.finalists, activeUserIds)
      return NextResponse.json({ ok: true, concluded: true, redirectTo: outcome.redirectTo })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la clôture du vote.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, concluded: false })
}
