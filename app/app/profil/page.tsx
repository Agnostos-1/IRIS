// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Ecran, { Carte } from '../_components/Ecran'
import {
  LIBELLES_CRITERES, ORDRE_CRITERES, POIDS_PAR_DEFAUT,
  enregistrerProfil, normaliserPoids, type ProfilComplet,
} from '../_lib/profil'

// Bornes du coefficient d'équité appliquées par le moteur.
const RI_MIN = 0.5
const RI_MAX = 1.2

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; profil: ProfilComplet }

type Enregistrement =
  | { nom: 'repos' }
  | { nom: 'encours' }
  | { nom: 'fait' }
  | { nom: 'echec'; message: string }

export default function ProfilApp() {
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  const [poids, setPoids] = useState<Record<string, number>>(POIDS_PAR_DEFAUT)
  const [enregistrement, setEnregistrement] = useState<Enregistrement>({ nom: 'repos' })

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
      const profil: ProfilComplet = await reponse.json()
      setEtat({ nom: 'pret', profil })
      setPoids({ ...POIDS_PAR_DEFAUT, ...(profil.weights ?? {}) })
    } catch (e) {
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message ? e.message : 'Connexion impossible.',
      })
    }
  }, [])

  // Les mises à jour d'état suivent toutes l'await du fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  const profil = etat.nom === 'pret' ? etat.profil : null

  // Comparaison sur les valeurs normalisées : ce sont elles qui sont
  // enregistrées, donc deux réglages bruts différents mais équivalents une
  // fois normalisés ne doivent pas faire croire à une modification.
  const poidsNormalises = normaliserPoids(poids)
  const modifie = profil !== null &&
    JSON.stringify(poidsNormalises) !== JSON.stringify(normaliserPoids({ ...POIDS_PAR_DEFAUT, ...(profil.weights ?? {}) }))

  async function enregistrer() {
    if (!profil) return
    setEnregistrement({ nom: 'encours' })
    try {
      await enregistrerProfil(profil, { weights: poidsNormalises })
      setEtat({ nom: 'pret', profil: { ...profil, weights: poidsNormalises } })
      setPoids(poidsNormalises)
      setEnregistrement({ nom: 'fait' })
      setTimeout(() => setEnregistrement({ nom: 'repos' }), 2200)
    } catch (e) {
      setEnregistrement({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Enregistrement impossible.',
      })
    }
  }

  return (
    <Ecran
      titre="Profil"
      sousTitre={profil?.display_name ?? 'Vos préférences et vos contraintes'}
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

      {profil && (
        <>
          <div style={{
            display: 'grid', gap: 'var(--app-space-3)',
            // Place pour la barre d'enregistrement, qui flotte au-dessus des onglets.
            paddingBottom: modifie || enregistrement.nom !== 'repos' ? 78 : 0,
          }}>
            {profil.fairness && <Equite fairness={profil.fairness} />}

            <Bloc titre="Importance des critères">
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: '0 0 var(--app-space-4)', lineHeight: 1.5,
              }}>
                Ces valeurs sont relatives : augmenter un critère diminue le poids
                des autres.
              </p>

              <div style={{ display: 'grid', gap: 'var(--app-space-5)' }}>
                {ORDRE_CRITERES.map(cle => (
                  <div key={cle} style={{ minWidth: 0 }}>
                    <label
                      htmlFor={`poids-${cle}`}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        gap: 'var(--app-space-2)', marginBottom: 2,
                      }}
                    >
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
                        {poidsNormalises[cle] ?? 0} %
                      </span>
                    </label>
                    <input
                      id={`poids-${cle}`}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={poids[cle] ?? 0}
                      onChange={e => {
                        setEnregistrement({ nom: 'repos' })
                        setPoids(p => ({ ...p, [cle]: Number(e.target.value) }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </Bloc>

            <Preferences profil={profil} />
            <Contraintes profil={profil} />

            {profil.onboarding_done === false && (
              <Carte style={{ borderColor: 'var(--app-warning)', background: 'rgba(251, 191, 36, 0.1)' }}>
                <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-warning)', lineHeight: 1.5 }}>
                  Votre profil n&apos;est pas complet. Tant qu&apos;il ne l&apos;est pas, des
                  préférences neutres sont utilisées pour vous dans les calculs.
                </span>
              </Carte>
            )}
          </div>

          {(modifie || enregistrement.nom !== 'repos') && (
            <BarreEnregistrement
              etat={enregistrement}
              onEnregistrer={enregistrer}
              onAnnuler={() => {
                setPoids({ ...POIDS_PAR_DEFAUT, ...(profil.weights ?? {}) })
                setEnregistrement({ nom: 'repos' })
              }}
            />
          )}
        </>
      )}
    </Ecran>
  )
}

function BarreEnregistrement({
  etat, onEnregistrer, onAnnuler,
}: {
  etat: Enregistrement
  onEnregistrer: () => void
  onAnnuler: () => void
}) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: 'calc(var(--app-nav-height) + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
        padding: 'var(--app-space-3) var(--app-space-5)',
        background: 'var(--app-bg-elev)',
        borderTop: '1px solid var(--app-border)',
      }}
    >
      <div style={{
        maxWidth: 560, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 'var(--app-space-3)',
        flexWrap: 'wrap',
      }}>
        {etat.nom === 'echec' && (
          <span style={{
            flex: '1 1 100%', minWidth: 0, overflowWrap: 'anywhere',
            fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
          }}>
            {etat.message}
          </span>
        )}

        {etat.nom === 'fait' ? (
          <span style={{
            flex: 1, minWidth: 0, textAlign: 'center',
            fontSize: 'var(--app-text-sm)', fontWeight: 700,
            color: 'var(--app-success)',
          }}>
            Préférences enregistrées
          </span>
        ) : (
          <>
            <button
              onClick={onAnnuler}
              disabled={etat.nom === 'encours'}
              style={{
                flex: '0 0 auto', padding: '0 var(--app-space-4)',
                borderRadius: 'var(--app-radius-sm)',
                border: '1.5px solid var(--app-border-strong)',
                background: 'transparent', color: 'var(--app-text-muted)',
                fontSize: 'var(--app-text-sm)', fontWeight: 600,
                cursor: etat.nom === 'encours' ? 'default' : 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={onEnregistrer}
              disabled={etat.nom === 'encours'}
              style={{
                flex: 1, minWidth: 0,
                borderRadius: 'var(--app-radius-sm)', border: 'none',
                background: etat.nom === 'encours' ? 'var(--app-surface-2)' : 'var(--app-grad)',
                color: etat.nom === 'encours' ? 'var(--app-text-dim)' : 'var(--app-on-primary)',
                fontSize: 'var(--app-text-sm)', fontWeight: 700,
                cursor: etat.nom === 'encours' ? 'default' : 'pointer',
              }}
            >
              {etat.nom === 'encours' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Preferences({ profil }: { profil: ProfilComplet }) {
  const preferences = Object.entries(profil.activity_prefs ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  if (preferences.length === 0) return null

  return (
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
  )
}

function Contraintes({ profil }: { profil: ProfilComplet }) {
  const lignes = [
    profil.distance_max != null ? { cle: 'Distance maximale', valeur: `${profil.distance_max} km` } : null,
    profil.budget != null ? { cle: 'Budget habituel', valeur: `${profil.budget} €` } : null,
    profil.transport ? { cle: 'Transport', valeur: profil.transport } : null,
  ].filter(Boolean) as { cle: string; valeur: string }[]

  if (lignes.length === 0) return null

  return (
    <Bloc titre="Contraintes">
      <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
        {lignes.map(l => (
          <div key={l.cle} style={{
            display: 'flex', justifyContent: 'space-between',
            gap: 'var(--app-space-3)', flexWrap: 'wrap', minWidth: 0,
          }}>
            <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)' }}>
              {l.cle}
            </span>
            <span style={{
              fontSize: 'var(--app-text-sm)', fontWeight: 600,
              color: 'var(--app-text)', textAlign: 'right',
              minWidth: 0, overflowWrap: 'anywhere',
            }}>
              {l.valeur}
            </span>
          </div>
        ))}
      </div>
    </Bloc>
  )
}

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
