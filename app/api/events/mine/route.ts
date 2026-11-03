// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// ─── GET /api/events/mine ──────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Liste les événements auxquels j'ai pris part d'une façon ou d'une autre — organisé,
// membre d'un groupe lié, invité nommément, ou extra par email — pour le sélecteur
// "Dupliquer un événement existant" à la création. N'importe quel participant peut
// dupliquer, pas seulement l'organisateur d'origine (le budget masqué reste protégé
// séparément par la route duplicate-source elle-même).

export async function GET(req: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const { data: ownedGroups } = await adminSupabase.from('groups').select('id').eq('owner_id', user.id)
  const { data: memberGroups } = await adminSupabase.from('group_members').select('group_id').eq('user_id', user.id).in('status', ['active', 'invited'])
  const myGroupIds = [...new Set([...(ownedGroups ?? []).map(g => g.id), ...(memberGroups ?? []).map(m => m.group_id)])]

  let query = adminSupabase
    .from('events')
    .select('id, name, phase, selected_date, proposed_dates, created_at, created_by, group_id, group_ids, invited_member_ids, extra_emails, groups(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (q.length > 0) query = query.ilike('name', `%${q}%`)

  const { data: rawEvents, error } = await query
  if (error) {
    console.error('GET /api/events/mine — échec:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  function toIdArray(v: unknown): string[] {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return []
  }

  const events = (rawEvents ?? []).filter(e => {
    if (e.created_by === user.id) return true
    if (e.group_id && myGroupIds.includes(e.group_id)) return true
    if (toIdArray(e.group_ids).some(gid => myGroupIds.includes(gid))) return true
    if (e.invited_member_ids?.includes(user.id)) return true
    if (user.email && (e.extra_emails ?? []).includes(user.email)) return true
    return false
  }).slice(0, 30)

  const results = events.map(e => {
    const selectedDate = e.selected_date as { date?: string; label?: string } | null
    const firstProposed = Array.isArray(e.proposed_dates) && e.proposed_dates.length > 0
      ? (typeof e.proposed_dates[0] === 'string' ? e.proposed_dates[0] : (e.proposed_dates[0] as { date?: string })?.date)
      : null
    return {
      id:        e.id,
      name:      e.name,
      groupName: (e.groups as unknown as { name: string } | null)?.name ?? null,
      dateLabel: selectedDate?.label ?? selectedDate?.date ?? firstProposed ?? null,
      // Ajouté pour la liste de l'application : la phase est le repère central
      // d'IRIS. Le sélecteur de duplication, seul autre consommateur, l'ignore.
      phase:     (e.phase as number) ?? 0,
    }
  })

  return NextResponse.json({ events: results })
}
