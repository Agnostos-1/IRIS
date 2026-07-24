// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }        = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  // ── Cas spécial : override de contrainte situationnelle ──────────────────
  // Appelé depuis la page activités quand l'utilisateur coche/décoche un override.
  // Stocké par activité : { [activityId]: { [constraintKey]: bool } } — un override
  // ne concerne que l'activité pour laquelle il a été coché, jamais tout l'événement.
  if (body.constraint_override_key !== undefined) {
    const { constraint_override_key, constraint_override_val, activity_id } = body

    if (!activity_id) {
      return NextResponse.json({ error: 'activity_id requis pour un override de contrainte' }, { status: 400 })
    }

    const { data: existing } = await adminSupabase
      .from('availabilities')
      .select('id, constraint_overrides')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const currentOverrides = ((existing?.constraint_overrides ?? {}) as Record<string, Record<string, boolean>>)
    const forActivity = { ...(currentOverrides[activity_id] ?? {}) }
    if (constraint_override_val) {
      forActivity[constraint_override_key] = true
    } else {
      delete forActivity[constraint_override_key]
    }
    const nextOverrides = { ...currentOverrides, [activity_id]: forActivity }

    if (existing) {
      const { error } = await adminSupabase
        .from('availabilities')
        .update({ constraint_overrides: nextOverrides })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // Pas encore de ligne — placeholder pour stocker l'override en attendant les dispos
      const { error } = await adminSupabase
        .from('availabilities')
        .insert({
          event_id:             id,
          user_id:              user.id,
          date:                 '1970-01-01',
          status:               'unavailable',
          probability:          0,
          submitted:            false,
          constraint_overrides: nextOverrides,
        })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  // ── Cas spécial : ajustement de préférence pendant la Phase Activités ────
  // Appelé dès qu'un participant modifie son appréciation d'un type/sous-type sur
  // une carte d'activité. Persisté immédiatement (comme les overrides de contrainte)
  // mais SANS toucher au profil permanent — ça reste une intention locale à cet
  // événement tant que l'utilisateur n'a pas explicitement confirmé la synchro.
  if (body.pref_override_type !== undefined) {
    const { pref_override_type, pref_override_val } = body

    const { data: existing } = await adminSupabase
      .from('availabilities')
      .select('id, pref_overrides')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const currentPrefs = ((existing?.pref_overrides ?? {}) as Record<string, number>)
    const nextPrefs = { ...currentPrefs, [pref_override_type]: pref_override_val }

    if (existing) {
      const { error } = await adminSupabase
        .from('availabilities')
        .update({ pref_overrides: nextPrefs })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await adminSupabase
        .from('availabilities')
        .insert({
          event_id:       id,
          user_id:        user.id,
          date:           '1970-01-01',
          status:         'unavailable',
          probability:    0,
          submitted:      false,
          pref_overrides: nextPrefs,
        })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  // ── Cas normal : soumission des disponibilités ────────────────────────────
  const { statuses, probas, slots, budget, startLat, startLng, startAddress, submitted } = body

  // Récupère les overrides déjà stockés pour les conserver sur chaque ligne
  const { data: existingRows } = await adminSupabase
    .from('availabilities')
    .select('id, date, constraint_overrides, pref_overrides')
    .eq('event_id', id)
    .eq('user_id', user.id)

  const overridesByDate = Object.fromEntries(
    (existingRows ?? []).map(r => [r.date, r.constraint_overrides ?? {}])
  )
  // La ligne placeholder (date=1970-01-01) porte les overrides globaux event-level
  const globalOverrides = overridesByDate['1970-01-01'] ?? {}
  // pref_overrides est event-level (pas par date) — porté par n'importe quelle ligne existante
  const existingPrefOverrides = (existingRows ?? []).find(r => r.pref_overrides && Object.keys(r.pref_overrides).length > 0)?.pref_overrides ?? {}

  const rows = Object.entries(statuses as Record<string, string>).map(([date, status]) => ({
    user_id:              user.id,
    event_id:             id,
    date,
    status,
    probability:          ((probas as Record<string, number>)[date] ?? 70) / 100,
    slot_start:           (slots as Record<string, { start: string; end: string }>)[date]?.start ?? null,
    slot_end:             (slots as Record<string, { start: string; end: string }>)[date]?.end ?? null,
    budget_personal:      budget ?? null,
    start_lat:            startLat ?? null,
    start_lng:            startLng ?? null,
    start_address:        startAddress ?? null,
    submitted:            submitted ?? false,
    constraint_overrides: overridesByDate[date] ?? globalOverrides,
    pref_overrides:       existingPrefOverrides,
  }))

  const { error } = await adminSupabase
    .from('availabilities')
    .upsert(rows, { onConflict: 'user_id,event_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Le fait de soumettre ses disponibilités est un signe d'engagement réel dans
  // l'événement — on promeut le statut du groupe correspondant de 'invited' à
  // 'active' s'il ne l'était pas déjà (autrement la personne reste indéfiniment
  // taguée "invitée" sur le Dashboard/la page Groupe, même après avoir participé).
  const { data: eventRow } = await adminSupabase
    .from('events')
    .select('group_id, group_ids')
    .eq('id', id)
    .single()

  if (eventRow) {
    const eventGroupIds: string[] = eventRow.group_ids?.length ? eventRow.group_ids : (eventRow.group_id ? [eventRow.group_id] : [])
    if (eventGroupIds.length > 0) {
      await adminSupabase
        .from('group_members')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('group_id', eventGroupIds)
        .eq('status', 'invited')
    }
  }

  return NextResponse.json({ ok: true })
}
