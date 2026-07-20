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
import { computeParetoResult, computeFairnessCoefficients, computeFairnessBreakdown, persistWinningScenario } from '@/lib/iris/pareto-engine'

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
    .select('id, name, phase, proposed_dates, group_id, group_ids, budget_global, budget_overrun_pct, budget_visible, invited_member_ids, created_by, selected_date')
    .eq('id', eventId)
    .single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  const { data: activities } = await adminSupabase.from('activities').select('*').eq('event_id', eventId)
  if (!activities?.length) return NextResponse.json({ error: 'Aucune activité.' }, { status: 400 })

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
        .select('user_id, date, status, probability, slot_start, slot_end, budget_personal, constraint_overrides')
        .eq('event_id', eventId)
        .in('user_id', memberIds)
    : { data: [] }

  const avails = (availabilities ?? []).filter(a => a.date !== '1970-01-01') as DBAvailability[]

  const selectedDate = event.selected_date as DateObj | null
  const rawDates: DateObj[] = selectedDate
    ? [selectedDate]
    : Array.isArray(event.proposed_dates)
      ? event.proposed_dates.map((d: string | DateObj) => typeof d === 'string' ? { date: d } : d)
      : []

  const { scenarios } = generateEventScenarios({
    rawDates,
    activities:   activities as DBActivity[],
    users:        (profiles ?? []) as DBUser[],
    avails,
    budgetGlobal: event.budget_global,
  })

  if (!scenarios.length) {
    return NextResponse.json({ error: 'Aucun scénario disponible — retournez à la phase Scénarios.' }, { status: 400 })
  }

  const effectiveGroupIds = groupIds.length ? groupIds : (event.group_id ? [event.group_id] : [])
  const riMap = await computeFairnessCoefficients(adminSupabase, effectiveGroupIds, memberIds)
  const budgetGlobalParam = event.budget_global != null
    ? { amount: event.budget_global, overrunPct: event.budget_overrun_pct ?? 0 }
    : null
  const result = computeParetoResult(scenarios, riMap, budgetGlobalParam)

  const myId = user.id

  // Détail par groupe de MON propre Rᵢ combiné — pour ne pas laisser "coefficient
  // combiné" dans le flou quand on appartient à plusieurs des groupes de l'événement.
  const { data: myGroupMembershipsForRi } = effectiveGroupIds.length > 0
    ? await adminSupabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', myId).in('group_id', effectiveGroupIds)
    : { data: [] }
  const myGroupsForRi = ((myGroupMembershipsForRi ?? []) as unknown as
    { group_id: string; groups: { id: string; name: string } | null }[])
    .map((m) => m.groups)
    .filter((g: { id: string; name: string } | null): g is { id: string; name: string } => !!g)
  const myRiPerGroup = await Promise.all(myGroupsForRi.map(async (g) => {
    const b = await computeFairnessBreakdown(adminSupabase, myId, g.id)
    return { groupId: g.id, groupName: g.name, ri: parseFloat((b.riGroup ?? 1.0).toFixed(3)) }
  }))
  const myGlobalBreakdown = await computeFairnessBreakdown(adminSupabase, myId, null)
  const myRiBreakdown = { perGroup: myRiPerGroup, global: parseFloat(myGlobalBreakdown.riGlobal.toFixed(3)) }

  const allScenariosLight = result.scored
    .sort((a, b) => b.groupScore - a.groupScore)
    .map(s => {
      const mine = s.perUser.find(u => u.userId === myId)
      const isFinalist = result.finalists.some(f => f.scenario.id === s.scenario.id)
      const isDominated = !result.nonDominated.some(nd => nd.scenario.id === s.scenario.id)
      const status: 'finalist' | 'dominated' | 'belowCutoff' = isFinalist ? 'finalist' : isDominated ? 'dominated' : 'belowCutoff'
      return {
        id:         s.scenario.id,
        label:      s.scenario.activities.map(a => a.name).join(' + '),
        groupScore: s.groupScore,
        myScore:    mine ? mine.uPrime : null,
        status,
      }
    })

  const myFinalists = result.finalists.map(({ scenario, perUser, groupScore }) => {
    const mine = perUser.find(u => u.userId === myId)
    return {
      id:               scenario.id,
      date:             scenario.date,
      dayLabel:         scenario.dayLabel,
      activities:       scenario.activities,
      timeline:         scenario.timeline,
      windowStart:      scenario.windowStart,
      windowEnd:        scenario.windowEnd,
      totalCost:        scenario.totalCost,
      totalTimeMinutes: scenario.totalTimeMinutes,
      totalWaitMinutes: scenario.totalWaitMinutes,
      participantCount: scenario.activeUsers.length,
      groupScore,
      myUtility: mine ? {
        value:          mine.uPrime,
        fB:             mine.fB,
        fS:             mine.fS,
        fD:             mine.fD,
        totalKm:        mine.totalKm,
        ri:             mine.ri,
        weight:         mine.weight,
        probability:    mine.probability,
        availStatus:    mine.availStatus,
        uActivities:    mine.uActivities,
        scheduleDetail: mine.scheduleDetail,
        weights:        mine.weights,
        perActivity:    mine.perActivity,
      } : null,
    }
  })

  return NextResponse.json({
    event: { id: event.id, name: event.name, phase: event.phase, created_by: event.created_by },
    allScenarios: allScenariosLight,
    finalists:    myFinalists,
    meta: {
      totalScenarios:    scenarios.length,
      nonDominatedCount: result.nonDominated.length,
      dominatedCount:    result.dominatedCount,
      best:              result.best,
      cutoff:            result.cutoff,
      marginUsed:        result.marginUsed,
      marginWasExtended: result.marginWasExtended,
      isDirectWinner:    result.isDirectWinner,
      message:           result.message,
      eliminatedForBudgetCount: result.eliminatedForBudget.length,
    },
    organizerBudget: budgetGlobalParam ? {
      amount:     event.budget_visible !== false ? event.budget_global : null,
      overrunPct: event.budget_visible !== false ? (event.budget_overrun_pct ?? 0) : null,
      visible:    event.budget_visible !== false,
    } : null,
    myRiBreakdown,
    currentUserId: user.id,
  })
}

