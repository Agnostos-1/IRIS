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

// ─── GET /api/events/[id]/scenarios ──────────────────────────────────────────
// Phase 4 — affichage brut des scénarios faisables (aucun score, juste la
// composition et la timeline). Le scoring complet est fait en Phase 5 (Pareto).

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
    .select('id, name, phase, proposed_dates, group_ids, budget_global, budget_overrun_pct, budget_visible, invited_member_ids, created_by, selected_date')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  const { data: activities } = await adminSupabase.from('activities').select('*').eq('event_id', eventId)
  if (!activities?.length) {
    return NextResponse.json({ error: 'Aucune activité — revenez à la phase Activités.' }, { status: 400 })
  }

  const groupIds: string[] = event.group_ids ?? []
  const { data: groupMembers } = groupIds.length > 0
    ? await adminSupabase.from('group_members').select('user_id').in('group_id', groupIds)
    : { data: [] }
  const baseMemberIds = event.invited_member_ids?.length
    ? event.invited_member_ids
    : [...new Set((groupMembers ?? []).map((m: { user_id: string }) => m.user_id))]

  // Ajoute les "extras" — invités uniquement par le lien de l'événement, sans groupe —
  // qui ont soumis une disponibilité mais ne sont jamais des membres de groupe. Sans ça,
  // ils sont invisibles pour la génération de scénarios alors qu'ils ont bien répondu.
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

  const { scenarios, eliminatedActivities } = generateEventScenarios({
    rawDates,
    activities:   activities as DBActivity[],
    users,
    avails,
    budgetGlobal: event.budget_global,
  })

  // Réponse allégée — aucune donnée personnelle d'autrui (pas de préférences, pas de scores)
  const publicScenarios = scenarios.map(s => ({
    id:               s.id,
    date:             s.date,
    dayLabel:         s.dayLabel,
    activityIds:      s.activityIds,
    activityNames:    s.activities.map(a => a.name),
    activities:       s.activities,
    timeline:         s.timeline,
    windowStart:      s.windowStart,
    windowEnd:        s.windowEnd,
    totalCost:        s.totalCost,
    totalTimeMinutes: s.totalTimeMinutes,
    totalWaitMinutes: s.totalWaitMinutes,
    participantCount: s.activeUsers.length,
  }))

  return NextResponse.json({
    event:                { id: event.id, name: event.name, phase: event.phase, created_by: event.created_by },
    scenarios:            publicScenarios,
    eliminatedActivities: [...new Map(eliminatedActivities.map(e => [e.id + e.date, e])).values()],
    participantCount:     (profiles ?? []).length,
    activityCount:        activities.length,
    currentUserId:        user.id,
    organizerBudget: event.budget_global != null ? {
      amount:     event.budget_visible !== false ? event.budget_global : null,
      overrunPct: event.budget_visible !== false ? (event.budget_overrun_pct ?? 0) : null,
      limit:      event.budget_global * (1 + (event.budget_overrun_pct ?? 0)), // toujours calculable côté serveur pour le flag, montant caché ou non
      visible:    event.budget_visible !== false,
    } : null,
  })
}

// ─── PATCH /api/events/[id]/scenarios ────────────────────────────────────────
// Organisateur : clôture phase 4 → phase 5, ou retour phase 3 (activités)

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

  const { data: event } = await adminSupabase.from('events').select('created_by, phase').eq('id', eventId).single()
  if (!event)                       return NextResponse.json({ error: 'Introuvable' },  { status: 404 })
  if (event.created_by !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  if (body.action === 'close_phase4') {
    const { error } = await adminSupabase.from('events').update({ phase: 5, updated_at: new Date().toISOString() }).eq('id', eventId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, phase: 5 })
  }

  if (body.action === 'revert_to_activities') {
    const { error } = await adminSupabase.from('events').update({ phase: 3, updated_at: new Date().toISOString() }).eq('id', eventId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, phase: 3 })
  }

  return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
}
