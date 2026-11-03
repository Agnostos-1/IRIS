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
  ajusterPoids, arrondirPoids, normaliserPoids,
  CATEGORIES_CONTRAINTES, CONTRAINTES, LIBELLES_CRITERES, NIVEAUX_SOCIAUX,
  ORDRE_CRITERES, POIDS_PAR_DEFAUT, TRANSPORTS,
  enregistrerProfil, type ProfilComplet,
} from '../_lib/profil'

const RI_MIN = 0.5
const RI_MAX = 1.2

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret' }

type Enregistrement =
  | { nom: 'repos' }
  | { nom: 'encours' }
  | { nom: 'fait' }
  | { nom: 'echec'; message: string }

export default function ProfilApp() {
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  // « enregistré » est l'état serveur, « brouillon » ce que l'utilisateur
  // manipule. Comparer les deux donne la détection de modification sans avoir
  // à suivre chaque champ séparément.
  const [enregistre, setEnregistre] = useState<ProfilComplet | null>(null)
  const [brouillon, setBrouillon] = useState<ProfilComplet | null>(null)
  const [sauvegarde, setSauvegarde] = useState<Enregistrement>({ nom: 'repos' })

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
      const recu: ProfilComplet = await reponse.json()
      // Les poids en base peuvent suivre une ancienne échelle : on les ramène
      // à 100 dès le chargement, pour que les curseurs portent le pourcentage.
      const normalise: ProfilComplet = {
        ...recu,
        weights: arrondirPoids(normaliserPoids({ ...POIDS_PAR_DEFAUT, ...(recu.weights ?? {}) })),
        hard_constraints: recu.hard_constraints ?? {},
      }
      setEnregistre(normalise)
      setBrouillon(normalise)
      setEtat({ nom: 'pret' })
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

  const modifie =
    enregistre !== null && brouillon !== null &&
    JSON.stringify(cleDeComparaison(brouillon)) !== JSON.stringify(cleDeComparaison(enregistre))

  function modifier(champs: Partial<ProfilComplet>) {
    setSauvegarde({ nom: 'repos' })
    setBrouillon(b => (b ? { ...b, ...champs } : b))
  }

  async function enregistrer() {
    if (!brouillon) return
    setSauvegarde({ nom: 'encours' })
    try {
      // Les poids partent arrondis : c'est ce qui est affiché, donc ce qui
      // doit être stocké, sans écart entre l'écran et la base.
      const aEnvoyer: ProfilComplet = {
        ...brouillon,
        weights: arrondirPoids(brouillon.weights ?? POIDS_PAR_DEFAUT),
      }
      await enregistrerProfil(aEnvoyer)
      setEnregistre(aEnvoyer)
      setBrouillon(aEnvoyer)
      setSauvegarde({ nom: 'fait' })
      setTimeout(() => setSauvegarde({ nom: 'repos' }), 2200)
    } catch (e) {
      setSauvegarde({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Enregistrement impossible.',
      })
    }
  }

  const barreVisible = modifie || sauvegarde.nom !== 'repos'

  return (
    <Ecran
      titre="Profil"
      sousTitre={enregistre?.display_name ?? 'Vos préférences et vos contraintes'}
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

      {brouillon && (
        <>
          <div style={{
            display: 'grid', gap: 'var(--app-space-3)',
            paddingBottom: barreVisible ? 80 : 0,
          }}>
            {brouillon.fairness && <Equite fairness={brouillon.fairness} />}

            <Bloc titre="Identité">
              <label htmlFor="nom" style={{
                display: 'block', fontSize: 'var(--app-text-sm)',
                color: 'var(--app-text-muted)', marginBottom: 6,
              }}>
                Prénom ou pseudo affiché
              </label>
              <input
                id="nom"
                type="text"
                value={brouillon.display_name ?? ''}
                onChange={e => modifier({ display_name: e.target.value })}
                placeholder="Visible par les autres participants"
                style={champStyle}
              />
            </Bloc>

            <Bloc titre="Importance des critères">
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: '0 0 var(--app-space-4)', lineHeight: 1.5,
              }}>
                Le total fait toujours 100 % : augmenter un critère répartit la
                différence sur les autres.
              </p>

              <div style={{ display: 'grid', gap: 'var(--app-space-5)' }}>
                {ORDRE_CRITERES.map(cle => {
                  const affiche = arrondirPoids(brouillon.weights ?? POIDS_PAR_DEFAUT)
                  return (
                    <div key={cle} style={{ minWidth: 0 }}>
                      <label htmlFor={`poids-${cle}`} style={{
                        display: 'flex', justifyContent: 'space-between',
                        gap: 'var(--app-space-2)', marginBottom: 2,
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
                          {affiche[cle]} %
                        </span>
                      </label>
                      <input
                        id={`poids-${cle}`}
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={affiche[cle]}
                        onChange={e => modifier({
                          weights: ajusterPoids(
                            brouillon.weights ?? POIDS_PAR_DEFAUT,
                            cle,
                            Number(e.target.value),
                          ),
                        })}
                      />
                    </div>
                  )
                })}
              </div>
            </Bloc>

            <Bloc titre="Déplacement">
              <Choix
                options={TRANSPORTS.map(t => ({ valeur: t.valeur, libelle: t.libelle, detail: t.detail }))}
                valeur={brouillon.transport ?? 'transit'}
                onChange={v => modifier({ transport: String(v) })}
              />

              <div style={{ marginTop: 'var(--app-space-5)' }}>
                <label htmlFor="distance" style={{
                  display: 'flex', justifyContent: 'space-between',
                  gap: 'var(--app-space-2)', marginBottom: 2,
                }}>
                  <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text)' }}>
                    Distance maximale confortable
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: 'var(--app-text-sm)',
                    fontWeight: 700, color: 'var(--app-primary)',
                  }}>
                    {brouillon.distance_max ?? 0} km
                  </span>
                </label>
                <input
                  id="distance"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={brouillon.distance_max ?? 20}
                  onChange={e => modifier({ distance_max: Number(e.target.value) })}
                />
                <p style={{
                  fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                  margin: '4px 0 0', lineHeight: 1.5,
                }}>
                  Au-delà, votre score de distance chute fortement.
                </p>
              </div>
            </Bloc>

            <Bloc titre="Budget et ambiance">
              <label htmlFor="budget" style={{
                display: 'block', fontSize: 'var(--app-text-sm)',
                color: 'var(--app-text-muted)', marginBottom: 6,
              }}>
                Budget habituel par sortie, en euros
              </label>
              <input
                id="budget"
                type="number"
                inputMode="numeric"
                min={0}
                step={5}
                value={brouillon.budget ?? ''}
                onChange={e => modifier({
                  budget: e.target.value === '' ? null : Number(e.target.value),
                })}
                style={champStyle}
              />

              <div style={{ marginTop: 'var(--app-space-5)' }}>
                <span style={{
                  display: 'block', fontSize: 'var(--app-text-sm)',
                  color: 'var(--app-text-muted)', marginBottom: 'var(--app-space-2)',
                }}>
                  Ambiance sociale préférée
                </span>
                <Choix
                  options={NIVEAUX_SOCIAUX.map(n => ({
                    valeur: n.valeur, libelle: String(n.valeur), detail: n.libelle,
                  }))}
                  valeur={brouillon.social_level ?? 3}
                  onChange={v => modifier({ social_level: Number(v) })}
                />
              </div>
            </Bloc>

            <Bloc titre="Contraintes fortes">
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: '0 0 var(--app-space-4)', lineHeight: 1.5,
              }}>
                Elles excluent des activités, elles ne les dévaluent pas.
              </p>

              <div style={{ display: 'grid', gap: 'var(--app-space-4)' }}>
                {CATEGORIES_CONTRAINTES.map(categorie => (
                  <div key={categorie} style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--app-text-dim)', marginBottom: 'var(--app-space-2)',
                    }}>
                      {categorie}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
                      {CONTRAINTES.filter(c => c.categorie === categorie).map(contrainte => {
                        const actif = brouillon.hard_constraints?.[contrainte.cle] === true
                        return (
                          <button
                            key={contrainte.cle}
                            type="button"
                            aria-pressed={actif}
                            onClick={() => modifier({
                              hard_constraints: {
                                ...(brouillon.hard_constraints ?? {}),
                                [contrainte.cle]: !actif,
                              },
                            })}
                            style={{
                              minHeight: 38,
                              padding: '0 var(--app-space-3)',
                              borderRadius: 'var(--app-radius-full)',
                              border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border)'}`,
                              background: actif ? 'var(--app-primary)' : 'transparent',
                              color: actif ? 'var(--app-on-primary)' : 'var(--app-text-muted)',
                              fontSize: 'var(--app-text-xs)',
                              fontWeight: actif ? 700 : 500,
                              cursor: 'pointer',
                              minWidth: 0, overflowWrap: 'anywhere',
                            }}
                          >
                            {contrainte.libelle}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Bloc>

            <Preferences profil={brouillon} />

            <Carte style={{ background: 'var(--app-surface-2)' }}>
              <span style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                lineHeight: 1.6,
              }}>
                L&apos;adresse de départ et les préférences par type d&apos;activité se
                modifient encore depuis le site. Elles arriveront ici avec le
                questionnaire guidé.
              </span>
            </Carte>
          </div>

          {barreVisible && (
            <BarreEnregistrement
              etat={sauvegarde}
              onEnregistrer={enregistrer}
              onAnnuler={() => { setBrouillon(enregistre); setSauvegarde({ nom: 'repos' }) }}
            />
          )}
        </>
      )}
    </Ecran>
  )
}

