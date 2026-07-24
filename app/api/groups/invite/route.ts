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

  const { groupId, email } = await request.json()
  if (!groupId || !email) {
    return NextResponse.json({ error: 'groupId et email requis' }, { status: 400 })
  }

  // Vérifie que l'appelant est bien owner du groupe
  const { data: group } = await adminSupabase
    .from('groups')
    .select('owner_id, name, invite_code')
    .eq('id', groupId)
    .single()

  if (!group || group.owner_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data: inviter } = await adminSupabase
    .from('users')
    .select('display_name, email')
    .eq('id', user.id)
    .single()
  const inviterName = inviter?.display_name ?? inviter?.email?.split('@')[0] ?? 'Un membre IRIS'
  const joinUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')}/join/group/${group.invite_code}`

  // Cherche si cet email a déjà un compte IRIS
  const { data: existing } = await adminSupabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    // Vérifie s'il est déjà membre
    const { data: alreadyMember } = await adminSupabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', existing.id)
      .single()

    if (alreadyMember) {
      return NextResponse.json({ error: 'Ce membre est déjà dans le groupe.' }, { status: 409 })
    }

    // Ajoute comme invité
    const { error } = await adminSupabase.from('group_members').insert({
      group_id:  groupId,
      user_id:   existing.id,
      status:    'invited',
      invited_at: new Date().toISOString(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    sendGroupInviteEmail({
      to: email, inviterName, groupName: group.name, joinUrl, isExistingUser: true,
    }).catch(() => {})

    return NextResponse.json({ existing: true })
  }

  // Email inconnu — aucune ligne à créer (rien à rattacher tant que la personne n'a
  // pas de compte) ; elle rejoindra le groupe elle-même via ce lien après inscription.
  sendGroupInviteEmail({
    to: email, inviterName, groupName: group.name, joinUrl, isExistingUser: false,
  }).catch(() => {})

  return NextResponse.json({ existing: false, pending: true })
}
