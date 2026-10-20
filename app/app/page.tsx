// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import { Carte } from './_components/Ecran'

const ETAPES = [
  { titre: 'Préférences', texte: 'Chacun exprime ses envies et ses contraintes.' },
  { titre: 'Scénarios',   texte: 'Les possibilités compatibles sont générées.' },
  { titre: 'Vote',        texte: 'Le groupe garde toujours la décision finale.' },
]

export default function AccueilApp() {
  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: 'calc(env(safe-area-inset-top, 0px) + var(--app-space-8)) var(--app-space-5) 0',
      minWidth: 0,
    }}>

      <div style={{ textAlign: 'center', marginBottom: 'var(--app-space-8)' }}>
        <h1 style={{
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          margin: 0,
          background: 'var(--app-grad-accent)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}>
          IRIS
        </h1>
        <p style={{
          fontSize: 'var(--app-text-lg)',
          fontWeight: 600,
          color: 'var(--app-text)',
          margin: 'var(--app-space-2) 0 0',
          lineHeight: 1.35,
        }}>
          Décider ensemble,<br />équitablement.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--app-space-3)', marginBottom: 'var(--app-space-8)' }}>
        <Link href="/app/evenements" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 52, borderRadius: 'var(--app-radius)',
          background: 'var(--app-grad)', color: 'var(--app-on-primary)',
          fontSize: 'var(--app-text-base)', fontWeight: 700,
          textDecoration: 'none', boxShadow: 'var(--app-shadow-sm)',
        }}>
          Mes événements
        </Link>
        <Link href="/app/profil" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 52, borderRadius: 'var(--app-radius)',
          background: 'var(--app-surface)', color: 'var(--app-text)',
          border: '1px solid var(--app-border-strong)',
          fontSize: 'var(--app-text-base)', fontWeight: 600,
          textDecoration: 'none',
        }}>
          Mon profil
        </Link>
      </div>

      <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
        {ETAPES.map((etape, i) => (
          <Carte key={etape.titre} style={{ display: 'flex', alignItems: 'center', gap: 'var(--app-space-4)' }}>
            <span style={{
              flexShrink: 0,
              width: 34, height: 34, borderRadius: 'var(--app-radius-full)',
              background: 'var(--app-primary-dim)', color: 'var(--app-on-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--app-text-sm)', fontWeight: 800,
            }}>
              {i + 1}
            </span>
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span style={{
                display: 'block', fontSize: 'var(--app-text-base)',
                fontWeight: 700, color: 'var(--app-text)',
              }}>
                {etape.titre}
              </span>
              <span style={{
                display: 'block', fontSize: 'var(--app-text-sm)',
                color: 'var(--app-text-muted)', marginTop: 2, lineHeight: 1.5,
              }}>
                {etape.texte}
              </span>
            </span>
          </Carte>
        ))}
      </div>
    </div>
  )
}
