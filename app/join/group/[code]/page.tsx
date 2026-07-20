// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/browser'

export default function JoinGroupPage() {
  const { code } = useParams<{ code: string }>()
  const router   = useRouter()

  const [status,  setStatus]  = useState<'loading' | 'ready' | 'joining' | 'done' | 'error'>('loading')
  const [group,   setGroup]   = useState<{ id: string; name: string; description: string | null; memberCount: number } | null>(null)
  const [error,   setError]   = useState('')
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthed(!!user)

      const res  = await fetch(`/api/groups/join/${code}`)
      const json = await res.json()
      if (!res.ok) { setStatus('error'); setError(json.error ?? 'Lien invalide ou expiré.'); return }
      setGroup(json.group)
      setStatus('ready')
    }
    check()
  }, [code])

  async function handleJoin() {
    if (!isAuthed) {
      router.push(`/auth/login?next=/join/group/${code}`)
      return
    }
    setStatus('joining')
    const res  = await fetch(`/api/groups/join/${code}`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) { setStatus('error'); setError(json.error ?? 'Erreur.'); return }
    setStatus('done')
    setTimeout(() => router.push(`/group/${json.groupId}`), 1500)
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
        border: '1px solid #EDE9FE', textAlign: 'center',
      }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: 20 }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={56} height={56}/>
        </Link>

        {status === 'loading' && (
          <>
            <div style={{
              width: 32, height: 32, border: '3px solid #DDD6FE',
              borderTopColor: '#7C3AED', borderRadius: '50%',
              margin: '0 auto 16px', animation: 'spin 0.7s linear infinite',
            }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 14, color: '#64748B' }}>Vérification du lien…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>❌</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>{error}</p>
            <Link href="/dashboard" style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
              Retour au dashboard
            </Link>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
              Vous avez rejoint le groupe !
            </p>
            <p style={{ fontSize: 13, color: '#64748B' }}>Redirection…</p>
          </>
        )}

        {(status === 'ready' || status === 'joining') && group && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
            }}>
              👥
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>
              Rejoindre le groupe
            </h1>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#4C1D95', margin: '0 0 6px' }}>
              {group.name}
            </p>
            {group.description && (
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 6, lineHeight: 1.5 }}>
                {group.description}
              </p>
            )}
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 24 }}>
              {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
            </p>

            {!isAuthed && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: '#EDE9FE', border: '1px solid #DDD6FE',
                marginBottom: 16, fontSize: 13, color: '#4C1D95',
              }}>
                Vous devrez vous connecter ou créer un compte pour rejoindre ce groupe.
              </div>
            )}

            <button onClick={handleJoin} disabled={status === 'joining'}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: status === 'joining' ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: status === 'joining' ? '#94A3B8' : 'white',
                fontSize: 15, fontWeight: 700,
                cursor: status === 'joining' ? 'default' : 'pointer',
              }}>
              {status === 'joining' ? 'Rejoindre…' : isAuthed ? 'Rejoindre le groupe' : 'Se connecter pour rejoindre'}
            </button>

            <div style={{ marginTop: 16 }}>
              <Link href="/dashboard" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>
                Pas maintenant
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
