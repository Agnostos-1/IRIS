// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'

export default function ConfirmPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const supabase = createClient()

    // Supabase OTP magic link place les tokens dans le fragment # de l'URL
    // ex: #access_token=xxx&refresh_token=yyy&type=magiclink
    const hash = window.location.hash.substring(1) // enlève le #
    const params = new URLSearchParams(hash)

    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      // Établit la session manuellement depuis les tokens du fragment
      supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          setStatus('error')
        } else {
          // Session établie → redirige
          router.replace(next)
        }
      })
    } else {
      // Aucun token trouvé — essaie quand même de récupérer la session existante
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace(next)
        } else {
          setStatus('error')
        }
      })
    }
  }, [next, router])

  if (status === 'error') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 60%, #F0FDF4 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '40px 36px',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 40px rgba(76,29,149,0.08)',
          border: '1px solid #EDE9FE',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Lien expiré ou invalide
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            Ce lien de connexion a expiré ou a déjà été utilisé.
            Les liens magic link sont valables 1 heure.
          </p>
          <a href="/auth/login" style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}>
            Demander un nouveau lien
          </a>
        </div>
      </main>
    )
  }

  // État de chargement pendant la vérification
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 60%, #F0FDF4 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Image
          src="/iris-logo_transparent.png"
          alt="IRIS"
          width={56}
          height={56}
          style={{ marginBottom: 20, opacity: 0.8 }}
        />
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #DDD6FE',
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 0.7s linear infinite',
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: '#64748B' }}>Connexion en cours…</p>
      </div>
    </main>
  )
}
