// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import type { Metadata, Viewport } from 'next'
import BottomNav from './_components/BottomNav'
import RegisterSW from './_components/RegisterSW'
import './app-theme.css'

// Le manifeste est déclaré ici et non à la racine : la balise n'apparaît donc
// que sur les routes /app, et le site web ne devient pas installable.
export const metadata: Metadata = {
  title: 'IRIS',
  description: 'Décider ensemble, équitablement.',
  manifest: '/app/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'IRIS',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/app/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/app/apple-touch-icon.png',
  },
}

// viewport-fit=cover est nécessaire pour que env(safe-area-inset-*) renvoie
// autre chose que zéro : sans lui, la barre d'onglets passerait sous la barre
// de gestes Android. Next.js pose bien une balise viewport par défaut, mais
// sans cette option. Déclarée ici, elle ne s'applique qu'aux routes /app.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0714',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="iris-app"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <main
        style={{
          flex: 1,
          minWidth: 0,
          // De la place pour la barre d'onglets fixe, marge du téléphone comprise.
          paddingBottom: 'calc(var(--app-nav-height) + env(safe-area-inset-bottom, 0px) + var(--app-space-4))',
        }}
      >
        {children}
      </main>

      <BottomNav />
      <RegisterSW />
    </div>
  )
}
