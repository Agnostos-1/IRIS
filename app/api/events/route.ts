// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const {
    name, description, groupIds, location, locationMode,
    extraEmails, openInvite, proposedDates, quorum, budgetGlobal, budgetOverrunPct, budgetVisible,
    invitedMemberIds, sourceEventId,
  } = await request.json()

  if (!name?.trim())       return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!groupIds?.length)   return NextResponse.json({ error: 'Au moins un groupe requis' }, { status: 400 })
  if (!proposedDates?.length) return NextResponse.json({ error: 'Au moins une date requise' }, { status: 400 })

  const primaryGroupId = groupIds[0]

  const { data: event, error } = await adminSupabase
    .from('events')
    .insert({
      group_id:       primaryGroupId,
      group_ids:      groupIds,
      name:           name.trim(),
      description:    description || null,
      location:       location || null,
      location_mode:  locationMode || 'zone',
      extra_emails:   extraEmails || [],
      open_invite:    openInvite || false,
      phase:          2,
      proposed_dates: proposedDates,
      quorum:         quorum || null,
      budget_global:      budgetGlobal || null,
      budget_overrun_pct: budgetOverrunPct ?? 0,
      budget_visible:     budgetVisible ?? true,
      invited_member_ids: invitedMemberIds ?? null,
      created_by:     user.id,
    })
    .select('id, invite_code')
    .single()

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? 'Erreur création' }, { status: 500 })
  }

  // Duplication d'un événement existant — copie ses activités dans le nouvel
  // événement, en attribuant TOUTES à l'organisateur actuel (peu importe qui les
  // avait proposées à l'origine), pour qu'il puisse librement les éditer/supprimer.
  if (sourceEventId) {
    const { data: sourceActivities } = await adminSupabase
      .from('activities')
      .select('name, type, type_parent, address, address_lat, address_lng, duration_minutes, cost_per_person, opening_hours, social_level, no_stairs, pets_allowed, is_intense, is_high_altitude, is_aquatic, is_loud, has_strobe, smoke_free, has_pets, gluten_ok, seafood_ok, halal_ok, alcohol_free, pregnancy_ok, kid_ok, vegan_ok, nut_ok, diab_ok')
      .eq('event_id', sourceEventId)

    if (sourceActivities?.length) {
      const copies = sourceActivities.map(a => ({ ...a, event_id: event.id, suggested_by: user.id }))
      const { error: copyError } = await adminSupabase.from('activities').insert(copies)
      if (copyError) {
        console.error('Duplication événement — échec de la copie des activités:', copyError)
      }
    }
  }

  return NextResponse.json({ id: event.id, invite_code: event.invite_code })
}