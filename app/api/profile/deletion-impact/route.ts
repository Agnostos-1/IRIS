// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── GET /api/profile/deletion-impact ──────────────────────────────────────────
// Liste tout ce qui nécessite un transfert avant suppression du compte : groupes
// dont je suis propriétaire, et événements que j'organise et qui ne sont ni
// conclus (phase 7) ni annulés. Pour chaque groupe/événement, propose aussi la
// liste des candidats possibles pour reprendre la main.

export async function GET() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Groupes dont je suis propriétaire
  const { data: ownedGroups } = await adminSupabase
    .from('groups')
    .select('id, name')
    .eq('owner_id', user.id)

  const groups = await Promise.all((ownedGroups ?? []).map(async (g) => {
    const { data: candidates } = await adminSupabase
      .from('group_members')
      .select('user_id, users(id, display_name, email)')
      .eq('group_id', g.id)
      .eq('status', 'active')
      .neq('user_id', user.id)
    return {
      id:   g.id,
      name: g.name,
      candidates: (() => {
        const seen = new Set<string>()
        return (candidates ?? [])
          .map(c => c.users as unknown as { id: string; display_name: string | null; email: string } | null)
          .filter((u): u is { id: string; display_name: string | null; email: string } => !!u)
          .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true })
          .map(u => ({ id: u.id, displayName: u.display_name ?? u.email.split('@')[0] }))
      })(),
    }
  }))

  // Événements que j'organise, ni conclus ni annulés
  const { data: ownedEvents } = await adminSupabase
    .from('events')
    .select('id, name, phase, cancelled_at, group_id, group_ids, invited_member_ids')
    .eq('created_by', user.id)
    .is('cancelled_at', null)
    .lt('phase', 7)

  const events = await Promise.all((ownedEvents ?? []).map(async (ev) => {
    const groupIds: string[] = ev.group_ids?.length ? ev.group_ids : (ev.group_id ? [ev.group_id] : [])
    const { data: members } = groupIds.length > 0
      ? await adminSupabase.from('group_members').select('user_id, users(id, display_name, email)').in('group_id', groupIds).eq('status', 'active')
      : { data: [] }
    const memberIds = ev.invited_member_ids?.length ? new Set(ev.invited_member_ids) : null
    const seen = new Set<string>()
    const candidates = (members ?? [])
      .filter(m => (!memberIds || memberIds.has(m.user_id)) && m.user_id !== user.id)
      .map(m => m.users as unknown as { id: string; display_name: string | null; email: string } | null)
      .filter((u): u is { id: string; display_name: string | null; email: string } => !!u)
      .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true })
      .map(u => ({ id: u.id, displayName: u.display_name ?? u.email.split('@')[0] }))
    return { id: ev.id, name: ev.name, candidates }
  }))

  return NextResponse.json({ groups, events })
}
