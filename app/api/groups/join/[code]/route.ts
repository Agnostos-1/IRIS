// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/groups/join/[code] — vérifie le code et retourne les infos du groupe
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code }      = await params
  const adminSupabase = createAdminClient()

  const { data: group } = await adminSupabase
    .from('groups')
    .select('id, name, description')
    .eq('invite_code', code)
    .single()

  if (!group) return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 404 })

  const { count } = await adminSupabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('status', 'active')

  return NextResponse.json({ group: { ...group, memberCount: count ?? 0 } })
}

// POST /api/groups/join/[code] — rejoint le groupe
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code }      = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: group } = await adminSupabase
    .from('groups')
    .select('id, name')
    .eq('invite_code', code)
    .single()

  if (!group) return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })

  // Déjà membre ?
  const { data: existing } = await adminSupabase
    .from('group_members')
    .select('id, status')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'active') {
    return NextResponse.json({ groupId: group.id, alreadyMember: true })
  }

  if (existing) {
    // Était invité ou rejeté — on réactive
    await adminSupabase
      .from('group_members')
      .update({ status: 'active', joined_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await adminSupabase
      .from('group_members')
      .insert({
        group_id:  group.id,
        user_id:   user.id,
        status:    'active',
        joined_at: new Date().toISOString(),
      })
  }

  return NextResponse.json({ groupId: group.id })
}
