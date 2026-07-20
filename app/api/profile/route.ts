// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { computeFairnessBreakdown } from '@/lib/iris/pareto-engine'

export async function GET() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await adminSupabase
    .from('users')
    .select('display_name, zone, home_lat, home_lng, transport, distance_max, budget, social_level, weights, hard_constraints, activity_prefs, onboarding_done')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  // Coefficient d'équité global (toutes participations confondues, tous groupes)
  const fairness = await computeFairnessBreakdown(adminSupabase, user.id)

  return NextResponse.json({
    ...profile,
    fairness: { riGlobal: fairness.riGlobal, hasHistory: fairness.hasHistory },
  })
}

export async function PATCH(request: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()

  // Normalise les types d'activités personnalisés :
  // trim + première lettre majuscule + reste en minuscule sur chaque mot
  const rawPrefs = body.activity_prefs ?? {}
  const normalizedPrefs: Record<string, number> = {}
  for (const [key, val] of Object.entries(rawPrefs)) {
    const normalized = key
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    normalizedPrefs[normalized] = val as number
  }

  const { error } = await adminSupabase
    .from('users')
    .update({
      display_name:     body.display_name ?? null,
      zone:             body.zone,
      home_lat:         body.home_lat ?? null,
      home_lng:         body.home_lng ?? null,
      transport:        body.transport,
      distance_max:     body.distance_max,
      budget:           body.budget,
      social_level:     body.social_level,
      weights:          body.weights,
      hard_constraints: body.hard_constraints,
      activity_prefs:   normalizedPrefs,
      onboarding_done:  body.onboarding_done ?? true,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
