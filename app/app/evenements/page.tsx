// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Ecran, { Carte } from '../_components/Ecran'
import { DERNIERE_PHASE, phaseDe } from '../_lib/phases'

type Evenement = {
  id: string
  name: string
  groupName: string | null
  dateLabel: string | null
  phase: number
}

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; evenements: Evenement[] }

export default function EvenementsApp() {
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })

  // Volontairement sans setEtat synchrone : l'état initial vaut déjà
  // « chargement », et le poser ici déclencherait une mise à jour d'état
  // pendant l'effet. La nouvelle tentative le repose explicitement.
  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/events/mine')
      if (!reponse.ok) {
        // 401 inclus : la session a pu expirer pendant que l'application
        // dormait en arrière-plan, cas courant sur téléphone.
        throw new Error(
          reponse.status === 401
            ? 'Votre session a expiré. Reconnectez-vous.'
            : `Le serveur a répondu ${reponse.status}.`
        )
      }
      const donnees = await reponse.json()
      setEtat({ nom: 'pret', evenements: donnees.events ?? [] })
    } catch (e) {
      // Le client Supabase et fetch échouent silencieusement de façons très
      // différentes ; on retombe toujours sur un message actionnable.
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message
          ? e.message
          : 'Connexion impossible. Vérifiez votre réseau.',
      })
    }
  }, [])

  // La règle vise les mises à jour d'état synchrones, qui enchaînent les rendus.
  // Ici, tout setEtat survient après l'await du fetch : c'est le motif de
  // chargement standard. Passer en composant serveur éviterait l'effet, mais
  // obligerait à dupliquer la résolution d'appartenance aux groupes que fait
  // déjà la route — précisément la duplication qu'on cherche à éviter.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  return (
    <Ecran titre="Événements" sousTitre="Ceux auxquels vous participez">
      {etat.nom === 'chargement' && <Squelette />}

      {etat.nom === 'erreur' && (
        <Carte>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: '0 0 var(--app-space-4)', lineHeight: 1.6,
          }}>
            {etat.message}
          </p>
          <button onClick={() => { setEtat({ nom: 'chargement' }); charger() }} style={{
            width: '100%', borderRadius: 'var(--app-radius-sm)', border: 'none',
            background: 'var(--app-grad)', color: 'var(--app-on-primary)',
            fontSize: 'var(--app-text-sm)', fontWeight: 700, cursor: 'pointer',
          }}>
            Réessayer
          </button>
        </Carte>
      )}

      {etat.nom === 'pret' && etat.evenements.length === 0 && (
        <Carte>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: 0, lineHeight: 1.6,
          }}>
            Aucun événement pour l&apos;instant. Dès qu&apos;on vous invite à un
            événement, ou que vous en créez un, il apparaît ici.
          </p>
        </Carte>
      )}

      {etat.nom === 'pret' && etat.evenements.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
          {etat.evenements.map(evenement => (
            <CarteEvenement key={evenement.id} evenement={evenement} />
          ))}
        </div>
      )}
    </Ecran>
  )
}

function CarteEvenement({ evenement }: { evenement: Evenement }) {
  const phase = phaseDe(evenement.phase)
  const etape = Math.min(Math.max(evenement.phase, 0), DERNIERE_PHASE)
  const avancement = (etape / DERNIERE_PHASE) * 100

  // Le groupe et la date se complètent sans toujours exister tous les deux.
  const contexte = [evenement.groupName, evenement.dateLabel].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/app/evenements/${evenement.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        borderRadius: 'var(--app-radius)',
        // Supprime le surlignage bleu au toucher sur Android.
        WebkitTapHighlightColor: 'transparent',
      }}
    >
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 'var(--app-space-3)', flexWrap: 'wrap',
      }}>
        <h2 style={{
          flex: 1, minWidth: 0, overflowWrap: 'anywhere',
          fontSize: 'var(--app-text-base)', fontWeight: 700,
          color: 'var(--app-text)', margin: 0, lineHeight: 1.3,
        }}>
          {evenement.name}
        </h2>

        <span style={{
          flexShrink: 0,
          fontSize: 'var(--app-text-xs)', fontWeight: 700,
          color: phase.couleur, background: phase.fond,
          padding: '4px 10px', borderRadius: 'var(--app-radius-full)',
        }}>
          {phase.label}
        </span>
      </div>

      {contexte && (
        <p style={{
          fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
          margin: 'var(--app-space-2) 0 0', overflowWrap: 'anywhere', lineHeight: 1.5,
        }}>
          {contexte}
        </p>
      )}

      <div style={{ marginTop: 'var(--app-space-4)' }}>
        <div
          role="progressbar"
          aria-valuenow={etape}
          aria-valuemin={0}
          aria-valuemax={DERNIERE_PHASE}
          aria-label={`Étape ${etape} sur ${DERNIERE_PHASE}`}
          style={{
            height: 5, borderRadius: 'var(--app-radius-full)',
            background: 'var(--app-surface-2)', overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${avancement}%`, height: '100%',
            background: 'var(--app-grad)', borderRadius: 'inherit',
            transition: 'width .3s',
          }} />
        </div>
        <span style={{
          display: 'block', marginTop: 6,
          fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
        }}>
          Étape {etape} sur {DERNIERE_PHASE}
        </span>
      </div>
    </Carte>
    </Link>
  )
}

/** Placeholders pendant le chargement, pour éviter un écran vide puis un saut. */
function Squelette() {
  return (
    <div style={{ display: 'grid', gap: 'var(--app-space-3)' }} aria-hidden="true">
      {[0, 1, 2].map(i => (
        <Carte key={i} style={{ padding: 'var(--app-space-4)' }}>
          <div style={{
            height: 15, width: `${70 - i * 12}%`, borderRadius: 6,
            background: 'var(--app-surface-2)',
          }} />
          <div style={{
            height: 11, width: '45%', borderRadius: 6, marginTop: 10,
            background: 'var(--app-surface-2)',
          }} />
          <div style={{
            height: 5, width: '100%', borderRadius: 999, marginTop: 18,
            background: 'var(--app-surface-2)',
          }} />
        </Carte>
      ))}
    </div>
  )
}
