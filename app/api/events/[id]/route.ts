// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }        = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Récupère l'événement
  const { data: ev, error } = await adminSupabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ev) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Noms des groupes
  const groupIds: string[] = ev.group_ids ?? [ev.group_id]
  const { data: groups } = await adminSupabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds)

  // Membres de tous les groupes (dédupliqués par user_id)
  const { data: members } = await adminSupabase
    .from('group_members')
    .select('user_id, users(id, display_name, email)')
    .in('group_id', groupIds)
    .in('status', ['active', 'invited'])

  // Participants supplémentaires directs
  const extraEmails: string[] = ev.extra_emails ?? []

  // Déduplique les participants
  const seenIds = new Set<string>()
  const participants: { userId: string; displayName: string; email: string }[] = []
  const invitedMemberIds: string[] | null = ev.invited_member_ids?.length ? ev.invited_member_ids : null

  members?.forEach(m => {
    const u = m.users as unknown as { id: string; display_name: string | null; email: string } | null
    if (!u || seenIds.has(u.id)) return
    if (invitedMemberIds && !invitedMemberIds.includes(u.id)) return  // exclu explicitement de cet événement
    seenIds.add(u.id)
    participants.push({
      userId:      u.id,
      displayName: u.display_name ?? u.email.split('@')[0],
      email:       u.email,
    })
  })

  // Ajoute les extras s'ils ont un compte
  if (extraEmails.length > 0) {
    const { data: extraUsers } = await adminSupabase
      .from('users')
      .select('id, display_name, email')
      .in('email', extraEmails)

    extraUsers?.forEach(u => {
      if (seenIds.has(u.id)) return
      seenIds.add(u.id)
      participants.push({
        userId:      u.id,
        displayName: u.display_name ?? u.email.split('@')[0],
        email:       u.email,
      })
    })
  }

  // Récupère les disponibilités existantes (tous ceux qui ont soumis, pas seulement les membres)
  const { data: availRows } = await adminSupabase
    .from('availabilities')
    .select('user_id, date, status, probability, slot_start, slot_end, budget_personal, start_lat, start_lng, start_address, submitted')
    .eq('event_id', id)
    .neq('date', '1970-01-01')

  // Ajoute les participants qui ont soumis des disponibilités mais ne sont pas encore dans la liste
  // (cas des invités ou participants via lien d'événement)
  const submittedUserIds = [...new Set((availRows ?? []).map(r => r.user_id))]
  const missingIds = submittedUserIds.filter(uid => !seenIds.has(uid))
  if (missingIds.length > 0) {
    const { data: missingUsers } = await adminSupabase
      .from('users')
      .select('id, display_name, email')
      .in('id', missingIds)
    missingUsers?.forEach(u => {
      if (seenIds.has(u.id)) return
      // N'exclut que s'il s'agit d'un membre de groupe explicitement exclu — jamais un
      // "extra" invité par lien, qui n'a jamais été candidat via group_members.
      const wasGroupCandidate = members?.some(m => (m.users as unknown as { id: string } | null)?.id === u.id)
      if (invitedMemberIds && wasGroupCandidate && !invitedMemberIds.includes(u.id)) return
      seenIds.add(u.id)
      participants.push({
        userId:      u.id,
        displayName: u.display_name ?? u.email.split('@')[0],
        email:       u.email,
      })
    })
  }

  // Reconstruit les disponibilités par participant
  const availMap: Record<string, {
    statuses: Record<string, string>
    probas:   Record<string, number>
    slots:    Record<string, { start: string; end: string }>
    budget?:  number
    startLat?: number
    startLng?: number
    startAddress?: string
    submitted: boolean
  }> = {}

  availRows?.forEach(row => {
    if (!availMap[row.user_id]) {
      availMap[row.user_id] = { statuses: {}, probas: {}, slots: {}, submitted: false }
    }
    availMap[row.user_id].statuses[row.date] = row.status
    availMap[row.user_id].probas[row.date]   = Math.round((row.probability ?? 0.7) * 100)
    if (row.slot_start && row.slot_end) {
      availMap[row.user_id].slots[row.date] = { start: row.slot_start, end: row.slot_end }
    }
    if (row.budget_personal) availMap[row.user_id].budget = row.budget_personal
    if (row.start_lat != null && row.start_lng != null) {
      availMap[row.user_id].startLat = row.start_lat
      availMap[row.user_id].startLng = row.start_lng
      availMap[row.user_id].startAddress = row.start_address ?? undefined
    }
    if (row.submitted) availMap[row.user_id].submitted = true
  })

  const availabilities = participants.map(p => ({
    userId:      p.userId,
    displayName: p.displayName,
    // Email, budget et adresse de départ réels : uniquement pour SA PROPRE ligne, jamais celle d'autrui.
    email:       p.userId === user.id ? p.email : undefined,
    statuses:    availMap[p.userId]?.statuses ?? {},
    probas:      availMap[p.userId]?.probas   ?? {},
    slots:       availMap[p.userId]?.slots    ?? {},
    budget:      p.userId === user.id ? availMap[p.userId]?.budget : undefined,
    startLat:      p.userId === user.id ? availMap[p.userId]?.startLat : undefined,
    startLng:      p.userId === user.id ? availMap[p.userId]?.startLng : undefined,
    startAddress:  p.userId === user.id ? availMap[p.userId]?.startAddress : undefined,
    submitted:   availMap[p.userId]?.submitted ?? false,
  }))

  // Médiane des budgets réellement soumis — seule donnée de budget exposée pour autrui
  const submittedBudgets = participants
    .map(p => availMap[p.userId]?.budget)
    .filter((b): b is number => typeof b === 'number')
    .sort((a, b) => a - b)
  const medianBudget = submittedBudgets.length
    ? (submittedBudgets.length % 2 === 0
        ? Math.round((submittedBudgets[submittedBudgets.length / 2 - 1] + submittedBudgets[submittedBudgets.length / 2]) / 2)
        : submittedBudgets[Math.floor(submittedBudgets.length / 2)])
    : null

  return NextResponse.json({
    event: {
      id:               ev.id,
      name:             ev.name,
      description:      ev.description,
      phase:            ev.phase,
      proposedDates:    ev.proposed_dates ?? [],
      location:         ev.location,
      locationMode:     ev.location_mode ?? 'zone',
      inviteCode:       ev.invite_code,
      openInvite:       ev.open_invite ?? false,
      budgetGlobal:     ev.budget_global,
      budgetVisible:    ev.budget_visible ?? true,
      budgetOverrunPct: ev.budget_overrun_pct ?? 0,
      quorum:           ev.quorum,
      deadline:         ev.deadline,
      autoReminder:     ev.auto_reminder ?? true,
      revealAfterSubmit: ev.reveal_after_submit ?? true,
      groupIds,
      groupNames:       groups?.map(g => g.name) ?? [],
      createdBy:        ev.created_by,
      createdAt:        ev.created_at,
      cancelledAt:      ev.cancelled_at ?? null,
    },
    availabilities,
    medianBudget,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }        = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'cancel') {
    const { data: ev } = await adminSupabase
      .from('events')
      .select('created_by, phase')
      .eq('id', id)
      .single()

    if (!ev) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (ev.created_by !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    // Gardé volontairement avant la Phase 5 (Pareto) — une fois les scénarios connus,
    // annuler pourrait servir à esquiver un résultat qui ne convient pas à l'organisateur.
    if (ev.phase >= 5) {
      return NextResponse.json({ error: 'Un événement ne peut plus être annulé une fois les scénarios calculés (Phase 5 et au-delà).' }, { status: 400 })
    }

    const { error } = await adminSupabase
      .from('events')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { deadline, autoReminder, revealAfterSubmit, description, budgetGlobal, budgetOverrunPct, openInvite } = body

  const updatePayload: Record<string, unknown> = {
    deadline:            deadline || null,
    auto_reminder:       autoReminder,
    reveal_after_submit: revealAfterSubmit,
  }
  if (description !== undefined) updatePayload.description = description
  if (budgetGlobal !== undefined) updatePayload.budget_global = budgetGlobal
  if (budgetOverrunPct !== undefined) updatePayload.budget_overrun_pct = budgetOverrunPct
  if (openInvite !== undefined) updatePayload.open_invite = openInvite

  const { error } = await adminSupabase
    .from('events')
    .update(updatePayload)
    .eq('id', id)
    .eq('created_by', user.id)  // seulement l'organisateur

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
