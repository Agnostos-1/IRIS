// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'

export default function InviteMemberForm({ groupId }: { groupId: string }) {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'pending' | 'error'>('idle')
  const [msg,    setMsg]    = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean.includes('@')) return

    setStatus('loading')
    setMsg('')

    const res = await fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, email: clean }),
    })
    const data = await res.json()

    if (res.ok) {
      if (data.existing) {
        setStatus('success')
        setMsg(`${clean} a été ajouté au groupe.`)
      } else {
        setStatus('pending')
        setMsg(`Aucun compte IRIS n'existe encore pour ${clean} — l'envoi automatique d'email n'est pas encore actif, transmettez-lui le lien d'invitation manuellement pour l'instant.`)
      }
      setEmail('')
      // Reset après 3s
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('error')
      setMsg(data.error ?? 'Erreur lors de l\'invitation.')
    }
  }

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: '#F8FAFC',
      border: '1px solid #E2E8F0',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8,
      }}>
        Inviter un membre
      </div>

      <form onSubmit={handleInvite} style={{ display: 'flex', gap: 6 }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@exemple.com"
          disabled={status === 'loading'}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1.5px solid #DDD6FE',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            color: '#1E293B',
            background: 'white',
          }}
        />
        <button
          type="submit"
          disabled={!email.includes('@') || status === 'loading'}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: email.includes('@') && status !== 'loading'
              ? '#4C1D95' : '#E2E8F0',
            color: email.includes('@') && status !== 'loading' ? 'white' : '#94A3B8',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: email.includes('@') && status !== 'loading' ? 'pointer' : 'default',
          }}
        >
          {status === 'loading' ? '…' : 'Inviter'}
        </button>
      </form>

      {msg && (
        <p style={{
          fontSize: 12, marginTop: 6,
          color: status === 'success' ? '#166534' : status === 'pending' ? '#92400E' : '#991B1B',
        }}>
          {status === 'success' ? '✓ ' : status === 'pending' ? 'ℹ️ ' : '⚠️ '}{msg}
        </p>
      )}
    </div>
  )
}
