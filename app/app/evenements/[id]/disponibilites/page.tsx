// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Carte } from '../../../_components/Ecran'
import {
  PROBA_DEFAUT, PROBA_MAX, PROBA_MIN, PROBA_PAS, STATUTS,
  enregistrerDisponibilites, scoreDate,
  type Creneau, type MesDisponibilites, type Statut,
} from '../../../_lib/disponibilites'

type DateProposee = string | { date?: string; label?: string; startTime?: string; endTime?: string }

type LigneParticipant = {
  userId: string
  displayName: string
  email?: string
  statuses: Record<string, Statut>
  probas: Record<string, number>
  slots: Record<string, Creneau>
  budget?: number
  startAddress?: string
  submitted: boolean
}

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; nomEvenement: string; dates: { date: string; label: string }[]; participants: LigneParticipant[] }

type Envoi = { nom: 'repos' } | { nom: 'encours' } | { nom: 'fait' } | { nom: 'echec'; message: string }

export default function DisponibilitesApp() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  const [envoi, setEnvoi] = useState<Envoi>({ nom: 'repos' })
  const [dispos, setDispos] = useState<MesDisponibilites | null>(null)

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch(`/api/events/${params.id}`)
      if (!reponse.ok) {
        throw new Error(
          reponse.status === 401 ? 'Votre session a expiré. Reconnectez-vous.'
          : reponse.status === 404 ? 'Cet événement est introuvable.'
          : `Le serveur a répondu ${reponse.status}.`
        )
      }
      const d = await reponse.json()

      const dates = (d.event.proposedDates as DateProposee[])
        .map(p => typeof p === 'string'
          ? { date: p, label: p }
          : { date: p.date ?? '', label: p.label ?? p.date ?? '' })
        .filter(p => p.date)

      const participants: LigneParticipant[] = d.availabilities ?? []

      // La route ne renvoie l'adresse électronique que pour la ligne de
      // l'utilisateur courant : c'est le seul marqueur disponible pour
      // reconnaître sa propre ligne sans exposer d'identifiant.
      const moi = participants.find(p => p.email !== undefined)

      setDispos({
        statuses: moi?.statuses ?? {},
        probas: moi?.probas ?? {},
        slots: moi?.slots ?? {},
        budget: moi?.budget ?? null,
        startLat: null,
        startLng: null,
        startAddress: moi?.startAddress ?? null,
        submitted: moi?.submitted ?? false,
      })
      setEtat({ nom: 'pret', nomEvenement: d.event.name, dates, participants })
    } catch (e) {
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message ? e.message : 'Connexion impossible.',
      })
    }
  }, [params.id])

  // Les mises à jour d'état suivent toutes l'await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  function definirStatut(date: string, statut: Statut) {
    setEnvoi({ nom: 'repos' })
    setDispos(d => d && ({
      ...d,
      statuses: { ...d.statuses, [date]: statut },
      // Un conditionnel sans probabilité prendrait la valeur par défaut côté
      // serveur ; on la matérialise pour que le curseur affiche la bonne.
      probas: statut === 'cond' && d.probas[date] === undefined
        ? { ...d.probas, [date]: PROBA_DEFAUT }
        : d.probas,
    }))
  }

  async function envoyer(ferme: boolean) {
    if (!dispos) return
    setEnvoi({ nom: 'encours' })
    try {
      await enregistrerDisponibilites(params.id, { ...dispos, submitted: ferme })
      setDispos(d => d && { ...d, submitted: ferme })
      setEnvoi({ nom: 'fait' })
      if (ferme) {
        // Réponse ferme : on revient à l'événement, où le compteur de
        // participants ayant répondu reflète aussitôt l'envoi.
        setTimeout(() => router.push(`/app/evenements/${params.id}`), 700)
      } else {
        setTimeout(() => setEnvoi({ nom: 'repos' }), 2200)
      }
    } catch (e) {
      setEnvoi({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Enregistrement impossible.',
      })
    }
  }

  const toutesRenseignees =
    etat.nom === 'pret' && dispos !== null &&
    etat.dates.every(d => dispos.statuses[d.date] !== undefined)

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto', minWidth: 0,
      padding: 'calc(env(safe-area-inset-top, 0px) + var(--app-space-5)) var(--app-space-5) 0',
    }}>
      <Link href={`/app/evenements/${params.id}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
        textDecoration: 'none', marginBottom: 'var(--app-space-4)',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {etat.nom === 'pret' ? etat.nomEvenement : 'Retour'}
      </Link>

      <h1 style={{
        fontSize: 'var(--app-text-xl)', fontWeight: 800, letterSpacing: '-0.02em',
        color: 'var(--app-text)', margin: '0 0 var(--app-space-2)',
      }}>
        Mes disponibilités
      </h1>

      {etat.nom === 'chargement' && (
        <Carte><div style={{ height: 16, width: '50%', borderRadius: 6, background: 'var(--app-surface-2)' }} /></Carte>
      )}

      {etat.nom === 'erreur' && (
        <Carte>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: '0 0 var(--app-space-4)', lineHeight: 1.6,
          }}>
            {etat.message}
          </p>
          <button onClick={() => { setEtat({ nom: 'chargement' }); charger() }} style={boutonPrincipal(true)}>
            Réessayer
          </button>
        </Carte>
      )}

      {etat.nom === 'pret' && dispos && (
        <>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: '0 0 var(--app-space-5)', lineHeight: 1.6,
          }}>
            {dispos.submitted
              ? 'Votre réponse est enregistrée. Vous pouvez encore la modifier.'
              : 'Indiquez pour chaque date si vous êtes disponible.'}
          </p>

          <div style={{ display: 'grid', gap: 'var(--app-space-3)', paddingBottom: 110 }}>
            {etat.dates.map(d => (
              <CarteDate
                key={d.date}
                date={d}
                statut={dispos.statuses[d.date]}
                proba={dispos.probas[d.date] ?? PROBA_DEFAUT}
                creneau={dispos.slots[d.date]}
                autres={scoreDate(d.date, etat.participants)}
                onStatut={s => definirStatut(d.date, s)}
                onProba={p => {
                  setEnvoi({ nom: 'repos' })
                  setDispos(x => x && ({ ...x, probas: { ...x.probas, [d.date]: p } }))
                }}
                onCreneau={c => {
                  setEnvoi({ nom: 'repos' })
                  setDispos(x => {
                    if (!x) return x
                    const slots = { ...x.slots }
                    if (c) slots[d.date] = c
                    else delete slots[d.date]
                    return { ...x, slots }
                  })
                }}
              />
            ))}

            <Bloc titre="Budget pour cette sortie, facultatif">
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: '0 0 var(--app-space-3)', lineHeight: 1.5,
              }}>
                Seul le budget le plus bas du groupe filtre les scénarios. Votre
                montant n&apos;est jamais montré aux autres ; seule la médiane du
                groupe l&apos;est.
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={5}
                value={dispos.budget ?? ''}
                onChange={e => {
                  setEnvoi({ nom: 'repos' })
                  const v = e.target.value
                  setDispos(x => x && ({ ...x, budget: v === '' ? null : Number(v) }))
                }}
                placeholder="Laisser vide pour utiliser celui de votre profil"
                style={champStyle}
              />
            </Bloc>
          </div>

          <div style={{
            position: 'fixed', left: 0, right: 0,
            bottom: 'calc(var(--app-nav-height) + env(safe-area-inset-bottom, 0px))',
            zIndex: 40, padding: 'var(--app-space-3) var(--app-space-5)',
            background: 'var(--app-bg-elev)', borderTop: '1px solid var(--app-border)',
          }}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              {envoi.nom === 'echec' && (
                <p style={{
                  fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
                  margin: '0 0 var(--app-space-2)', overflowWrap: 'anywhere',
                }}>
                  {envoi.message}
                </p>
              )}
              {envoi.nom === 'fait' && (
                <p style={{
                  fontSize: 'var(--app-text-xs)', color: 'var(--app-success)',
                  margin: '0 0 var(--app-space-2)', fontWeight: 700,
                }}>
                  Enregistré.
                </p>
              )}
              {!toutesRenseignees && envoi.nom !== 'fait' && (
                <p style={{
                  fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                  margin: '0 0 var(--app-space-2)',
                }}>
                  Renseignez toutes les dates pour envoyer une réponse ferme.
                </p>
              )}
              <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
                <button
                  onClick={() => envoyer(false)}
                  disabled={envoi.nom === 'encours'}
                  style={{
                    flex: '0 0 auto', padding: '0 var(--app-space-4)',
                    borderRadius: 'var(--app-radius-sm)',
                    border: '1.5px solid var(--app-border-strong)',
                    background: 'transparent', color: 'var(--app-text-muted)',
                    fontSize: 'var(--app-text-sm)', fontWeight: 600,
                    cursor: envoi.nom === 'encours' ? 'default' : 'pointer',
                  }}
                >
                  Brouillon
                </button>
                <button
                  onClick={() => envoyer(true)}
                  disabled={!toutesRenseignees || envoi.nom === 'encours'}
                  style={boutonPrincipal(toutesRenseignees && envoi.nom !== 'encours')}
                >
                  {envoi.nom === 'encours' ? 'Envoi…' : 'Valider ma réponse'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CarteDate({
  date, statut, proba, creneau, autres, onStatut, onProba, onCreneau,
}: {
  date: { date: string; label: string }
  statut: Statut | undefined
  proba: number
  creneau: Creneau | undefined
  autres: { score: number; ok: number; cond: number; no: number }
  onStatut: (s: Statut) => void
  onProba: (p: number) => void
  onCreneau: (c: Creneau | null) => void
}) {
  const [creneauOuvert, setCreneauOuvert] = useState(creneau !== undefined)

  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 'var(--app-space-2)', flexWrap: 'wrap', marginBottom: 'var(--app-space-3)',
      }}>
        <span style={{
          flex: 1, minWidth: 0, overflowWrap: 'anywhere',
          fontSize: 'var(--app-text-base)', fontWeight: 700, color: 'var(--app-text)',
        }}>
          {date.label}
        </span>
        <span style={{ flexShrink: 0, fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)' }}>
          {autres.ok} sur {autres.ok + autres.cond + autres.no}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
        {STATUTS.map(option => {
          const actif = statut === option.valeur
          return (
            <button
              key={option.valeur}
              type="button"
              aria-pressed={actif}
              onClick={() => onStatut(option.valeur)}
              style={{
                flex: 1, minWidth: 0, padding: 'var(--app-space-2)',
                borderRadius: 'var(--app-radius-sm)',
                border: `1.5px solid ${actif ? option.couleur : 'var(--app-border)'}`,
                background: actif ? option.fond : 'transparent',
                color: actif ? option.couleur : 'var(--app-text-muted)',
                fontSize: 'var(--app-text-xs)', fontWeight: actif ? 700 : 600,
                cursor: 'pointer', overflowWrap: 'anywhere',
              }}
            >
              {option.libelle}
            </button>
          )
        })}
      </div>

      {statut === 'cond' && (
        <div style={{ marginTop: 'var(--app-space-4)' }}>
          <label htmlFor={`proba-${date.date}`} style={{
            display: 'flex', justifyContent: 'space-between', gap: 'var(--app-space-2)',
          }}>
            <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)' }}>
              Probabilité de venir
            </span>
            <span style={{ fontSize: 'var(--app-text-sm)', fontWeight: 700, color: 'var(--app-primary)' }}>
              {proba} %
            </span>
          </label>
          <input
            id={`proba-${date.date}`}
            type="range"
            min={PROBA_MIN}
            max={PROBA_MAX}
            step={PROBA_PAS}
            value={proba}
            onChange={e => onProba(Number(e.target.value))}
          />
          <p style={{
            fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
            margin: '4px 0 0', lineHeight: 1.5,
          }}>
            Votre présence compte pour {(proba / 100).toFixed(2)} dans le score de
            cette date, au lieu de 1.
          </p>
        </div>
      )}

      {statut !== undefined && statut !== 'no' && (
        <div style={{ marginTop: 'var(--app-space-4)' }}>
          {!creneauOuvert ? (
            <button
              type="button"
              onClick={() => { setCreneauOuvert(true); onCreneau({ start: '10:00', end: '18:00' }) }}
              style={{
                width: '100%', borderRadius: 'var(--app-radius-sm)',
                border: '1.5px dashed var(--app-border-strong)',
                background: 'transparent', color: 'var(--app-text-muted)',
                fontSize: 'var(--app-text-xs)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Je ne suis libre qu&apos;à certaines heures
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
                <input
                  type="time"
                  value={creneau?.start ?? '10:00'}
                  onChange={e => onCreneau({ start: e.target.value, end: creneau?.end ?? '18:00' })}
                  aria-label={`Disponible à partir de, ${date.label}`}
                  style={{ ...champStyle, flex: '1 1 0', minWidth: 104, width: 'auto' }}
                />
                <span style={{ color: 'var(--app-text-dim)' }}>→</span>
                <input
                  type="time"
                  value={creneau?.end ?? '18:00'}
                  onChange={e => onCreneau({ start: creneau?.start ?? '10:00', end: e.target.value })}
                  aria-label={`Disponible jusqu'à, ${date.label}`}
                  style={{ ...champStyle, flex: '1 1 0', minWidth: 104, width: 'auto' }}
                />
              </div>
              <button
                type="button"
                onClick={() => { setCreneauOuvert(false); onCreneau(null) }}
                style={{
                  marginTop: 'var(--app-space-2)', minHeight: 32,
                  padding: '0 var(--app-space-3)',
                  borderRadius: 'var(--app-radius-full)',
                  border: '1px solid var(--app-border-strong)',
                  background: 'transparent', color: 'var(--app-text-dim)',
                  fontSize: 'var(--app-text-xs)', cursor: 'pointer',
                }}
              >
                Toute la journée finalement
              </button>
            </>
          )}
        </div>
      )}
    </Carte>
  )
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

function boutonPrincipal(actif: boolean): React.CSSProperties {
  return {
    flex: 1, minWidth: 0,
    borderRadius: 'var(--app-radius-sm)', border: 'none',
    background: actif ? 'var(--app-grad)' : 'var(--app-surface-2)',
    color: actif ? 'var(--app-on-primary)' : 'var(--app-text-dim)',
    fontSize: 'var(--app-text-sm)', fontWeight: 700,
    cursor: actif ? 'pointer' : 'default',
  }
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
