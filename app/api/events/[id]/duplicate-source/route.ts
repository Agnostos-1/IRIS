// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── GET /api/events/[id]/duplicate-source ─────────────────────────────────────
// Détail complet nécessaire pour préremplir le formulaire de création à partir
// d'un événement existant : sa configuration (nom, description, groupes, budget)
// et ses activités (pour copie ultérieure par la route de création elle-même).

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: event } = await adminSupabase
    .from('events')
    .select('id, name, description, created_by, group_ids, group_id, invited_member_ids, extra_emails, location, location_mode, open_invite, budget_global, budget_overrun_pct, budget_visible, quorum')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  // Ouvert à tout participant de l'événement, pas seulement l'organisateur d'origine —
  // dupliquer un événement auquel on a pris part est légitime (nom, description, lieu,
  // groupes sont déjà visibles à tous). Seule la visibilité du budget est respectée
  // séparément ci-dessous, la vraie donnée sensible ici.
  const isOrganizer = event.created_by === user.id
  if (!isOrganizer) {
    const groupIdsForCheck: string[] = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])
    const { data: membership } = groupIdsForCheck.length > 0
      ? await adminSupabase.from('group_members').select('user_id').eq('user_id', user.id).in('group_id', groupIdsForCheck).limit(1).maybeSingle()
      : { data: null }
    const isInvitedMember = event.invited_member_ids?.includes(user.id) ?? false
    const isExtra = (event.extra_emails ?? []).includes(user.email ?? '')
    const { data: hasAvailability } = await adminSupabase
      .from('availabilities').select('id').eq('event_id', eventId).eq('user_id', user.id).limit(1).maybeSingle()

    if (!membership && !isInvitedMember && !isExtra && !hasAvailability) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
  }

  const { count: activityCount } = await adminSupabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  // Le budget n'est renvoyé que si visible publiquement, ou si le demandeur est
  // l'organisateur d'origine — sinon ça révélerait un montant que celui-ci avait
  // délibérément choisi de cacher aux autres participants.
  const revealBudget = isOrganizer || event.budget_visible

  // Renvoie TOUS les groupes de l'événement source — y compris ceux auxquels je
  // n'appartiens pas — avec leur liste de membres, pour qu'ils restent de vrais
  // groupes dans le nouvel événement (avec exclusion individuelle possible),
  // plutôt que d'être aplatis en participants individuels. Ça préserve le suivi
  // Rᵢ par groupe pour tout le monde, y compris ceux du groupe "étranger" — je ne
  // gère jamais directement ce groupe, je décide juste qui participe à MON événement,
  // exactement comme pour n'importe quel groupe que j'administre moi-même.
  const sourceGroupIds: string[] = event.group_ids?.length ? event.group_ids : (event.group_id ? [event.group_id] : [])
  const { data: sourceGroupsRaw } = sourceGroupIds.length > 0
    ? await adminSupabase
        .from('groups')
        .select('id, name, group_members(user_id, status, users(id, display_name, email))')
        .in('id', sourceGroupIds)
    : { data: [] }

  type RawMember = { user_id: string; status: string; users: { id: string; display_name: string | null; email: string } | null }
  const groupDetails = (sourceGroupsRaw ?? []).map(g => {
    const seen = new Set<string>()
    const members: { id: string; displayName: string; email: string }[] = []
    for (const m of (g.group_members as unknown as RawMember[] ?? [])) {
      if (!m.users || !['active', 'invited'].includes(m.status) || seen.has(m.users.id)) continue
      seen.add(m.users.id)
      members.push({ id: m.users.id, displayName: m.users.display_name ?? m.users.email.split('@')[0], email: m.users.email })
    }
    return { id: g.id, name: g.name, members }
  })

  const sourceExtraEmails = (event.extra_emails ?? []).filter((e: string) => e !== user.email)

  return NextResponse.json({
    name:             event.name,
    description:      event.description,
    groupIds:         sourceGroupIds,
    groupDetails,
    extraEmails:      sourceExtraEmails,
    location:         event.location,
    locationMode:     event.location_mode,
    openInvite:       event.open_invite,
    budgetGlobal:     revealBudget ? event.budget_global : null,
    budgetOverrunPct: revealBudget ? event.budget_overrun_pct : null,
    budgetVisible:    event.budget_visible,
    quorum:           event.quorum,
    activityCount:    activityCount ?? 0,
  })
}
