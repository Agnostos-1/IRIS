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

  const { selectedDate, force, groupAction } = await req.json()
  // selectedDate : { label, date, startTime, endTime, window }
  // groupAction  : null | { type: 'existing', groupId: string } | { type: 'new', groupName: string }

  // Vérifie que l'appelant est bien l'organisateur
  const { data: ev } = await adminSupabase
    .from('events')
    .select('created_by, phase, group_id, group_ids, invited_member_ids, extra_emails')
    .eq('id', id)
    .single()

  if (!ev) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (ev.created_by !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  if (ev.phase !== 2) return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })

  const groupIds: string[] = ev.group_ids?.length ? ev.group_ids : (ev.group_id ? [ev.group_id] : [])
  const { data: members } = groupIds.length > 0
    ? await adminSupabase.from('group_members').select('user_id').in('group_id', groupIds)
    : { data: [] }
  const groupBasedIds = ev.invited_member_ids?.length
    ? ev.invited_member_ids
    : [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))]

  // Résout les emails "extra" (invités hors groupe, par email ou par lien) vers des
  // comptes existants — sans ça, quelqu'un comme Carole (invitée par email, compte
  // existant) n'est jamais compté ni dans le total, ni parmi les non-répondants.
  const extraEmailsList: string[] = ev.extra_emails ?? []
  const { data: extraAccounts } = extraEmailsList.length > 0
    ? await adminSupabase.from('users').select('id').in('email', extraEmailsList)
    : { data: [] }
  const extraAccountIds = (extraAccounts ?? []).map(u => u.id)
  const memberIds = [...new Set([...groupBasedIds, ...extraAccountIds])]

  // Avertissement (pas un blocage) si tout le monde n'a pas encore répondu — la cause
  // la plus fréquente du "soft lock" est une clôture trop hâtive, avant que le reste
  // du groupe ait eu l'occasion de soumettre ses disponibilités.
  if (!force) {
    const { data: submittedRows } = await adminSupabase
      .from('availabilities')
      .select('user_id')
      .eq('event_id', id)
      .eq('submitted', true)
      .neq('date', '1970-01-01')
    const submittedIds = new Set((submittedRows ?? []).map(r => r.user_id))

    const missingCount = memberIds.filter((uid: string) => !submittedIds.has(uid)).length
    if (missingCount > 0) {
      return NextResponse.json({
        needsConfirmation: true,
        missingCount,
        totalCount: memberIds.length,
      }, { status: 200 })
    }
  }

  // Extras ayant répondu — quiconque a soumis une disponibilité pour cet événement
  // mais n'appartient à aucun groupe de l'événement. Uniquement ceux qui ont
  // effectivement répondu : parmi les non-répondants, beaucoup n'ont probablement
  // pas de compte, impossible de les rattacher à un groupe à ce stade.
  // Utilise groupBasedIds (avant fusion des extras) : memberIds les inclut déjà pour
  // le compte "non-répondants" ci-dessus, mais ici on a justement besoin de détecter
  // ceux qui n'appartiennent PAS encore à un groupe — les compter comme "connus" via
  // memberIds ferait disparaître la pop-up de rattachement à tort.
  const allKnownIds = new Set(groupBasedIds)
  const { data: allSubmittedRows } = await adminSupabase
    .from('availabilities')
    .select('user_id')
    .eq('event_id', id)
    .neq('date', '1970-01-01')
  const respondedIds = [...new Set((allSubmittedRows ?? []).map(r => r.user_id))]
  const extraIds = respondedIds.filter(uid => !allKnownIds.has(uid))

  if (extraIds.length > 0 && !groupAction) {
    const { data: extraUsers } = await adminSupabase
      .from('users')
      .select('id, display_name, email')
      .in('id', extraIds)
    const { data: ownedGroups } = await adminSupabase
      .from('groups')
      .select('id, name')
      .eq('owner_id', user.id)

    return NextResponse.json({
      needsGroupAssignment: true,
      extras: (extraUsers ?? []).map(u => ({ id: u.id, displayName: u.display_name ?? u.email.split('@')[0], email: u.email })),
      ownedGroups: ownedGroups ?? [],
    }, { status: 200 })
  }

  // Applique le choix (rejoindre un groupe existant, en créer un, ou ne rien changer)
  if (extraIds.length > 0 && groupAction && groupAction.type !== 'none') {
    let targetGroupId: string

    if (groupAction.type === 'new') {
      const { data: newGroup, error: groupError } = await adminSupabase
        .from('groups')
        .insert({ owner_id: user.id, name: groupAction.groupName, description: null })
        .select('id')
        .single()
      if (groupError || !newGroup) return NextResponse.json({ error: groupError?.message ?? 'Erreur création groupe' }, { status: 500 })
      targetGroupId = newGroup.id
      await adminSupabase.from('group_members').insert({
        group_id: targetGroupId, user_id: user.id, status: 'active', joined_at: new Date().toISOString(),
      })
    } else {
      targetGroupId = groupAction.groupId
    }

    const newMemberRows = extraIds.map(uid => ({
      group_id: targetGroupId, user_id: uid, status: 'active', joined_at: new Date().toISOString(),
    }))
    await adminSupabase.from('group_members').upsert(newMemberRows, { onConflict: 'group_id,user_id' })

    if (!groupIds.includes(targetGroupId)) {
      await adminSupabase.from('events').update({ group_ids: [...groupIds, targetGroupId] }).eq('id', id)
    }
  }

  // Passe en phase 3 et verrouille la date retenue
  const { error } = await adminSupabase
    .from('events')
    .update({
      phase:         3,
      selected_date: selectedDate,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
