// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Icônes en SVG plutôt qu'en emoji : la convention du projet proscrit les
// emoji dans l'interface, et un tracé s'aligne sur la couleur courante, donc
// sur le thème clair comme sombre.
const icones = {
  accueil: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1V9.5" />
  ),
  evenements: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  plus: (
    <>
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </>
  ),
}

type Onglet = {
  href: string
  libelle: string
  icone: keyof typeof icones
}

const ONGLETS: Onglet[] = [
  { href: '/app',             libelle: 'Accueil',    icone: 'accueil' },
  { href: '/app/evenements',  libelle: 'Événements', icone: 'evenements' },
  { href: '/app/profil',      libelle: 'Profil',     icone: 'profil' },
  { href: '/app/plus',        libelle: 'Plus',       icone: 'plus' },
]

export default function BottomNav() {
  const chemin = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 50,
        display: 'flex',
        background: 'var(--app-bg-elev)',
        borderTop: '1px solid var(--app-border)',
        // Marge basse du téléphone (barre de gestes Android, encoche iOS).
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {ONGLETS.map(onglet => {
        // L'accueil ne doit s'activer que sur une correspondance exacte, sinon
        // il resterait allumé sur toutes les routes de l'application.
        const actif = onglet.href === '/app'
          ? chemin === '/app'
          : chemin.startsWith(onglet.href)

        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            aria-current={actif ? 'page' : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              height: 'var(--app-nav-height)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: actif ? 'var(--app-primary)' : 'var(--app-text-dim)',
              transition: 'color .15s',
            }}
          >
            <svg
              width="23" height="23" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={actif ? 2.2 : 1.8}
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              {icones[onglet.icone]}
            </svg>
            <span style={{
              fontSize: 10.5,
              fontWeight: actif ? 700 : 500,
              letterSpacing: '-0.01em',
              overflowWrap: 'anywhere',
            }}>
              {onglet.libelle}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
