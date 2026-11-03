// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Carte } from '../../_components/Ecran'
import {
  HEURE_DEBUT_DEFAUT, HEURE_FIN_DEFAUT,
  aujourdhui, creerEvenement, fenetreMinutes, formaterLibelleDate, listerGroupes,
  type Creneau, type Groupe,
} from '../../_lib/evenement'

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; groupes: Groupe[] }

type Envoi =
  | { nom: 'repos' }
  | { nom: 'encours' }
  | { nom: 'echec'; message: string }

export default function NouvelEvenementApp() {
  const router = useRouter()
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  const [envoi, setEnvoi] = useState<Envoi>({ nom: 'repos' })

  const [nom, setNom] = useState('')
  const [groupeIds, setGroupeIds] = useState<string[]>([])
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [dateSaisie, setDateSaisie] = useState('')

  const charger = useCallback(async () => {
    try {
      const groupes = await listerGroupes()
      setEtat({ nom: 'pret', groupes })
      // Un seul groupe : le présélectionner évite une étape inutile.
      if (groupes.length === 1) setGroupeIds([groupes[0].id])
    } catch (e) {
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message ? e.message : 'Connexion impossible.',
      })
    }
  }, [])

  // Les mises à jour d'état suivent toutes l'await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  function ajouterDate() {
    if (!dateSaisie) return
    if (creneaux.some(c => c.date === dateSaisie)) { setDateSaisie(''); return }
    setCreneaux(c => [...c, {
      date: dateSaisie,
      label: formaterLibelleDate(dateSaisie),
      startTime: HEURE_DEBUT_DEFAUT,
      endTime: HEURE_FIN_DEFAUT,
    }].sort((a, b) => a.date.localeCompare(b.date)))
    setDateSaisie('')
  }

  const valide =
    nom.trim().length > 0 &&
    groupeIds.length > 0 &&
    creneaux.length > 0 &&
    creneaux.every(c => fenetreMinutes(c.startTime, c.endTime) > 0)

  async function creer() {
    if (!valide) return
    setEnvoi({ nom: 'encours' })
    try {
      const id = await creerEvenement({ nom, groupeIds, creneaux })
      router.push(`/app/evenements/${id}`)
    } catch (e) {
      setEnvoi({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Création impossible.',
      })
    }
  }

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto', minWidth: 0,
      padding: 'calc(env(safe-area-inset-top, 0px) + var(--app-space-5)) var(--app-space-5) 0',
    }}>
      <Link href="/app/evenements" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
        textDecoration: 'none', marginBottom: 'var(--app-space-4)',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Événements
      </Link>

      <h1 style={{
        fontSize: 'var(--app-text-xl)', fontWeight: 800, letterSpacing: '-0.02em',
        color: 'var(--app-text)', margin: '0 0 var(--app-space-5)',
      }}>
        Nouvel événement
      </h1>

      {etat.nom === 'chargement' && (
        <Carte>
          <div style={{ height: 16, width: '50%', borderRadius: 6, background: 'var(--app-surface-2)' }} />
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
          <button onClick={() => { setEtat({ nom: 'chargement' }); charger() }} style={boutonPrincipal(true)}>
            Réessayer
          </button>
        </Carte>
      )}

      {etat.nom === 'pret' && etat.groupes.length === 0 && (
        <Carte>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: 0, lineHeight: 1.6,
          }}>
            Un événement appartient toujours à un groupe — c&apos;est ce qui permet
            de suivre l&apos;historique et de calculer l&apos;équité entre participants.
            Créez d&apos;abord un groupe depuis le site, puis partagez son lien
            d&apos;invitation.
          </p>
        </Carte>
      )}

      {etat.nom === 'pret' && etat.groupes.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--app-space-3)', paddingBottom: 96 }}>

          <Bloc titre="Nom">
            <input
              type="text"
              value={nom}
              onChange={e => { setEnvoi({ nom: 'repos' }); setNom(e.target.value) }}
              placeholder="Week-end entre amis"
              style={champStyle}
            />
          </Bloc>

          <Bloc titre={etat.groupes.length > 1 ? 'Groupes conviés' : 'Groupe'}>
            <div style={{ display: 'grid', gap: 'var(--app-space-2)' }}>
              {etat.groupes.map(groupe => {
                const actif = groupeIds.includes(groupe.id)
                return (
                  <button
                    key={groupe.id}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => {
                      setEnvoi({ nom: 'repos' })
                      setGroupeIds(ids => actif ? ids.filter(i => i !== groupe.id) : [...ids, groupe.id])
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--app-space-3)',
                      textAlign: 'left', padding: 'var(--app-space-3)',
                      borderRadius: 'var(--app-radius-sm)',
                      border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border)'}`,
                      background: actif ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                      cursor: 'pointer', minWidth: 0,
                    }}
                  >
                    <Coche actif={actif} />
                    <span style={{
                      flex: 1, minWidth: 0, overflowWrap: 'anywhere',
                      fontSize: 'var(--app-text-sm)', fontWeight: actif ? 700 : 500,
                      color: actif ? 'var(--app-text)' : 'var(--app-text-muted)',
                    }}>
                      {groupe.name}
                    </span>
                  </button>
                )
              })}
            </div>
            {groupeIds.length > 1 && (
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: 'var(--app-space-3) 0 0', lineHeight: 1.5,
              }}>
                Les membres de tous les groupes choisis seront conviés.
              </p>
            )}
          </Bloc>

          <Bloc titre="Dates proposées">
            <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={dateSaisie}
                min={aujourdhui()}
                onChange={e => setDateSaisie(e.target.value)}
                style={{ ...champStyle, flex: 1, minWidth: 150, width: 'auto' }}
              />
              <button
                type="button"
                onClick={ajouterDate}
                disabled={!dateSaisie}
                style={{
                  flex: '0 0 auto', padding: '0 var(--app-space-4)',
                  borderRadius: 'var(--app-radius-sm)', border: 'none',
                  background: dateSaisie ? 'var(--app-grad)' : 'var(--app-surface-2)',
                  color: dateSaisie ? 'var(--app-on-primary)' : 'var(--app-text-dim)',
                  fontSize: 'var(--app-text-sm)', fontWeight: 700,
                  cursor: dateSaisie ? 'pointer' : 'default',
                }}
              >
                Ajouter
              </button>
            </div>

            {creneaux.length === 0 ? (
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: 'var(--app-space-3) 0 0', lineHeight: 1.5,
              }}>
                Proposez une ou plusieurs dates. Les participants indiqueront
                ensuite lesquelles leur conviennent.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--app-space-2)', marginTop: 'var(--app-space-3)' }}>
                {creneaux.map(creneau => (
                  <LigneCreneau
                    key={creneau.date}
                    creneau={creneau}
                    onChange={modifie => setCreneaux(cs => cs.map(c => c.date === creneau.date ? modifie : c))}
                    onRetirer={() => setCreneaux(cs => cs.filter(c => c.date !== creneau.date))}
                  />
                ))}
              </div>
            )}
          </Bloc>

          <Carte style={{ background: 'var(--app-surface-2)' }}>
            <span style={{
              fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)', lineHeight: 1.6,
            }}>
              Budget, quorum, lieu et invitations par courriel se règlent ensuite
              depuis la page de l&apos;événement.
            </span>
          </Carte>
        </div>
      )}

      {etat.nom === 'pret' && etat.groupes.length > 0 && (
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
            <button
              onClick={creer}
              disabled={!valide || envoi.nom === 'encours'}
              style={boutonPrincipal(valide && envoi.nom !== 'encours')}
            >
              {envoi.nom === 'encours' ? 'Création…' : "Créer l'événement"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LigneCreneau({
  creneau, onChange, onRetirer,
}: {
  creneau: Creneau
  onChange: (c: Creneau) => void
  onRetirer: () => void
}) {
  const duree = fenetreMinutes(creneau.startTime, creneau.endTime)
  const invalide = duree <= 0

  return (
    <div style={{
      padding: 'var(--app-space-3)',
      borderRadius: 'var(--app-radius-sm)',
      border: `1px solid ${invalide ? 'var(--app-danger)' : 'var(--app-border)'}`,
      background: 'var(--app-surface-2)',
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--app-space-2)', marginBottom: 'var(--app-space-2)', flexWrap: 'wrap',
      }}>
        <span style={{
          flex: 1, minWidth: 0, overflowWrap: 'anywhere',
          fontSize: 'var(--app-text-sm)', fontWeight: 700, color: 'var(--app-text)',
        }}>
          {creneau.label}
        </span>
        <button
          type="button"
          onClick={onRetirer}
          aria-label={`Retirer ${creneau.label}`}
          style={{
            flexShrink: 0, minHeight: 32, padding: '0 var(--app-space-3)',
            borderRadius: 'var(--app-radius-full)',
            border: '1px solid var(--app-border-strong)',
            background: 'transparent', color: 'var(--app-text-dim)',
            fontSize: 'var(--app-text-xs)', cursor: 'pointer',
          }}
        >
          Retirer
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
        <input
          type="time"
          value={creneau.startTime}
          onChange={e => onChange({ ...creneau, startTime: e.target.value })}
          aria-label={`Heure de début, ${creneau.label}`}
          style={{ ...champStyle, flex: '1 1 0', minWidth: 104, width: 'auto' }}
        />
        <span style={{ color: 'var(--app-text-dim)', fontSize: 'var(--app-text-sm)' }}>→</span>
        <input
          type="time"
          value={creneau.endTime}
          onChange={e => onChange({ ...creneau, endTime: e.target.value })}
          aria-label={`Heure de fin, ${creneau.label}`}
          style={{ ...champStyle, flex: '1 1 0', minWidth: 104, width: 'auto' }}
        />
      </div>

      {invalide && (
        <p style={{
          fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
          margin: 'var(--app-space-2) 0 0',
        }}>
          L&apos;heure de fin doit suivre l&apos;heure de début.
        </p>
      )}
    </div>
  )
}

function Coche({ actif }: { actif: boolean }) {
  return (
    <span aria-hidden="true" style={{
      flexShrink: 0, width: 20, height: 20, borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border-strong)'}`,
      background: actif ? 'var(--app-primary)' : 'transparent',
    }}>
      {actif && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--app-on-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
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
    width: '100%',
    borderRadius: 'var(--app-radius-sm)',
    border: 'none',
    background: actif ? 'var(--app-grad)' : 'var(--app-surface-2)',
    color: actif ? 'var(--app-on-primary)' : 'var(--app-text-dim)',
    fontSize: 'var(--app-text-sm)',
    fontWeight: 700,
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