/** Champs réellement modifiables ici — sert à détecter une vraie modification. */
function cleDeComparaison(p: ProfilComplet) {
  return {
    display_name: p.display_name ?? '',
    transport: p.transport ?? '',
    distance_max: p.distance_max ?? null,
    budget: p.budget ?? null,
    social_level: p.social_level ?? null,
    weights: arrondirPoids(p.weights ?? POIDS_PAR_DEFAUT),
    // Les clés à false équivalent à une clé absente : on ne garde que les
    // contraintes actives, triées, sinon un simple aller-retour sur un bouton
    // ferait croire à une modification.
    contraintes: Object.entries(p.hard_constraints ?? {})
      .filter(([, v]) => v === true).map(([k]) => k).sort(),
  }
}

const champStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--app-radius-sm)',
  border: '1.5px solid var(--app-border-strong)',
  background: 'var(--app-bg-elev)',
  color: 'var(--app-text)',
  outline: 'none',
  boxSizing: 'border-box',
}

function Choix({
  options, valeur, onChange,
}: {
  options: { valeur: string | number; libelle: string; detail?: string }[]
  valeur: string | number
  onChange: (v: string | number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
      {options.map(option => {
        const actif = option.valeur === valeur
        return (
          <button
            key={option.valeur}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(option.valeur)}
            style={{
              flex: '1 1 0', minWidth: 72,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              padding: 'var(--app-space-2)',
              borderRadius: 'var(--app-radius-sm)',
              border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border)'}`,
              background: actif ? 'rgba(139, 92, 246, 0.16)' : 'transparent',
              color: actif ? 'var(--app-text)' : 'var(--app-text-muted)',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: 'var(--app-text-sm)', fontWeight: actif ? 700 : 600,
              overflowWrap: 'anywhere',
            }}>
              {option.libelle}
            </span>
            {option.detail && (
              <span style={{ fontSize: 10, color: 'var(--app-text-dim)', overflowWrap: 'anywhere' }}>
                {option.detail}
              </span>
            )}
          </button>
        )
      })}
    </div>
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
        position: 'fixed', left: 0, right: 0,
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
            Profil enregistré
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
