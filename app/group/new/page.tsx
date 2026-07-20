// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [emailInput,  setEmailInput]  = useState('')
  const [emails,      setEmails]      = useState<string[]>([])
  const [status,      setStatus]      = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')

  // Ajoute un email à la liste d'invitation
  function addEmail() {
    const e = emailInput.trim().toLowerCase()
    if (!e || !e.includes('@')) return
    if (emails.includes(e)) { setEmailInput(''); return }
    setEmails(prev => [...prev, e])
    setEmailInput('')
  }

  function removeEmail(e: string) {
    setEmails(prev => prev.filter(x => x !== e))
  }

  function handleEmailKeyDown(ev: React.KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault()
      addEmail()
    }
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) return

    setStatus('loading')
    setErrorMsg('')

	const res = await fetch('/api/groups', {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ name, description, emails }),
	})
	const data = await res.json()
	if (!res.ok) {
	  setStatus('error')
	  setErrorMsg(data.error ?? 'Erreur lors de la création.')
	  return
	}


    // Redirige vers la page du groupe
   router.push(`/group/${data.id}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 28px',
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28}/>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95' }}>IRIS</span>
        </Link>
        <span style={{ color: '#CBD5E1', fontSize: 16 }}>›</span>
        <span style={{ fontSize: 14, color: '#64748B' }}>Nouveau groupe</span>
      </nav>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1E293B',
            letterSpacing: '-0.02em',
            margin: '0 0 6px',
          }}>
            Créer un groupe
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Un groupe rassemble des personnes qui planifient ensemble sur la durée.
            L'historique des votes est partagé entre tous les événements du groupe.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Nom */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6,
            }}>
              Nom du groupe <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Les amis du lundi, Équipe design…"
              required
              maxLength={60}
              autoFocus
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1.5px solid #DDD6FE',
                fontSize: 15,
                fontFamily: 'inherit',
                outline: 'none',
                color: '#1E293B',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6,
            }}>
              Description <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>optionnel</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Une courte description du groupe…"
              rows={3}
              maxLength={200}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                color: '#1E293B',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Inviter des membres */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6,
            }}>
              Inviter des membres <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>optionnel — vous pourrez en ajouter plus tard</span>
            </label>

            {/* Tags emails ajoutés */}
            {emails.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 8,
                padding: '8px 10px',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
              }}>
                {emails.map(e => (
                  <span key={e} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#EDE9FE',
                    color: '#4C1D95',
                    fontSize: 12,
                    fontWeight: 500,
                  }}>
                    {e}
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#7C3AED',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onBlur={addEmail}
                placeholder="email@exemple.com"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  color: '#1E293B',
                }}
              />
              <button
                type="button"
                onClick={addEmail}
                disabled={!emailInput.trim().includes('@')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #DDD6FE',
                  background: emailInput.trim().includes('@') ? '#EDE9FE' : '#F8FAFC',
                  color: emailInput.trim().includes('@') ? '#4C1D95' : '#94A3B8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: emailInput.trim().includes('@') ? 'pointer' : 'default',
                }}
              >
                + Ajouter
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
              Appuyez sur Entrée ou virgule pour ajouter plusieurs emails.
              Les membres ayant déjà un compte IRIS seront notifiés.
            </p>
          </div>

          {/* Erreur */}
          {status === 'error' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#FEE2E2',
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 16,
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Link href="/dashboard" style={{
              padding: '11px 22px',
              borderRadius: 10,
              border: '1.5px solid #E2E8F0',
              color: '#64748B',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}>
              Annuler
            </Link>
            <button
              type="submit"
              disabled={!name.trim() || status === 'loading'}
              style={{
                padding: '11px 28px',
                borderRadius: 10,
                background: !name.trim() || status === 'loading'
                  ? '#E2E8F0'
                  : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: !name.trim() || status === 'loading' ? '#94A3B8' : 'white',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: !name.trim() || status === 'loading' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {status === 'loading' ? (
                <>
                  <span style={{
                    width: 14,
                    height: 14,
                    border: '2px solid #CBD5E1',
                    borderTopColor: '#7C3AED',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}/>
                  Création…
                </>
              ) : (
                'Créer le groupe →'
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

        </form>
      </main>
    </div>
  )
}
