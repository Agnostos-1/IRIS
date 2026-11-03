// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Ecran, { Carte } from '../_components/Ecran'

// Mêmes clés et mêmes libellés que la page Profil du web : un participant ne
// doit pas retrouver d'autres mots pour les mêmes réglages.
const LIBELLES_CRITERES: Record<string, string> = {
  activity: "Type d'activité",
  schedule: 'Horaires',
  distance: 'Distance',
  budget:   'Budget',
  social:   'Ambiance sociale',
}

// Bornes du coefficient d'équité, telles qu'appliquées par le moteur
// (clamp dans computeFairnessCoefficients).
const RI_MIN = 0.5
const RI_MAX = 1.2

type Profil = {
  display_name: string | null
  transport: string | null
  distance_max: number | null
  budget: number | null
  social_level: number | null
  weights: Record<string, number> | null
  activity_prefs: Record<string, number> | null
  onboarding_done: boolean | null
  fairness?: { riGlobal: number; hasHistory: boolean }
}

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; profil: Profil }

export default function ProfilApp() {
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/profile')
      if (!reponse.ok) {
        throw new Error(
          reponse.status === 401 ? 'Votre session a expiré. Reconnectez-vous.'
          : reponse.status === 404 ? 'Profil introuvable.'
          : `Le serveur a répondu ${reponse.status}.`
        )
      }
      setEtat({ nom: 'pret', profil: await reponse.json() })
    } catch (e) {
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message ? e.message : 'Connexion impossible.',
      })
    }
  }, [])

  // Comme ailleurs : les mises à jour d'état suivent toutes l'await du fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  return (
    <Ecran
      titre="Profil"
      sousTitre={etat.nom === 'pret' && etat.profil.display_name ? etat.profil.display_name : 'Vos préférences et vos contraintes'}
    >
      {etat.nom === 'chargement' && (
        <Carte>
          <div style={{ height: 16, width: '55%', borderRadius: 6, background: 'var(--app-surface-2)' }} />
          <div style={{ height: 11, width: '35%', borderRadius: 6, marginTop: 12, background: 'var(--app-surface-2)' }} />
        </Carte>
      )}

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

      {etat.nom === 'pret' && <Contenu profil={etat.profil} />}
    </Ecran>
  )
}

