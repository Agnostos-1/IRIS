// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useEffect, useState } from 'react'
import Ecran, { Carte } from '../_components/Ecran'

type Theme = 'dark' | 'light'

export default function PlusApp() {
  const [theme, setTheme] = useState<Theme>('dark')

  // Le thème est posé sur le conteneur .iris-app, donc hors de cette page :
  // on le pilote par l'attribut data-theme que lit app-theme.css.
  useEffect(() => {
    const racine = document.querySelector('.iris-app')
    if (!racine) return
    if (theme === 'light') racine.setAttribute('data-theme', 'light')
    else racine.removeAttribute('data-theme')
  }, [theme])

  return (
    <Ecran titre="Plus" sousTitre="Réglages et informations">
      <Carte>
        <div style={{
          fontSize: 'var(--app-text-base)', fontWeight: 700,
          color: 'var(--app-text)', marginBottom: 'var(--app-space-2)',
        }}>
          Apparence
        </div>
        <p style={{
          fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
          margin: '0 0 var(--app-space-4)', lineHeight: 1.5,
        }}>
          L&apos;application est sombre par défaut. Ce réglage sert pour l&apos;instant
          à vérifier que les deux thèmes tiennent sur chaque écran.
        </p>

        <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
          {(['dark', 'light'] as Theme[]).map(t => {
            const actif = theme === t
            return (
              <button key={t} onClick={() => setTheme(t)} style={{
                flex: 1, minWidth: 0,
                borderRadius: 'var(--app-radius-sm)',
                border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border-strong)'}`,
                background: actif ? 'var(--app-primary)' : 'transparent',
                color: actif ? 'var(--app-on-primary)' : 'var(--app-text-muted)',
                fontSize: 'var(--app-text-sm)', fontWeight: 700,
                cursor: 'pointer',
              }}>
                {t === 'dark' ? 'Sombre' : 'Clair'}
              </button>
            )
          })}
        </div>
      </Carte>
    </Ecran>
  )
}
