// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import JoinCodeForm from '@/components/JoinCodeForm'

// Police système + Inter via Tailwind — aucune dépendance externe
// Design : violet IRIS (#4C1D95) + fond ardoise très clair + typographie spacieuse

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 50%, #F0FDF4 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid rgba(124,58,237,0.08)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#4C1D95',
            letterSpacing: '-0.03em',
          }}>IRIS</span>
          <span style={{
            fontSize: 11,
            color: '#7C3AED',
            background: '#EDE9FE',
            padding: '2px 8px',
            borderRadius: 20,
            fontWeight: 500,
          }}>bêta</span>
        </div>
        <Link href="/auth/login" style={{
          padding: '8px 20px',
          borderRadius: 10,
          border: '1.5px solid #DDD6FE',
          color: '#4C1D95',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          background: 'white',
          transition: 'background 0.15s',
        }}>
          Se connecter
        </Link>
      </nav>

      {/* Hero */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px 48px',
        textAlign: 'center',
        maxWidth: 680,
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Accroche */}
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#7C3AED',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            display: 'inline-block',
            width: 28,
            height: 1.5,
            background: '#7C3AED',
            borderRadius: 2,
          }}/>
          Planification collective
          <span style={{
            display: 'inline-block',
            width: 28,
            height: 1.5,
            background: '#7C3AED',
            borderRadius: 2,
          }}/>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 58px)',
          fontWeight: 800,
          color: '#1E293B',
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 20,
        }}>
          Choisissez ensemble,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #4C1D95, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            sans compromis
          </span>
        </h1>

        <p style={{
          fontSize: 18,
          color: '#475569',
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 520,
        }}>
          IRIS calcule le scénario qui maximise la satisfaction de tout le groupe —
          disponibilités, préférences et contraintes incluses.
          Décision par vote Condorcet.
        </p>

        {/* CTA principal */}
        <Link href="/auth/login?next=/event/new" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 32px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
          color: 'white',
          fontWeight: 700,
          fontSize: 16,
          textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(76,29,149,0.25)',
          marginBottom: 16,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          Créer un événement
          <span style={{ fontSize: 18 }}>→</span>
        </Link>

        <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 40 }}>
          Gratuit · Aucune carte de crédit
        </p>

        {/* Séparateur */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          maxWidth: 400,
          marginBottom: 24,
        }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
          <span style={{ fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap' }}>
            ou rejoindre avec un code
          </span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
        </div>

        {/* Rejoindre avec un code */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <JoinCodeForm />
        </div>
      </section>

      {/* Fonctionnement en 3 étapes */}
      <section style={{
        padding: '64px 24px',
        background: 'white',
        borderTop: '1px solid #F1F5F9',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 26,
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            Comment ça marche ?
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#64748B',
            fontSize: 15,
            marginBottom: 48,
          }}>
            De la création à la décision en quelques minutes.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                n: '1',
                icon: '📅',
                title: 'Créez l\'événement',
                desc: 'Proposez des dates, invitez votre groupe par lien, QR code ou notification.',
              },
              {
                n: '2',
                icon: '🎯',
                title: 'Chacun répond',
                desc: 'Disponibilités, préférences, contraintes. Chaque participant suggère aussi des activités.',
              },
              {
                n: '3',
                icon: '🏆',
                title: 'IRIS décide',
                desc: 'Le moteur génère les meilleurs scénarios. Le groupe vote. Le résultat est mathématiquement équitable.',
              },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} style={{
                padding: '28px 24px',
                borderRadius: 16,
                background: '#FAFAFA',
                border: '1px solid #F1F5F9',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#DDD6FE',
                  letterSpacing: '0.05em',
                }}>
                  0{n}
                </div>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: 8,
                }}>
                  {title}
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#64748B',
                  lineHeight: 1.6,
                }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Garantie mathématique */}
      <section style={{
        padding: '48px 24px',
        background: 'linear-gradient(135deg, #4C1D95, #1E3A8A)',
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            fontSize: 28,
            marginBottom: 16,
          }}>∑</div>
          <h3 style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            La satisfaction du groupe, pas du groupe dominant
          </h3>
          <p style={{
            fontSize: 15,
            lineHeight: 1.7,
            opacity: 0.85,
            marginBottom: 28,
          }}>
            IRIS utilise la moyenne géométrique Nash — un indicateur qui
            pénalise les grands écarts. Un scénario où tout le monde est
            à 70% bat un scénario où trois personnes sont à 95% et deux à 20%.
          </p>
          <Link href="/auth/login?next=/event/new" style={{
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            border: '1.5px solid rgba(255,255,255,0.3)',
          }}>
            Essayer maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'white',
        borderTop: '1px solid #F1F5F9',
        fontSize: 13,
        color: '#94A3B8',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontWeight: 700, color: '#4C1D95' }}>IRIS</span>
        <span>Inclusive Rational Interaction System</span>
      </footer>

    </main>
  )
}
