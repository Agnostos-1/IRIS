// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── GET /api/events/[id]/activities ─────────────────────────────────────────
// Retourne :
//   - la liste des activités de l'événement
//   - les préférences de groupe (top 5 types)
//   - le profil du user courant (activity_prefs, hard_constraints, home_lat/lng)
//   - la disponibilité du user pour chaque activité (si phase 1 non clôturée)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // ── Événement ──────────────────────────────────────────────────────────────
  const { data: event } = await adminSupabase
    .from('events')
    .select('id, name, phase, proposed_dates, group_ids, budget_global, invited_member_ids, location, created_by, selected_date')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  // ── Activités ──────────────────────────────────────────────────────────────
  const { data: activities } = await adminSupabase
    .from('activities')
    .select(`
      id, name, type, type_parent, address, address_lat, address_lng,
      duration_minutes, cost_per_person, suggested_by,
      social_level, no_stairs, pets_allowed, is_intense,
      is_high_altitude, is_aquatic, is_loud, has_strobe,
      smoke_free, has_pets, gluten_ok, seafood_ok,
      halal_ok, alcohol_free, pregnancy_ok,
      kid_ok, vegan_ok, nut_ok, diab_ok,
      opening_hours, created_at
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  // ── Profil user courant ────────────────────────────────────────────────────
  const { data: userProfile } = await adminSupabase
    .from('users')
    .select('display_name, activity_prefs, hard_constraints, home_lat, home_lng, onboarding_done')
    .eq('id', user.id)
    .single()

  // ── Participants avec profil (pour suggestion groupe) ──────────────────────
  // Participants = membres des groupes de l'événement + disponibilités soumises
  const groupIds: string[] = event.group_ids ?? []

  // Récupère tous les membres des groupes concernés
  const { data: groupMembers } = groupIds.length > 0
    ? await adminSupabase
        .from('group_members')
        .select('user_id')
        .in('group_id', groupIds)
    : { data: [] }

  const memberIds = event.invited_member_ids?.length
    ? event.invited_member_ids
    : [...new Set((groupMembers ?? []).map((m: { user_id: string }) => m.user_id))]

  // Restreint aux participants réels, pas la liste théorique des invités — le sens
  // de "réel" dépend de la phase : avant clôture des disponibilités, quiconque a
  // répondu 'ok'/'conditionnel' à au moins une date ; après, uniquement ceux
  // disponibles sur la date effectivement retenue.
  let actualParticipantIds: string[] = memberIds
  if (memberIds.length > 0) {
    if (event.phase >= 3 && event.selected_date) {
      const selectedDateStr = (event.selected_date as { date?: string })?.date
      const { data: respondedRows } = await adminSupabase
        .from('availabilities')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('date', selectedDateStr)
        .in('status', ['ok', 'cond'])
        .in('user_id', memberIds)
      actualParticipantIds = [...new Set((respondedRows ?? []).map(r => r.user_id))]
    } else {
      const { data: respondedRows } = await adminSupabase
        .from('availabilities')
        .select('user_id')
        .eq('event_id', eventId)
        .neq('date', '1970-01-01')
        .in('status', ['ok', 'cond'])
        .in('user_id', memberIds)
      actualParticipantIds = [...new Set((respondedRows ?? []).map(r => r.user_id))]
    }
  }

  // Profils des participants ayant rempli leurs préférences au moins une fois
  const { data: participantProfiles } = actualParticipantIds.length > 0
    ? await adminSupabase
        .from('users')
        .select('id, activity_prefs, hard_constraints, home_lat, home_lng')
        .in('id', actualParticipantIds)
        .eq('onboarding_done', true)
    : { data: [] }

  // ── Disponibilités du user (pour afficher si dispo pour une activité) ──────
  const { data: userAvailabilities } = await adminSupabase
    .from('availabilities')
    .select('date, slot_start, slot_end, status, constraint_overrides, pref_overrides')
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  // Sous-types connus et leur type parent — nécessaire pour éviter qu'un sous-type
  // et son parent apparaissent comme deux entrées concurrentes redondantes ci-dessous,
  // et réutilisé plus bas pour knownSubtypeNames.
  const { data: subtypeRows } = await adminSupabase.from('activity_subtypes').select('name, parent_type')
  const subtypeParentByName = new Map((subtypeRows ?? []).map(r => [r.name, r.parent_type]))

  // ── Top 5 types d'activités préférés du groupe ─────────────────────────────
  // Un sous-type personnalisé n'est pas forcément noté par tout le monde (il vient
  // d'être créé par un seul membre) : pour qui n'a pas de valeur explicite, on retombe
  // sur sa préférence pour le TYPE PARENT (tout profil ayant terminé l'onboarding en a
  // toujours une, cf. app/profile/page.tsx) — ex. quelqu'un qui a "Parapente" en sous-type
  // de "Sport" mais n'a pas encore noté le parapente contribue avec sa note de Sport.
  // Chaque type/sous-type est ainsi moyenné sur le même nombre de participants, ce qui
  // évite qu'un sous-type flambant neuf noté 100% par une seule personne écrase des types
  // établis notés par tout le groupe.
  const profiles = participantProfiles ?? []
  const candidateTypes = new Set<string>()
  for (const profile of profiles) {
    const prefs = (profile.activity_prefs ?? {}) as Record<string, number>
    for (const type of Object.keys(prefs)) candidateTypes.add(type)
  }
  const ranked = [...candidateTypes]
    .map(type => {
      const parent = subtypeParentByName.get(type)
      const vals: number[] = []
      for (const profile of profiles) {
        const prefs = (profile.activity_prefs ?? {}) as Record<string, number>
        const value = prefs[type] ?? (parent ? prefs[parent] : undefined)
        if (value !== undefined) vals.push(value)
      }
      return {
        type,
        avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0,
        count: vals.length,
      }
    })
    .sort((a, b) => b.avg - a.avg)

  // Un sous-type et son type parent ne doivent pas concourir comme deux entrées
  // distinctes : on ne garde que le mieux noté des deux.
  const avgByType = new Map(ranked.map(t => [t.type, t.avg]))
  const excludedTypes = new Set<string>()
  for (const t of ranked) {
    const parent = subtypeParentByName.get(t.type)
    if (!parent) continue
    const parentAvg = avgByType.get(parent)
    if (parentAvg === undefined) continue
    excludedTypes.add(t.avg >= parentAvg ? parent : t.type)
  }
  const groupTopTypes = ranked.filter(t => !excludedTypes.has(t.type)).slice(0, 5)

  // ── Dérogations par activité de tous les participants réels ────────────────
  // Nécessaire pour ne pas compter un conflit que la personne concernée a déjà
  // levé pour CETTE activité précise (contrainte souple, ex. "j'accepte avec un
  // casque") — un total global indépendant de l'activité ne peut jamais le voir.
  const { data: allOverridesRows } = actualParticipantIds.length > 0
    ? await adminSupabase
        .from('availabilities')
        .select('user_id, constraint_overrides')
        .eq('event_id', eventId)
        .in('user_id', actualParticipantIds)
    : { data: [] }
  const overridesByUser: Record<string, Record<string, Record<string, boolean>>> = {}
  for (const row of (allOverridesRows ?? [])) {
    const existing = overridesByUser[row.user_id] ?? {}
    overridesByUser[row.user_id] = { ...existing, ...(row.constraint_overrides ?? {}) }
  }

  // ── Contraintes dures agrégées du groupe, PAR ACTIVITÉ ─────────────────────
  // (pour afficher les conflits à l'organisateur, en tenant compte des dérogations)
  const groupConstraintsByActivity: Record<string, Record<string, number>> = {}
  for (const act of (activities ?? [])) {
    const counts: Record<string, number> = {}
    for (const profile of (participantProfiles ?? [])) {
      const hc = (profile.hard_constraints ?? {}) as Record<string, boolean>
      const myOverridesForActivity = overridesByUser[profile.id]?.[act.id] ?? {}
      for (const [key, active] of Object.entries(hc)) {
        if (active && !myOverridesForActivity[key]) counts[key] = (counts[key] ?? 0) + 1
      }
    }
    groupConstraintsByActivity[act.id] = counts
  }

  // Noms de tous les sous-types enregistrés globalement — pour que le front puisse les
  // exclure du menu "Type d'activité" racine (un sous-type stocké comme clé plate dans
  // activity_prefs ne doit jamais apparaître comme sélectionnable en tant que type racine).
  const knownSubtypeNames = [...new Set((subtypeRows ?? []).map(r => r.name))]

  return NextResponse.json({
    event,
    activities:         activities ?? [],
    userProfile:        userProfile ?? null,
    groupTopTypes,
    groupConstraintsByActivity,
    userAvailabilities: userAvailabilities ?? [],
    participantCount:   (participantProfiles ?? []).length,
    currentUserId:      user.id,
    knownSubtypeNames,
  })
}

// ─── POST /api/events/[id]/activities ────────────────────────────────────────
// Crée une nouvelle activité suggérée par le participant

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  // Vérification basique
  if (!body.name?.trim())          return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!body.type?.trim()) return NextResponse.json({ error: 'Type requis' }, { status: 400 })

  const typeParent: string | null = body.type_parent?.trim() || null

  const { data, error } = await adminSupabase
    .from('activities')
    .insert({
      event_id:         eventId,
      name:             body.name.trim(),
      type:             body.type.trim(),
      type_parent:      typeParent,
      address:          body.address ?? null,
      address_lat:      body.address_lat ?? null,
      address_lng:      body.address_lng ?? null,
      duration_minutes: body.duration_minutes ?? null,
      cost_per_person:  body.cost_per_person ?? null,
      opening_hours:    body.opening_hours ?? null,   // JSONB { lun: {open,close}, ... }
      suggested_by:     user.id,
      // Contraintes
      social_level:     body.social_level     ?? 3,
      no_stairs:        body.no_stairs        ?? true,
      pets_allowed:     body.pets_allowed     ?? false,
      is_intense:       body.is_intense       ?? false,
      is_high_altitude: body.is_high_altitude ?? false,
      is_aquatic:       body.is_aquatic       ?? false,
      is_loud:          body.is_loud          ?? false,
      has_strobe:       body.has_strobe       ?? false,
      smoke_free:       body.smoke_free       ?? true,
      has_pets:         body.has_pets         ?? false,
      gluten_ok:        body.gluten_ok        ?? true,
      seafood_ok:       body.seafood_ok       ?? true,
      halal_ok:         body.halal_ok         ?? false,
      alcohol_free:     body.alcohol_free     ?? false,
      pregnancy_ok:     body.pregnancy_ok     ?? true,
      kid_ok:           body.kid_ok           ?? true,
      vegan_ok:         body.vegan_ok         ?? true,
      nut_ok:           body.nut_ok           ?? true,
      diab_ok:          body.diab_ok          ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Sous-type : enregistrement dans le catalogue global + profil du créateur ──
  if (typeParent) {
    const subtypeName = body.type.trim()

    // Ignore l'erreur de conflit d'unicité (le sous-type existe déjà — c'est le cas normal
    // de réutilisation, pas une erreur) ; toute autre erreur est silencieuse mais tracée.
    const { error: catalogError } = await adminSupabase
      .from('activity_subtypes')
      .insert({ parent_type: typeParent, name: subtypeName, created_by: user.id })
    if (catalogError && catalogError.code !== '23505') {
      console.error('Erreur enregistrement catalogue sous-types:', catalogError)
    }

    // Ajoute le sous-type au profil du créateur s'il n'y est pas déjà, avec héritage
    // de la valeur du type parent (ou 50 si le parent lui-même n'est pas noté).
    const { data: creatorProfile } = await adminSupabase
      .from('users')
      .select('activity_prefs')
      .eq('id', user.id)
      .single()
    const prefs = (creatorProfile?.activity_prefs ?? {}) as Record<string, number>
    if (prefs[subtypeName] === undefined) {
      const inherited = prefs[typeParent] ?? 50
      await adminSupabase
        .from('users')
        .update({ activity_prefs: { ...prefs, [subtypeName]: inherited } })
        .eq('id', user.id)
    }
  }

  return NextResponse.json({ activity: data })
}

// ─── PATCH /api/events/[id]/activities ───────────────────────────────────────
// Clôture la phase 3 → passe à la phase 4 (organisateur uniquement)

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase        = await createClient()
  const adminSupabase   = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (body.action !== 'close_phase2') {
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  }

  // Vérifier que l'utilisateur est l'organisateur
  const { data: event } = await adminSupabase
    .from('events')
    .select('created_by, phase')
    .eq('id', eventId)
    .single()

  if (!event)                    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  if (event.created_by !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  if (event.phase !== 3) {
    return NextResponse.json({ error: 'La phase Disponibilités doit être clôturée avant de pouvoir clôturer la phase Activités.' }, { status: 400 })
  }

  const { count: activityCount } = await adminSupabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
  if (!activityCount) {
    return NextResponse.json({ error: 'Aucune activité proposée — ajoutez au moins une activité avant de clôturer cette phase.' }, { status: 400 })
  }

  // Avertissement (pas un blocage) si des participants n'ont pas complété leur profil —
  // leurs préférences par défaut (neutres) faussent silencieusement le calcul sans que
  // l'organisateur en soit informé s'il ne le vérifie pas lui-même au bon moment.
  if (!body.force) {
    const { data: eventForProfiles } = await adminSupabase
      .from('events')
      .select('group_ids, group_id, invited_member_ids, extra_emails')
      .eq('id', eventId)
      .single()
    const groupIdsForProfiles: string[] = eventForProfiles?.group_ids?.length
      ? eventForProfiles.group_ids
      : (eventForProfiles?.group_id ? [eventForProfiles.group_id] : [])
    const { data: groupMembersForProfiles } = groupIdsForProfiles.length > 0
      ? await adminSupabase.from('group_members').select('user_id').in('group_id', groupIdsForProfiles)
      : { data: [] }
    const baseIds = eventForProfiles?.invited_member_ids?.length
      ? eventForProfiles.invited_member_ids
      : [...new Set((groupMembersForProfiles ?? []).map((m: { user_id: string }) => m.user_id))]
    const extraEmailsList: string[] = eventForProfiles?.extra_emails ?? []
    const { data: extraAccountsForProfiles } = extraEmailsList.length > 0
      ? await adminSupabase.from('users').select('id').in('email', extraEmailsList)
      : { data: [] }
    const allInvitedIds = [...new Set([...baseIds, ...(extraAccountsForProfiles ?? []).map(u => u.id)])]

    // Ne considère que ceux ayant réellement soumis une disponibilité — un invité
    // théorique du groupe qui n'a jamais répondu n'est pas un "participant" au sens
    // où ce calcul l'entend, et ne devrait pas déclencher cet avertissement.
    const { data: respondedRows } = allInvitedIds.length > 0
      ? await adminSupabase.from('availabilities').select('user_id').eq('event_id', eventId).neq('date', '1970-01-01').in('user_id', allInvitedIds)
      : { data: [] }
    const allParticipantIds = [...new Set((respondedRows ?? []).map(r => r.user_id))]

    const { data: incompleteProfiles } = allParticipantIds.length > 0
      ? await adminSupabase.from('users').select('id, display_name, email').in('id', allParticipantIds).eq('onboarding_done', false)
      : { data: [] }

    if (incompleteProfiles?.length) {
      return NextResponse.json({
        needsProfileConfirmation: true,
        incompleteProfiles: incompleteProfiles.map(u => ({ id: u.id, displayName: u.display_name ?? u.email.split('@')[0] })),
      }, { status: 200 })
    }
  }

  // ── Propagation des sous-types à TOUS les participants du groupe ────────────
  // Par capillarité : quiconque participe à cet événement (pas seulement le créateur
  // du sous-type) reçoit ce sous-type dans son propre profil s'il ne l'a pas déjà,
  // avec héritage de SA PROPRE note du type parent (ou 50 si lui-même ne l'a pas noté).
  const { data: eventForGroups } = await adminSupabase
    .from('events')
    .select('group_ids, invited_member_ids')
    .eq('id', eventId)
    .single()
  const groupIds: string[] = eventForGroups?.group_ids ?? []

  const { data: subtypeActivities } = await adminSupabase
    .from('activities')
    .select('type, type_parent')
    .eq('event_id', eventId)
    .not('type_parent', 'is', null)

  if (subtypeActivities?.length && groupIds.length > 0) {
    const { data: groupMembers } = await adminSupabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds)
    const memberIds = eventForGroups?.invited_member_ids?.length
      ? eventForGroups.invited_member_ids
      : [...new Set((groupMembers ?? []).map((m: { user_id: string }) => m.user_id))]

    const { data: profiles } = await adminSupabase
      .from('users')
      .select('id, activity_prefs')
      .in('id', memberIds)

    for (const profile of (profiles ?? [])) {
      const prefs = (profile.activity_prefs ?? {}) as Record<string, number>
      let changed = false
      const nextPrefs = { ...prefs }
      for (const act of subtypeActivities) {
        if (nextPrefs[act.type] === undefined) {
          nextPrefs[act.type] = nextPrefs[act.type_parent!] ?? 50
          changed = true
        }
      }
      if (changed) {
        await adminSupabase.from('users').update({ activity_prefs: nextPrefs }).eq('id', profile.id)
      }
    }
  }

  const { error } = await adminSupabase
    .from('events')
    .update({ phase: 4, updated_at: new Date().toISOString() })
    .eq('id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: 3 })
}
