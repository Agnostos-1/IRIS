// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// PUT /api/events/[id]/activities/[activityId]
// Modifie une activité existante (uniquement par son créateur)

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  const { id: eventId, activityId } = await params
  const supabase                    = await createClient()
  const adminSupabase               = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Vérifie que l'activité appartient bien à cet utilisateur
  const { data: existing } = await adminSupabase
    .from('activities')
    .select('id, suggested_by, event_id')
    .eq('id', activityId)
    .eq('event_id', eventId)
    .single()

  if (!existing)                        return NextResponse.json({ error: 'Activité introuvable' },  { status: 404 })
  if (existing.suggested_by !== user.id) return NextResponse.json({ error: 'Non autorisé' },          { status: 403 })

  const body = await req.json()

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!body.type?.trim()) return NextResponse.json({ error: 'Type requis' }, { status: 400 })

  const { data, error } = await adminSupabase
    .from('activities')
    .update({
      name:             body.name.trim(),
      type:             body.type.trim(),
      address:          body.address          ?? null,
      address_lat:      body.address_lat      ?? null,
      address_lng:      body.address_lng      ?? null,
      duration_minutes: body.duration_minutes ?? null,
      cost_per_person:  body.cost_per_person  ?? 0,
      opening_hours:    body.opening_hours    ?? null,
      social_level:     body.social_level     ?? 3,
      no_stairs:        body.no_stairs        ?? true,
      pets_allowed:     body.pets_allowed     ?? false,
      is_intense:       body.is_intense       ?? false,
      is_high_altitude: body.is_high_altitude ?? false,
      is_aquatic:       body.is_aquatic       ?? false,
      is_loud:          body.is_loud          ?? false,
      has_strobe:       body.has_strobe       ?? false,
      smoke_free:       body.smoke_free       ?? true,
      has_pets:         body.has_pets         ?? false,
      gluten_ok:        body.gluten_ok        ?? true,
      seafood_ok:       body.seafood_ok       ?? true,
      halal_ok:         body.halal_ok         ?? false,
      alcohol_free:     body.alcohol_free     ?? false,
      pregnancy_ok:     body.pregnancy_ok     ?? true,
      kid_ok:           body.kid_ok           ?? true,
      vegan_ok:         body.vegan_ok         ?? true,
      nut_ok:           body.nut_ok           ?? true,
      diab_ok:          body.diab_ok          ?? true,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', activityId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activity: data })
}

// DELETE /api/events/[id]/activities/[activityId]
// Supprime une activité (uniquement par son créateur, phase < 3)

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  const { id: eventId, activityId } = await params
  const supabase                    = await createClient()
  const adminSupabase               = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Vérifie ownership et phase
  const { data: existing } = await adminSupabase
    .from('activities')
    .select('id, suggested_by, event_id')
    .eq('id', activityId)
    .eq('event_id', eventId)
    .single()

  if (!existing)                         return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 })
  if (existing.suggested_by !== user.id) return NextResponse.json({ error: 'Non autorisé' },         { status: 403 })

  // Vérifie que l'événement est encore en phase 1 ou 2
  const { data: event } = await adminSupabase
    .from('events')
    .select('phase')
    .eq('id', eventId)
    .single()

  if (event && event.phase >= 3) {
    return NextResponse.json({ error: 'Phase clôturée — suppression impossible' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