function Contenu({ profil }: { profil: Profil }) {
  const poids = profil.weights ?? {}
  const sommePoids = Object.values(poids).reduce((s, v) => s + v, 0)

  const preferences = Object.entries(profil.activity_prefs ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const contraintes = [
    profil.distance_max != null ? { cle: 'Distance maximale', valeur: `${profil.distance_max} km` } : null,
    profil.budget != null ? { cle: 'Budget habituel', valeur: `${profil.budget} €` } : null,
    profil.transport ? { cle: 'Transport', valeur: profil.transport } : null,
  ].filter(Boolean) as { cle: string; valeur: string }[]

  return (
    <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>

      {profil.fairness && <Equite fairness={profil.fairness} />}

      {sommePoids > 0 && (
        <Bloc titre="Importance des critères">
          <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
            {Object.entries(poids)
              .sort((a, b) => b[1] - a[1])
              .map(([cle, valeur]) => {
                const pourcent = Math.round((valeur / sommePoids) * 100)
                return (
                  <div key={cle} style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      gap: 'var(--app-space-2)', marginBottom: 5,
                    }}>
                      <span style={{
                        fontSize: 'var(--app-text-sm)', color: 'var(--app-text)',
                        minWidth: 0, overflowWrap: 'anywhere',
                      }}>
                        {LIBELLES_CRITERES[cle] ?? cle}
                      </span>
                      <span style={{
                        flexShrink: 0, fontSize: 'var(--app-text-sm)',
                        fontWeight: 700, color: 'var(--app-primary)',
                      }}>
                        {pourcent} %
                      </span>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 'var(--app-radius-full)',
                      background: 'var(--app-surface-2)', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pourcent}%`, height: '100%',
                        background: 'var(--app-grad)', borderRadius: 'inherit',
                      }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </Bloc>
      )}

      {preferences.length > 0 && (
        <Bloc titre="Vos activités préférées">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
            {preferences.map(([nom, valeur]) => (
              <span key={nom} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text)',
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                padding: '5px 10px', borderRadius: 'var(--app-radius-full)',
                minWidth: 0, overflowWrap: 'anywhere',
              }}>
                {nom}
                <span style={{ color: 'var(--app-primary)', fontWeight: 700 }}>
                  {Math.round(valeur)} %
                </span>
              </span>
            ))}
          </div>
        </Bloc>
      )}

      {contraintes.length > 0 && (
        <Bloc titre="Contraintes">
          <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
            {contraintes.map(c => (
              <div key={c.cle} style={{
                display: 'flex', justifyContent: 'space-between',
                gap: 'var(--app-space-3)', flexWrap: 'wrap', minWidth: 0,
              }}>
                <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)' }}>
                  {c.cle}
                </span>
                <span style={{
                  fontSize: 'var(--app-text-sm)', fontWeight: 600,
                  color: 'var(--app-text)', textAlign: 'right',
                  minWidth: 0, overflowWrap: 'anywhere',
                }}>
                  {c.valeur}
                </span>
              </div>
            ))}
          </div>
        </Bloc>
      )}

      {profil.onboarding_done === false && (
        <Carte style={{ borderColor: 'var(--app-warning)', background: 'rgba(251, 191, 36, 0.1)' }}>
          <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-warning)', lineHeight: 1.5 }}>
            Votre profil n&apos;est pas complet. Tant qu&apos;il ne l&apos;est pas, des
            préférences neutres sont utilisées pour vous dans les calculs.
          </span>
        </Carte>
      )}
    </div>
  )
}

/**
 * Le coefficient d'équité, mis en avant : c'est la proposition la plus
 * singulière d'IRIS, et elle n'apparaissait nulle part de façon lisible.
 * Le moteur le borne entre 0,5 et 1,2 ; 1 signifie « dans la médiane ».
 */
function Equite({ fairness }: { fairness: { riGlobal: number; hasHistory: boolean } }) {
  const ri = fairness.riGlobal
  const position = Math.min(Math.max((ri - RI_MIN) / (RI_MAX - RI_MIN), 0), 1) * 100
  const arrondi = Math.round(ri * 100) / 100

  const explication = !fairness.hasHistory
    ? "Vous n'avez pas encore d'historique : le coefficient reste neutre jusqu'à votre premier événement terminé."
    : arrondi > 1
    ? 'Vous avez été moins bien servi que la médiane par le passé. IRIS vous favorisera légèrement lors des prochains événements.'
    : arrondi < 1
    ? 'Vous avez été mieux servi que la médiane par le passé. Un léger rééquilibrage s\'appliquera lors des prochains événements.'
    : 'Vous êtes actuellement dans la médiane du groupe.'

  return (
    <Carte style={{
      background: 'linear-gradient(145deg, rgba(124,58,237,0.16), rgba(168,85,247,0.06))',
      borderColor: 'var(--app-border-strong)',
    }}>
      <h2 style={{
        fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--app-text-muted)', margin: 0,
      }}>
        Coefficient d&apos;équité
      </h2>

      <div style={{
        fontSize: 40, fontWeight: 900, letterSpacing: '-0.04em',
        color: 'var(--app-text)', margin: 'var(--app-space-2) 0 var(--app-space-4)',
        lineHeight: 1,
      }}>
        {ri.toFixed(2)}
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--app-space-2)' }}>
        <div style={{
          height: 6, borderRadius: 'var(--app-radius-full)',
          background: 'linear-gradient(90deg, #FB7185, var(--app-text-dim), #34D399)',
        }} />
        {/* Repère du curseur sur l'échelle 0,5 – 1,2 */}
        <div style={{
          position: 'absolute', top: -4, left: `${position}%`,
          transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: 'var(--app-radius-full)',
          background: 'var(--app-text)',
          border: '3px solid var(--app-bg-elev)',
          boxShadow: 'var(--app-shadow-sm)',
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--app-text-dim)', marginBottom: 'var(--app-space-4)',
      }}>
        <span>{RI_MIN.toFixed(1)}</span>
        <span>1,0 — médiane</span>
        <span>{RI_MAX.toFixed(1)}</span>
      </div>

      <p style={{
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
        margin: 0, lineHeight: 1.6, overflowWrap: 'anywhere',
      }}>
        {explication}
      </p>
    </Carte>
  )
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <h2 style={{
        fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--app-text-dim)',
        margin: '0 0 var(--app-space-3)', overflowWrap: 'anywhere',
      }}>
        {titre}
      </h2>
      {children}
    </Carte>
  )
}
