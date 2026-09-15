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
type Status = 'idle' | 'loading' | 'sent' | 'error' | 'confirm-email'

export default function LoginPage() {
  const router = useRouter()
  const [mode,     setMode]     = useState<Mode>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [status,   setStatus]   = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Validité du formulaire affiché, lue depuis le DOM plutôt que déduite de
  // l'état React : l'événement input remonte depuis n'importe quel champ, y
  // compris lors d'un remplissage automatique. checkValidity() tient compte du
  // format de l'email et de la longueur minimale du mot de passe — donc le
  // bouton ne s'active que sur une saisie réellement valide, et plus seulement
  // non vide.
  const [formOk, setFormOk] = useState(false)
  const checkForm = (e: React.FormEvent<HTMLFormElement>) =>
    setFormOk(e.currentTarget.checkValidity())

  const [next, setNext] = useState('/dashboard')
  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get('next') ?? '/dashboard')
  }, [])

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Les valeurs sont relues depuis le formulaire plutôt que depuis l'état :
    // un gestionnaire de mots de passe peut remplir les champs sans déclencher
    // onChange, auquel cas l'état React resterait vide.
    const form     = new FormData(e.currentTarget)
    const mail     = String(form.get('email') ?? email).trim().toLowerCase()
    const passwd   = String(form.get('password') ?? password)
    if (!mail || !passwd) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const supabase = createClient()

      if (isSignUp) {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email:    mail,
          password: passwd,
          options:  { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          setStatus('error')
          setErrorMsg(error.message)
        } else {
          // Le compte est créé mais nécessite une confirmation par email
          // (paramètre "Confirm email" activé côté Supabase) avant de pouvoir se connecter.
          setStatus('confirm-email')
        }
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email:    mail,
          password: passwd,
        })
        if (error) {
          if (error.message === 'Email not confirmed') {
            setStatus('confirm-email')
          } else {
            setStatus('error')
            setErrorMsg(
              error.message === 'Invalid login credentials'
                ? 'Email ou mot de passe incorrect.'
                : error.message
            )
          }
        } else {
          router.push(next)
        }
      }
    } catch {
      // Coupure réseau, requête avortée… Sans ce filet, status resterait sur
      // 'loading' et le bouton serait grisé jusqu'au rechargement de la page.
      setStatus('error')
      setErrorMsg('Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.')
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const mail = String(new FormData(e.currentTarget).get('email') ?? email).trim().toLowerCase()
    if (!mail) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: mail,
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
    } catch {
      setStatus('error')
      setErrorMsg('Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.')
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
            <button key={m} onClick={() => { setMode(m); setStatus('idle'); setErrorMsg(''); setFormOk(false) }}
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
        {mode === 'password' && status === 'confirm-email' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
              Confirmez votre email
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
              Un email de confirmation a été envoyé à <strong style={{ color: '#4C1D95' }}>{email}</strong>.
              <br/>
              Cliquez sur le lien qu'il contient pour activer votre compte, puis connectez-vous.
            </p>
            <button onClick={() => { setStatus('idle'); setIsSignUp(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
              Retour à la connexion
            </button>
          </div>
        )}

        {mode === 'password' && status !== 'confirm-email' && (
          <form onSubmit={handlePassword} onInput={checkForm}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input type="email" name="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoFocus
                disabled={status === 'loading'} style={inputStyle}/>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 6 }}>
                Mot de passe
              </label>
              <input type="password" name="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password} onChange={e => setPassword(e.target.value)}
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

            <button type="submit" disabled={status === 'loading' || !formOk}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: status === 'loading' || !formOk
                  ? '#E2E8F0'
                  : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: status === 'loading' || !formOk ? '#94A3B8' : 'white',
                fontSize: 15, fontWeight: 700,
                cursor: status === 'loading' || !formOk ? 'default' : 'pointer',
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
                onClick={() => { setIsSignUp(!isSignUp); setStatus('idle'); setErrorMsg(''); setFormOk(false) }}
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
            <form onSubmit={handleMagicLink} onInput={checkForm}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6 }}>
                  Adresse email
                </label>
                <input type="email" name="email" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
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

              <button type="submit" disabled={status === 'loading' || !formOk}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: status === 'loading' || !formOk ? '#E2E8F0'
                    : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                  color: status === 'loading' || !formOk ? '#94A3B8' : 'white',
                  fontSize: 15, fontWeight: 700,
                  cursor: status === 'loading' || !formOk ? 'default' : 'pointer',
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
