// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendDeadlineReminderEmail } from '@/lib/email/send'

// ─── GET /api/cron/reminders ──────────────────────────────────────────────────
// Déclenché quotidiennement par Vercel Cron (cf. vercel.json). Envoie un rappel
// aux participants n'ayant pas encore soumis leurs disponibilités, pour tout
// événement dont la deadline de réponse tombe dans exactement 2 jours.

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today  = new Date()
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
  const todayUTC  = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((targetUTC - todayUTC) / 86400000)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: candidates, error: candidatesError } = await adminSupabase
    .from('events')
    .select('id, name, deadline, group_id, group_ids, invited_member_ids, extra_emails')
    .eq('phase', 2)
    .eq('auto_reminder', true)
    .is('cancelled_at', null)
    .is('reminder_sent_at', null)
    .not('deadline', 'is', null)

  if (candidatesError) {
    console.error('Erreur requête candidats rappel J-2:', candidatesError)
    return NextResponse.json({ error: candidatesError.message }, { status: 500 })
  }

  const dueEvents = (candidates ?? []).filter(e => daysUntil(e.deadline!) === 2)

  let remindersSent = 0

  for (const event of dueEvents) {
    const groupIds: string[] = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])

    const { data: groupMembers } = groupIds.length > 0
      ? await adminSupabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds)
          .in('status', ['active', 'invited'])
      : { data: [] }

    const baseMemberIds = [...new Set((groupMembers ?? []).map(m => m.user_id))]
    const memberIds: string[] = event.invited_member_ids?.length ? event.invited_member_ids : baseMemberIds
    const extraEmails: string[] = event.extra_emails ?? []

    const { data: submittedRows } = await adminSupabase
      .from('availabilities')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('submitted', true)
    const submittedUserIds = new Set((submittedRows ?? []).map(r => r.user_id))

    const pendingMemberIds = memberIds.filter(id => !submittedUserIds.has(id))
    const { data: pendingMembers } = pendingMemberIds.length > 0
      ? await adminSupabase.from('users').select('id, email').in('id', pendingMemberIds)
      : { data: [] }

    // Les "extra" avec compte existant sont déjà couverts par pendingMembers s'ils
    // ont un user_id lié aux disponibilités ; ceux sans compte n'ont jamais pu
    // soumettre, donc toujours à relancer.
    const { data: extraUsers } = extraEmails.length > 0
      ? await adminSupabase.from('users').select('id, email').in('email', extraEmails)
      : { data: [] }
    const extraUserByEmail = new Map((extraUsers ?? []).map(u => [u.email, u.id]))
    const pendingExtraEmails = extraEmails.filter(email => {
      const uid = extraUserByEmail.get(email)
      return !uid || !submittedUserIds.has(uid)
    })

    const deadlineLabel = new Date(event.deadline!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const eventUrl = `${siteUrl}/event/${event.id}`

    const recipients = [
      ...(pendingMembers ?? []).map(m => m.email),
      ...pendingExtraEmails,
    ]

    for (const to of recipients) {
      sendDeadlineReminderEmail({ to, eventName: event.name, eventUrl, deadlineLabel }).catch(() => {})
      remindersSent++
    }

    await adminSupabase
      .from('events')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', event.id)
  }

  return NextResponse.json({ eventsProcessed: dueEvents.length, remindersSent })
}
