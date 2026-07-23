// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Logs de debug actifs uniquement en local — jamais en production (dépôt public,
// et exchangeCodeForSession renvoie les tokens de session dans `data`).
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') console.log(...args)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'

  devLog('CALLBACK params:', Object.fromEntries(searchParams.entries()))
  devLog('CALLBACK cookies:', request.cookies.getAll().map(c => c.name))

  // Flux PKCE : Supabase a déjà vérifié le token côté serveur
  // et posé un cookie de session. On échange juste le code si présent.
const code = searchParams.get('code')
if (code) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  devLog('exchangeCodeForSession result:', { data, error })
  if (!error) {
    return NextResponse.redirect(`${origin}${next}`)
  }
}

  // Flux OTP direct (token= + type=) — Supabase a déjà fait la vérification
  // La session est dans les cookies, on vérifie juste qu'elle existe
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Dernier recours : lire token_hash si présent
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') ?? searchParams.get('t')
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type ?? 'magiclink') as 'magiclink' | 'email' | 'recovery',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
