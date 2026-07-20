// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ─── POST /api/events/[id]/invite ──────────────────────────────────────────────
// Invitation par email directement à CET événement (pas au groupe) — n'a de sens
// que si l'organisateur a activé l'invitation ouverte, auquel cas n'importe quel
// participant peut aussi inviter par ce biais. Rejoint le modèle "extra" déjà en
// place ailleurs (extra_emails) plutôt que de rattacher la personne à un groupe.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { email } = await request.json()
  const clean = email?.trim().toLowerCase()
  if (!clean) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const { data: event } = await adminSupabase
    .from('events')
    .select('created_by, open_invite, extra_emails')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  // Seul l'organisateur peut inviter si l'invitation ouverte n'est pas activée ;
  // sinon n'importe quel utilisateur authentifié consultant l'événement le peut.
  if (event.created_by !== user.id && !event.open_invite) {
    return NextResponse.json({ error: "L'invitation par email n'est pas ouverte à tous pour cet événement." }, { status: 403 })
  }

  const currentExtras: string[] = event.extra_emails ?? []
  if (currentExtras.includes(clean)) {
    return NextResponse.json({ error: 'Cette personne est déjà invitée à cet événement.' }, { status: 409 })
  }

  const { error } = await adminSupabase
    .from('events')
    .update({ extra_emails: [...currentExtras, clean] })
    .eq('id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Indique si un compte IRIS existe déjà pour cet email, uniquement pour adapter
  // le message affiché (email d'invitation réel à implémenter — même limite que
  // partout ailleurs dans l'app tant que Resend n'est pas branché).
  const { data: existing } = await adminSupabase
    .from('users')
    .select('id')
    .eq('email', clean)
    .maybeSingle()

  return NextResponse.json({ existing: !!existing })
}