// ─── PATCH /api/events/[id]/pareto ────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  if (body.action !== 'proceed') return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })

  const { data: event } = await adminSupabase
    .from('events')
    .select('id, name, phase, proposed_dates, group_id, group_ids, budget_global, budget_overrun_pct, budget_visible, invited_member_ids, created_by, selected_date')
    .eq('id', eventId)
    .single()
  if (!event) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  if (body.isDirectWinner) {
    // Vainqueur direct — pas de vote nécessaire. On recalcule pour retrouver le
    // scénario finaliste exact et on fige son snapshot complet (comme après un vote).
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
          .select('user_id, date, status, probability, slot_start, slot_end, budget_personal, constraint_overrides')
          .eq('event_id', eventId)
          .in('user_id', memberIds)
      : { data: [] }

    const avails = (availabilities ?? []).filter((a: { date: string }) => a.date !== '1970-01-01') as DBAvailability[]
    const selectedDate = event.selected_date as DateObj | null
    const rawDates: DateObj[] = selectedDate
      ? [selectedDate]
      : Array.isArray(event.proposed_dates)
        ? event.proposed_dates.map((d: string | DateObj) => typeof d === 'string' ? { date: d } : d)
        : []

    const { scenarios } = generateEventScenarios({
      rawDates,
      activities:   (activities ?? []) as DBActivity[],
      users:        (profiles ?? []) as DBUser[],
      avails,
      budgetGlobal: event.budget_global,
    })

    const effectiveGroupIds = groupIds.length ? groupIds : (event.group_id ? [event.group_id] : [])
    const riMap = await computeFairnessCoefficients(adminSupabase, effectiveGroupIds, memberIds)
    const budgetGlobalParam = event.budget_global != null
    ? { amount: event.budget_global, overrunPct: event.budget_overrun_pct ?? 0 }
    : null
  const result = computeParetoResult(scenarios, riMap, budgetGlobalParam)

    const winning = result.finalists.find(f => f.scenario.id === (body.winningScenarioId ?? result.finalists[0]?.scenario.id))
    if (!winning) return NextResponse.json({ error: 'Scénario gagnant introuvable — recalculez la page.' }, { status: 400 })

    try {
      await persistWinningScenario(adminSupabase, eventId, effectiveGroupIds, winning, { method: 'direct' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement du résultat.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, phase: 7 })
  }

  const { error } = await adminSupabase
    .from('events')
    .update({ phase: 6, vote_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: 6 })
}
