// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect  } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'
import Link from 'next/link'

type Mode = 'password' | 'magic'
type Status = 'idle' | 'loading' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [mode,     setMode]     = useState<Mode>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [status,   setStatus]   = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [next, setNext] = useState('/dashboard')
  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get('next') ?? '/dashboard')
  }, [])

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()

    if (isSignUp) {
      // Inscription
      const { error } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password: password,
        options:  { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
      } else {
        // Connexion directe après inscription (email confirmé auto)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email:    email.trim().toLowerCase(),
          password: password,
        })
        if (signInError) {
          setStatus('error')
          setErrorMsg('Compte créé — connectez-vous maintenant.')
        } else {
          router.push(next)
        }
      }
    } else {
      // Connexion
      const { error } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password: password,
      })
      if (error) {
        setStatus('error')
        setErrorMsg(
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect.'
            : error.message
        )
      } else {
        router.push(next)
      }
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${status === 'error' ? '#FCA5A5' : '#DDD6FE'}`,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1E293B',
    boxSizing: 'border-box',
    background: 'white',
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 60%, #F0FDF4 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'white',
        borderRadius: 20,
        padding: '40px 36px',
        boxShadow: '0 4px 40px rgba(76,29,149,0.08)',
        border: '1px solid #EDE9FE',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
	    <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={64} height={64}
            style={{ marginBottom: 12 }}/>
		 </Link>
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: '#1E293B',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            {isSignUp ? 'Créer un compte' : 'Bienvenue sur IRIS'}
          </h1>
        </div>

        {/* Bandeau contextuel si arrivée via lien d'invitation */}
        {next.startsWith('/join/') && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#EDE9FE', border: '1px solid #DDD6FE',
            marginBottom: 20, fontSize: 13, color: '#4C1D95',
            lineHeight: 1.5, textAlign: 'center',
          }}>
            🎉 Vous avez été invité(e) à un événement IRIS !
            <br/>
            <span style={{ fontSize: 12, color: '#7C3AED' }}>
              Connectez-vous ou créez un compte — c'est simple et rapide.
            </span>
          </div>
        )}

        {/* Toggle mode */}
        <div style={{
          display: 'flex', background: '#F8FAFC',
          borderRadius: 10, padding: 3, marginBottom: 24, gap: 3,
        }}>
          {(['password', 'magic'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setStatus('idle'); setErrorMsg('') }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#4C1D95' : '#94A3B8',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
              {m === 'password' ? '🔑 Mot de passe' : '✉️ Lien magique'}
            </button>
          ))}
        </div>

        {/* ── Mode mot de passe ── */}
        {mode === 'password' && (
          <form onSubmit={handlePassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoFocus
                disabled={status === 'loading'} style={inputStyle}/>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 6 }}>
                Mot de passe
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Choisissez un mot de passe' : '••••••••'}
                required minLength={6} disabled={status === 'loading'} style={inputStyle}/>
              {isSignUp && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
                  Minimum 6 caractères
                </p>
              )}
            </div>

            {status === 'error' && (
              <div style={{
                padding: '9px 12px', borderRadius: 8, background: '#FEE2E2',
                color: '#991B1B', fontSize: 13, marginBottom: 14,
              }}>
                ⚠️ {errorMsg}
              </div>
            )}
			
			  <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -10 }}>
				  <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#7C3AED', textDecoration: 'none' }}>
					Mot de passe oublié ?
				  </Link>
			  </div>

            <button type="submit" disabled={status === 'loading' || !email || !password}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: status === 'loading' || !email || !password
                  ? '#E2E8F0'
                  : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: status === 'loading' || !email || !password ? '#94A3B8' : 'white',
                fontSize: 15, fontWeight: 700,
                cursor: status === 'loading' || !email || !password ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {status === 'loading' ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: '2px solid #CBD5E1',
                    borderTopColor: '#7C3AED', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }}/>
                  {isSignUp ? 'Création…' : 'Connexion…'}
                </>
              ) : (
                isSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button"
                onClick={() => { setIsSignUp(!isSignUp); setStatus('idle'); setErrorMsg('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#7C3AED', fontWeight: 500,
                }}>
                {isSignUp
                  ? 'Déjà un compte ? Se connecter'
                  : 'Pas encore de compte ? Créer un compte'}
              </button>
            </div>
          </form>
        )}

        {/* ── Mode magic link ── */}
        {mode === 'magic' && (
          status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
                Vérifiez vos emails
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Lien envoyé à <strong style={{ color: '#4C1D95' }}>{email}</strong>.
              </p>
              <button onClick={() => setStatus('idle')}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
                Réessayer
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6 }}>
                  Adresse email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com" required autoFocus
                  disabled={status === 'loading'} style={inputStyle}/>
              </div>
			  
              {status === 'error' && (
                <div style={{
                  padding: '9px 12px', borderRadius: 8, background: '#FEE2E2',
                  color: '#991B1B', fontSize: 13, marginBottom: 14,
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}
			  
			   <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -10 }}>
				  <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#7C3AED', textDecoration: 'none' }}>
					Mot de passe oublié ?
				  </Link>
			  </div>

              <button type="submit" disabled={status === 'loading' || !email}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: status === 'loading' || !email ? '#E2E8F0'
                    : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                  color: status === 'loading' || !email ? '#94A3B8' : 'white',
                  fontSize: 15, fontWeight: 700,
                  cursor: status === 'loading' || !email ? 'default' : 'pointer',
                }}>
                {status === 'loading' ? 'Envoi…' : 'Recevoir mon lien'}
              </button>
            </form>
          )
        )}

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20,
          borderTop: '1px solid #F1F5F9' }}>
          <Link href="/" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
