// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── DELETE /api/profile/delete ────────────────────────────────────────────────
// Ne supprime jamais le compte ni son historique — réinitialise le profil
// (nom, préférences, contraintes) mais garde le Rᵢ et l'historique de compensation
// intacts, rattachés au même compte. La personne peut se reconnecter normalement
// plus tard avec le même email ; elle retrouvera juste un profil à reconfigurer,
// pas un Rᵢ remis à zéro par un aller-retour suppression/réinscription.
//
// body attendu : { groupTransfers: {groupId, newOwnerId}[], eventTransfers: {eventId, newOrganizerId}[] }

export async function DELETE(request: Request) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { groupTransfers, eventTransfers } = await request.json().catch(() => ({ groupTransfers: [], eventTransfers: [] }))

  // Vérifie que tout ce qui nécessite un transfert en a bien un avant de continuer —
  // pas question de laisser un groupe ou un événement orphelin.
  const { data: ownedGroups } = await adminSupabase.from('groups').select('id').eq('owner_id', user.id)
  const { data: ownedEvents } = await adminSupabase
    .from('events').select('id').eq('created_by', user.id).is('cancelled_at', null).lt('phase', 7)

  const transferredGroupIds = new Set((groupTransfers ?? []).map((t: { groupId: string }) => t.groupId))
  const transferredEventIds = new Set((eventTransfers ?? []).map((t: { eventId: string }) => t.eventId))

  const missingGroup = (ownedGroups ?? []).find(g => !transferredGroupIds.has(g.id))
  const missingEvent = (ownedEvents ?? []).find(e => !transferredEventIds.has(e.id))
  if (missingGroup || missingEvent) {
    return NextResponse.json({ error: 'Certains groupes ou événements que vous possédez n\'ont pas de transfert prévu.' }, { status: 400 })
  }

  // Applique les transferts
  for (const t of (groupTransfers ?? [])) {
    await adminSupabase.from('groups').update({ owner_id: t.newOwnerId }).eq('id', t.groupId).eq('owner_id', user.id)
  }
  for (const t of (eventTransfers ?? [])) {
    await adminSupabase.from('events').update({ created_by: t.newOrganizerId }).eq('id', t.eventId).eq('created_by', user.id)
  }

  // Réinitialise le profil — le Rᵢ (utility_history) et l'historique de disponibilités/
  // activités ne sont volontairement PAS touchés, pour ne jamais permettre de repartir
  // à un coefficient neutre via un aller-retour suppression/réinscription.
  const { error } = await adminSupabase
    .from('users')
    .update({
      display_name:     null,
      activity_prefs:    {},
      hard_constraints:  {},
      home_lat:          null,
      home_lng:          null,
      zone:              null,
      transport:         null,
      budget:            null,
      onboarding_done:   false,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
