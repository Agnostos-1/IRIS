// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useEffect, useState } from 'react'
import { Carte } from './Ecran'

/**
 * Invitation sans courriel.
 *
 * Les invitations par courriel dépendent d'une délivrabilité que rien ne
 * garantit — et elles partaient effectivement en indésirables. Les moyens
 * proposés ici ne reposent sur aucun envoi : la personne reçoit le lien par le
 * canal qu'elle utilise déjà, ou scanne l'écran si elle est présente.
 */
export default function Invitation({
  code, nomEvenement,
}: {
  code: string
  nomEvenement: string
}) {
  const [copie, setCopie] = useState(false)
  const [qrOuvert, setQrOuvert] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Construit depuis l'origine courante : le lien doit rester valable aussi
  // bien en production que depuis un tunnel de test.
  const lien = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${code}`
    : `/join/${code}`

  const partageDisponible = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function partager() {
    setErreur(null)
    try {
      await navigator.share({
        title: `Invitation IRIS — ${nomEvenement}`,
        text: `Rejoignez « ${nomEvenement} » sur IRIS pour indiquer vos disponibilités.`,
        url: lien,
      })
    } catch (e) {
      // L'abandon volontaire de la feuille de partage lève aussi une erreur :
      // on ne la signale pas comme un échec.
      if (e instanceof DOMException && e.name === 'AbortError') return
      setErreur("Le partage n'a pas abouti. Copiez le lien à la place.")
    }
  }

  async function copier() {
    setErreur(null)
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      setErreur('Copie impossible. Sélectionnez le code ci-dessous à la main.')
    }
  }

  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <h2 style={{
        fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--app-text-dim)',
        margin: '0 0 var(--app-space-2)',
      }}>
        Inviter
      </h2>
      <p style={{
        fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
        margin: '0 0 var(--app-space-4)', lineHeight: 1.5,
      }}>
        Aucun courriel n&apos;est envoyé : la personne reçoit le lien par le moyen
        que vous choisissez.
      </p>

      <div style={{ display: 'grid', gap: 'var(--app-space-2)' }}>
        {partageDisponible && (
          <button type="button" onClick={partager} style={boutonPlein}>
            <IconePartage />
            Partager le lien
          </button>
        )}

        <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={copier}
            style={{ ...boutonContour, flex: 1, minWidth: 128 }}
          >
            {copie ? 'Lien copié' : 'Copier le lien'}
          </button>
          <button
            type="button"
            onClick={() => setQrOuvert(o => !o)}
            aria-expanded={qrOuvert}
            style={{ ...boutonContour, flex: 1, minWidth: 128 }}
          >
            {qrOuvert ? 'Masquer le code' : 'Afficher un QR'}
          </button>
        </div>
      </div>

      {qrOuvert && <CodeQR lien={lien} />}

      {erreur && (
        <p style={{
          fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
          margin: 'var(--app-space-3) 0 0', lineHeight: 1.5,
        }}>
          {erreur}
        </p>
      )}

      <div style={{ marginTop: 'var(--app-space-4)' }}>
        <span style={{
          display: 'block', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--app-text-dim)', marginBottom: 4,
        }}>
          Code à saisir
        </span>
        <code style={{
          display: 'block', padding: 'var(--app-space-3)',
          borderRadius: 'var(--app-radius-sm)',
          background: 'var(--app-surface-2)',
          border: '1px solid var(--app-border)',
          color: 'var(--app-text)',
          fontSize: 'var(--app-text-base)', fontWeight: 700,
          letterSpacing: '0.08em', textAlign: 'center',
          // Un code long ne doit pas élargir la carte.
          overflowWrap: 'anywhere', userSelect: 'all',
        }}>
          {code}
        </code>
      </div>
    </Carte>
  )
}

/**
 * QR code rendu côté navigateur, sans dépendance ni appel réseau : le lien ne
 * sort pas de l'appareil. Le tracé est délégué au composant à qui l'on passe
 * la matrice, calculée par l'encodeur.
 */
function CodeQR({ lien }: { lien: string }) {
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'echec'>('chargement')
  const [matrice, setMatrice] = useState<boolean[][]>([])

  // Import différé : l'encodeur n'est téléchargé que si quelqu'un demande un
  // QR, ce qui évite de l'imposer à tous les écrans.
  useEffect(() => {
    let vivant = true
    import('../_lib/qr')
      .then(({ encoderQR }) => {
        if (!vivant) return
        setMatrice(encoderQR(lien))
        setEtat('pret')
      })
      .catch(() => { if (vivant) setEtat('echec') })
    // Évite de poser l'état sur un composant démonté si l'on referme le QR
    // avant la fin du chargement.
    return () => { vivant = false }
  }, [lien])

  if (etat === 'echec') {
    return (
      <p style={{
        fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
        margin: 'var(--app-space-3) 0 0',
      }}>
        Le QR code n&apos;a pas pu être généré.
      </p>
    )
  }

  if (etat === 'chargement') {
    return (
      <div style={{
        height: 200, marginTop: 'var(--app-space-3)',
        borderRadius: 'var(--app-radius-sm)', background: 'var(--app-surface-2)',
      }} />
    )
  }

  const taille = matrice.length
  const marge = 2
  const total = taille + marge * 2

  return (
    <div style={{
      marginTop: 'var(--app-space-3)',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        // Fond clair imposé : un QR sombre sur sombre n'est pas lisible par
        // les lecteurs, qui attendent des modules foncés sur fond clair.
        padding: 'var(--app-space-3)',
        background: '#FFFFFF',
        borderRadius: 'var(--app-radius-sm)',
      }}>
        <svg
          width="200" height="200"
          viewBox={`0 0 ${total} ${total}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label="QR code du lien d'invitation"
        >
          <rect width={total} height={total} fill="#FFFFFF" />
          {matrice.map((ligne, y) =>
            ligne.map((noir, x) =>
              noir ? (
                <rect key={`${x}-${y}`} x={x + marge} y={y + marge} width={1} height={1} fill="#0B0714" />
              ) : null
            )
          )}
        </svg>
      </div>
    </div>
  )
}

function IconePartage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

const boutonPlein: React.CSSProperties = {
  width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  borderRadius: 'var(--app-radius-sm)', border: 'none',
  background: 'var(--app-grad)', color: 'var(--app-on-primary)',
  fontSize: 'var(--app-text-sm)', fontWeight: 700, cursor: 'pointer',
}

const boutonContour: React.CSSProperties = {
  borderRadius: 'var(--app-radius-sm)',
  border: '1.5px solid var(--app-border-strong)',
  background: 'transparent', color: 'var(--app-text)',
  fontSize: 'var(--app-text-sm)', fontWeight: 600, cursor: 'pointer',
}
