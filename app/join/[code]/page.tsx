// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code }      = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Vérifie que l'événement existe via le code d'invitation
  const { data: ev } = await adminSupabase
    .from('events')
    .select('id, name, description, phase, invite_code, group_id, groups(name)')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!ev) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F8FAFC',
        fontFamily: 'system-ui, sans-serif', padding: 24,
      }}>
        <div style={{
          background: 'white', borderRadius: 16, padding: '36px 32px',
          maxWidth: 400, width: '100%', textAlign: 'center',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Invitation introuvable
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
            Ce lien d'invitation est invalide ou a expiré.
            Vérifiez l'URL ou contactez l'organisateur.
          </p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 10,
            background: '#4C1D95', color: 'white', fontWeight: 600,
            fontSize: 14, textDecoration: 'none',
          }}>
            Retour à l'accueil
          </Link>
        </div>
      </main>
    )
  }

  // Vérifie si l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirige vers auth avec next= vers cette page
    redirect(`/auth/login?next=/join/${code}`)
  }

  // L'utilisateur est connecté — rejoindre l'événement par CE lien (celui de
  // l'événement, pas d'un groupe) ne doit jamais faire adhérer à un groupe.
  // C'est précisément ce que le mécanisme "extra" existe pour couvrir : la
  // personne devient un participant individuel de CET événement, et c'est
  // ensuite à l'organisateur de décider — via la pop-up dédiée à la clôture des
  // disponibilités — de la rattacher ou non à un groupe existant/nouveau.
  const { data: evFull } = await adminSupabase
    .from('events')
    .select('extra_emails')
    .eq('id', ev.id)
    .single()

  const extras: string[] = evFull?.extra_emails ?? []
  if (user.email && !extras.includes(user.email)) {
    await adminSupabase
      .from('events')
      .update({ extra_emails: [...extras, user.email] })
      .eq('id', ev.id)
  }

  // Redirige vers la page de l'événement
  redirect(`/event/${ev.id}`)
}
