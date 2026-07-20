// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'

interface InviteLinkBoxProps {
  inviteCode: string
  eventName:  string
}

export default function InviteLinkBox({ inviteCode, eventName }: InviteLinkBoxProps) {
  const [copied, setCopied] = useState(false)

  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${inviteCode}`
    : `https://iris-app.vercel.app/join/${inviteCode}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback pour navigateurs sans clipboard API
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: `Invitation IRIS — ${eventName}`,
        text:  `Tu es invité(e) à planifier "${eventName}" avec IRIS !`,
        url:   link,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: '#F5F3FF', border: '1.5px solid #DDD6FE',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#7C3AED',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>
        🔗 Lien d'invitation
      </div>

      {/* Code court */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
      }}>
        <span style={{
          fontSize: 20, fontWeight: 800, color: '#4C1D95',
          fontFamily: 'monospace', letterSpacing: '0.1em',
        }}>
          {inviteCode}
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          — code court à communiquer
        </span>
      </div>

      {/* URL complète */}
      <div style={{
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        <div style={{
          flex: 1, padding: '7px 10px', borderRadius: 8,
          background: 'white', border: '1px solid #DDD6FE',
          fontSize: 11, color: '#64748B', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {link}
        </div>
        <button onClick={handleCopy} style={{
          padding: '7px 12px', borderRadius: 8, border: 'none',
          background: copied ? '#DCFCE7' : '#4C1D95',
          color: copied ? '#166534' : 'white',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0,
        }}>
          {copied ? '✓ Copié !' : '📋 Copier'}
        </button>
        <button onClick={handleShare} style={{
          padding: '7px 12px', borderRadius: 8, border: 'none',
          background: '#EDE9FE', color: '#4C1D95',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          ↗ Partager
        </button>
      </div>

      <p style={{ fontSize: 11, color: '#7C3AED', marginTop: 6, lineHeight: 1.5 }}>
        Partagez ce lien ou ce code par n'importe quel canal (SMS, WhatsApp, email…).
        Les nouveaux arrivants sans compte IRIS seront invités à en créer un.
      </p>
    </div>
  )
}
