// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Gabarit commun à tous les écrans de l'application : marges, en-tête et
 * largeur maximale au même endroit, pour qu'aucun écran ne réinvente sa mise
 * en page — c'est précisément ce qui a rendu le site web si coûteux à adapter.
 */
export default function Ecran({
  titre, sousTitre, children,
}: {
  titre: string
  sousTitre?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{
      // maxWidth borne l'affichage sur grand écran (l'application reste
      // ouvrable depuis un navigateur de bureau).
      maxWidth: 560,
      margin: '0 auto',
      padding: 'calc(env(safe-area-inset-top, 0px) + var(--app-space-6)) var(--app-space-5) 0',
      minWidth: 0,
    }}>
      <header style={{ marginBottom: 'var(--app-space-6)' }}>
        <h1 style={{
          fontSize: 'var(--app-text-2xl)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--app-text)',
          margin: 0,
          overflowWrap: 'anywhere',
        }}>
          {titre}
        </h1>
        {sousTitre && (
          <p style={{
            fontSize: 'var(--app-text-sm)',
            color: 'var(--app-text-muted)',
            margin: 'var(--app-space-1) 0 0',
            overflowWrap: 'anywhere',
          }}>
            {sousTitre}
          </p>
        )}
      </header>

      {children}
    </div>
  )
}

/** Carte de contenu standard. */
export function Carte({
  children, style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: 'var(--app-space-5)',
      minWidth: 0,
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Bandeau indiquant un écran encore à construire. Retiré au fil des sessions. */
export function AConstruire({ quoi }: { quoi: string }) {
  return (
    <div style={{
      background: 'var(--app-surface-2)',
      border: '1px dashed var(--app-border-strong)',
      borderRadius: 'var(--app-radius)',
      padding: 'var(--app-space-5)',
      fontSize: 'var(--app-text-sm)',
      color: 'var(--app-text-muted)',
      lineHeight: 1.6,
      overflowWrap: 'anywhere',
    }}>
      {quoi}
    </div>
  )
}
