// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/browser'

export default function ForgotPasswordPage() {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset` }
    )
    if (err) { setStatus('error'); setError(err.message) }
    else      setStatus('sent')
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 60%, #F0FDF4 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'white',
        borderRadius: 20, padding: '40px 36px',
        boxShadow: '0 4px 40px rgba(76,29,149,0.08)',
        border: '1px solid #EDE9FE',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <Link href="/">
            <Image src="/iris-logo_transparent.png" alt="IRIS" width={56} height={56} style={{ marginBottom: 12 }}/>
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>
            Mot de passe oublié
          </h1>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
            <p style={{ fontSize: 14, color: '#1E293B', fontWeight: 600, marginBottom: 6 }}>
              Email envoyé !
            </p>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
              Si un compte existe pour <strong style={{ color: '#4C1D95' }}>{email}</strong>,
              vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <Link href="/auth/login" style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoFocus
                disabled={status === 'loading'}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1.5px solid #DDD6FE', fontSize: 15,
                  fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {status === 'error' && (
              <div style={{
                padding: '9px 12px', borderRadius: 8, background: '#FEE2E2',
                color: '#991B1B', fontSize: 13, marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={status === 'loading' || !email}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: status === 'loading' || !email ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: status === 'loading' || !email ? '#94A3B8' : 'white',
                fontSize: 15, fontWeight: 700,
                cursor: status === 'loading' || !email ? 'default' : 'pointer',
              }}>
              {status === 'loading' ? 'Envoi…' : 'Envoyer le lien'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link href="/auth/login" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
