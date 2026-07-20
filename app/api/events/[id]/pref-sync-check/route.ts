// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── GET /api/events/[id]/pref-sync-check ──────────────────────────────────────
// Détecte si le participant courant a des ajustements de préférence (faits pendant
// la Phase Activités, désormais clôturée) qui diffèrent de son profil permanent
// actuel. Utilisé pour proposer la même synchro qu'à l'organisateur, mais à la
// prochaine visite plutôt qu'au moment de la clôture (que ce participant ne
// contrôle pas).

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
    .select('phase')
    .eq('id', eventId)
    .single()

  // Rien à proposer tant que la phase Activités (3) n'est pas clôturée (phase >= 4)
  if (!event || event.phase < 4) {
    return NextResponse.json({ diffs: [] })
  }

  const { data: rows } = await adminSupabase
    .from('availabilities')
    .select('pref_overrides')
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  const prefOverrides: Record<string, number> = {}
  for (const row of (rows ?? [])) {
    Object.assign(prefOverrides, row.pref_overrides ?? {})
  }

  if (Object.keys(prefOverrides).length === 0) {
    return NextResponse.json({ diffs: [] })
  }

  const { data: profile } = await adminSupabase
    .from('users')
    .select('activity_prefs')
    .eq('id', user.id)
    .single()

  const currentPrefs = (profile?.activity_prefs ?? {}) as Record<string, number>

  const diffs = Object.entries(prefOverrides)
    .filter(([type, newVal]) => (currentPrefs[type] ?? null) !== newVal)
    .map(([type, newVal]) => ({ type, oldVal: currentPrefs[type] ?? null, newVal }))

  return NextResponse.json({ diffs })
}

// ─── POST /api/events/[id]/pref-sync-check ─────────────────────────────────────
// Marque la synchro comme traitée pour ce participant (accepté, partiellement
// accepté, ou explicitement ignoré) — dans tous les cas, on efface les
// pref_overrides en attente pour ne plus reproposer la même invite à chaque visite.

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { error } = await adminSupabase
    .from('availabilities')
    .update({ pref_overrides: {} })
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
