// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/browser'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error,     setError]     = useState('')
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    // Supabase injecte la session via le hash de l'URL au chargement
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)    { setError('Minimum 6 caractères.'); return }
    setStatus('loading'); setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setStatus('error'); setError(err.message) }
    else {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
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
            Nouveau mot de passe
          </h1>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
              Mot de passe mis à jour !
            </p>
            <p style={{ fontSize: 13, color: '#64748B' }}>Redirection vers le dashboard…</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #DDD6FE',
              borderTopColor: '#7C3AED', borderRadius: '50%',
              margin: '0 auto 16px', animation: 'spin 0.7s linear infinite',
            }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 13, color: '#64748B' }}>Vérification du lien…</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
              Si cette page reste bloquée, le lien a peut-être expiré.{' '}
              <Link href="/auth/forgot-password" style={{ color: '#7C3AED' }}>Réessayer</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Nouveau mot de passe
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères" required minLength={6}
                disabled={status === 'loading'}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1.5px solid #DDD6FE', fontSize: 15,
                  fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="Répétez le mot de passe" required
                disabled={status === 'loading'}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: `1.5px solid ${password2 && password !== password2 ? '#FCA5A5' : '#DDD6FE'}`,
                  fontSize: 15, fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
              {password2 && password !== password2 && (
                <p style={{ fontSize: 11, color: '#991B1B', marginTop: 4 }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {(status === 'error' || error) && (
              <div style={{
                padding: '9px 12px', borderRadius: 8, background: '#FEE2E2',
                color: '#991B1B', fontSize: 13, marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit"
              disabled={status === 'loading' || !password || password !== password2}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: status === 'loading' || !password || password !== password2
                  ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: status === 'loading' || !password || password !== password2
                  ? '#94A3B8' : 'white',
                fontSize: 15, fontWeight: 700,
                cursor: status === 'loading' || !password || password !== password2 ? 'default' : 'pointer',
              }}>
              {status === 'loading' ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
