// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── GET /api/activity-subtypes?parent=Restaurant&q=jap ──────────────────────
// Autocomplete scopée au type parent choisi. Met en avant les sous-types déjà
// présents dans le profil de l'utilisateur (déjà rencontrés/notés par lui),
// pour favoriser la réutilisation plutôt que la création de quasi-doublons.

export async function GET(req: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parent = searchParams.get('parent')?.trim()
  const q      = searchParams.get('q')?.trim() ?? ''

  if (!parent) return NextResponse.json({ error: 'Paramètre "parent" requis' }, { status: 400 })

  let query = adminSupabase
    .from('activity_subtypes')
    .select('id, name, parent_type')
    .eq('parent_type', parent)
    .order('name', { ascending: true })
    .limit(20)

  if (q.length > 0) query = query.ilike('name', `%${q}%`)

  const { data: subtypes, error } = await query
  if (error) {
    console.error('GET /api/activity-subtypes — échec de la recherche:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: profile } = await adminSupabase
    .from('users')
    .select('activity_prefs')
    .eq('id', user.id)
    .single()

  const myPrefs = (profile?.activity_prefs ?? {}) as Record<string, number>

  const results = (subtypes ?? [])
    .map(s => ({ id: s.id, name: s.name, parentType: s.parent_type, isLocal: myPrefs[s.name] !== undefined }))
    .sort((a, b) => (a.isLocal === b.isLocal) ? 0 : a.isLocal ? -1 : 1) // sous-types déjà locaux en premier

  return NextResponse.json({ subtypes: results })
}

// ─── POST /api/activity-subtypes ───────────────────────────────────────────────
// Enregistre un nouveau sous-type dans le catalogue global. Utilisé depuis la page
// Profil (ajout direct, sans passer par la création d'une activité) — la création
// depuis la page Activités s'enregistre elle-même directement dans sa propre route.

export async function POST(req: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parentType = body.parent_type?.trim()
  const name        = body.name?.trim()

  if (!parentType || !name) {
    return NextResponse.json({ error: 'parent_type et name requis' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('activity_subtypes')
    .insert({ parent_type: parentType, name, created_by: user.id })

  // Un conflit d'unicité (23505) n'est pas une erreur ici — le sous-type existe déjà,
  // c'est exactement le cas normal de réutilisation.
  if (error && error.code !== '23505') {
    console.error('POST /api/activity-subtypes — échec de l\'enregistrement:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
