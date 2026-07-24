// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendGroupInviteEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { name, description, emails } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  // Crée le groupe
  const { data: group, error: groupError } = await adminSupabase
    .from('groups')
    .insert({ owner_id: user.id, name: name.trim(), description: description?.trim() || null })
    .select('id, invite_code')
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message }, { status: 500 })
  }

  // Ajoute l'owner comme membre actif
  await adminSupabase.from('group_members').insert({
    group_id: group.id, user_id: user.id,
    status: 'active', joined_at: new Date().toISOString(),
  })

  // Invite les membres existants
  if (emails?.length > 0) {
    const { data: inviter } = await adminSupabase
      .from('users').select('display_name, email').eq('id', user.id).single()
    const inviterName = inviter?.display_name ?? inviter?.email?.split('@')[0] ?? 'Un membre IRIS'
    const joinUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')}/join/group/${group.invite_code}`

    for (const email of emails) {
      const { data: existing } = await adminSupabase
        .from('users').select('id').eq('email', email).single()
      if (existing) {
        await adminSupabase.from('group_members').insert({
          group_id: group.id, user_id: existing.id, status: 'invited',
        })
      }
      sendGroupInviteEmail({
        to: email, inviterName, groupName: name.trim(), joinUrl, isExistingUser: !!existing,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ id: group.id })
}

export async function GET() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Groupes dont je suis owner
  const { data: owned } = await adminSupabase
    .from('groups')
    .select('id, name, description, created_at, group_members(user_id, status, users(id, display_name, email))')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Groupes dont je suis membre actif
  const { data: memberships } = await adminSupabase
    .from('group_members')
    .select('group_id, groups(id, name, description, owner_id, group_members(user_id, status, users(id, display_name, email)))')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return NextResponse.json({ owned: owned ?? [], memberships: memberships ?? [] })
}