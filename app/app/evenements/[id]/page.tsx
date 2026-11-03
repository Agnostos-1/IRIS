// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Carte } from '../../_components/Ecran'
import Invitation from '../../_components/Invitation'
import ReglagesOrganisateur from '../../_components/ReglagesOrganisateur'
import { DERNIERE_PHASE, phaseDe } from '../../_lib/phases'

type DateProposee = string | { date?: string; label?: string }

type Evenement = {
  id: string
  name: string
  description: string | null
  phase: number
  proposedDates: DateProposee[]
  location: string | null
  deadline: string | null
  groupNames: string[]
  cancelledAt: string | null
  inviteCode: string | null
  createdBy: string
  openInvite: boolean
  autoReminder: boolean
  revealAfterSubmit: boolean
  budgetGlobal: number | null
  budgetOverrunPct: number
}

type Disponibilite = {
  email?: string
  userId: string
  displayName: string
  submitted: boolean
}

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; evenement: Evenement; disponibilites: Disponibilite[]; budgetMedian: number | null }

export default function DetailEvenementApp() {
  const params = useParams<{ id: string }>()
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })

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
      setEtat({
        nom: 'pret',
        evenement: d.event,
        disponibilites: d.availabilities ?? [],
        budgetMedian: d.medianBudget ?? null,
      })
    } catch (e) {
      setEtat({
        nom: 'erreur',
        message: e instanceof Error && e.message ? e.message : 'Connexion impossible.',
      })
    }
  }, [params.id])

  // Même raison qu'à la liste : les mises à jour d'état suivent toutes l'await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

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

      {etat.nom === 'chargement' && (
        <Carte>
          <div style={{ height: 18, width: '65%', borderRadius: 6, background: 'var(--app-surface-2)' }} />
          <div style={{ height: 11, width: '40%', borderRadius: 6, marginTop: 12, background: 'var(--app-surface-2)' }} />
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

      {etat.nom === 'pret' && (
        <Contenu
          evenement={etat.evenement}
          disponibilites={etat.disponibilites}
          budgetMedian={etat.budgetMedian}
          onEvenementChange={evenement => setEtat(e => e.nom === 'pret' ? { ...e, evenement } : e)}
        />
      )}
    </div>
  )
}

function Contenu({
  evenement, disponibilites, budgetMedian, onEvenementChange,
}: {
  evenement: Evenement
  disponibilites: Disponibilite[]
  budgetMedian: number | null
  onEvenementChange: (evenement: Evenement) => void
}) {
  const phase  = phaseDe(evenement.phase)
  const etape  = Math.min(Math.max(evenement.phase, 0), DERNIERE_PHASE)
  const repondu = disponibilites.filter(d => d.submitted).length

  // La route ne renvoie l'adresse électronique que pour la ligne de
  // l'utilisateur courant : c'est ce qui permet de reconnaître sa propre
  // ligne sans qu'aucun identifiant ne transite.
  const maLigne = disponibilites.find(d => d.email !== undefined)
  const jAiRepondu = maLigne?.submitted === true
  const jeSuisOrganisateur = maLigne?.userId === evenement.createdBy

  // Par défaut, seul l'organisateur invite. Il peut ouvrir ce droit à tous.
  const jePeuxInviter = jeSuisOrganisateur || evenement.openInvite

  return (
    <>
      <header style={{ marginBottom: 'var(--app-space-5)' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 'var(--app-space-3)', flexWrap: 'wrap',
        }}>
          <h1 style={{
            flex: 1, minWidth: 0, overflowWrap: 'anywhere',
            fontSize: 'var(--app-text-xl)', fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--app-text)', margin: 0, lineHeight: 1.25,
          }}>
            {evenement.name}
          </h1>
          <span style={{
            flexShrink: 0, fontSize: 'var(--app-text-xs)', fontWeight: 700,
            color: phase.couleur, background: phase.fond,
            padding: '4px 10px', borderRadius: 'var(--app-radius-full)',
          }}>
            {phase.label}
          </span>
        </div>

        {evenement.groupNames.length > 0 && (
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: 'var(--app-space-2) 0 0', overflowWrap: 'anywhere',
          }}>
            {evenement.groupNames.join(' · ')}
          </p>
        )}

        <div style={{
          height: 5, borderRadius: 'var(--app-radius-full)', marginTop: 'var(--app-space-4)',
          background: 'var(--app-surface-2)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${(etape / DERNIERE_PHASE) * 100}%`, height: '100%',
            background: 'var(--app-grad)', borderRadius: 'inherit',
          }} />
        </div>
        <span style={{
          display: 'block', marginTop: 6,
          fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
        }}>
          Étape {etape} sur {DERNIERE_PHASE}
        </span>
      </header>

      {evenement.cancelledAt && (
        <Carte style={{
          marginBottom: 'var(--app-space-4)',
          borderColor: 'var(--app-danger)',
          background: 'rgba(248, 113, 113, 0.1)',
        }}>
          <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-danger)', fontWeight: 700 }}>
            Cet événement a été annulé.
          </span>
        </Carte>
      )}

      <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>

        {evenement.description && (
          <Bloc titre="Description">
            <p style={{
              fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
              margin: 0, lineHeight: 1.6, overflowWrap: 'anywhere',
            }}>
              {evenement.description}
            </p>
          </Bloc>
        )}

        <Bloc titre={`Participants — ${repondu} sur ${disponibilites.length} ont répondu`}>
          <div style={{ display: 'grid', gap: 'var(--app-space-2)' }}>
            {disponibilites.map(d => (
              <div key={d.userId} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--app-space-3)',
                minWidth: 0,
              }}>
                <Pastille repondu={d.submitted} />
                <span style={{
                  flex: 1, minWidth: 0, overflowWrap: 'anywhere',
                  fontSize: 'var(--app-text-sm)',
                  color: d.submitted ? 'var(--app-text)' : 'var(--app-text-dim)',
                }}>
                  {d.displayName}
                </span>
                <span style={{
                  flexShrink: 0, fontSize: 'var(--app-text-xs)',
                  color: d.submitted ? 'var(--app-success)' : 'var(--app-text-dim)',
                }}>
                  {d.submitted ? 'Répondu' : 'En attente'}
                </span>
              </div>
            ))}
            {disponibilites.length === 0 && (
              <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text-dim)' }}>
                Aucun participant pour l&apos;instant.
              </span>
            )}
          </div>
        </Bloc>

        {evenement.proposedDates.length > 0 && !evenement.cancelledAt && (
          <Link
            href={`/app/evenements/${evenement.id}/disponibilites`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 52, borderRadius: 'var(--app-radius)',
              background: jAiRepondu ? 'transparent' : 'var(--app-grad)',
              border: jAiRepondu ? '1.5px solid var(--app-border-strong)' : 'none',
              color: jAiRepondu ? 'var(--app-text)' : 'var(--app-on-primary)',
              fontSize: 'var(--app-text-sm)', fontWeight: 700,
              textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {jAiRepondu ? 'Modifier mes disponibilités' : 'Indiquer mes disponibilités'}
          </Link>
        )}

        {!evenement.cancelledAt && (
          <Link
            href={`/app/evenements/${evenement.id}/activites`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 48, borderRadius: 'var(--app-radius)',
              border: '1.5px solid var(--app-border-strong)',
              background: 'transparent', color: 'var(--app-text)',
              fontSize: 'var(--app-text-sm)', fontWeight: 700,
              textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
            }}
          >
            Voir les activités proposées
          </Link>
        )}

        {evenement.proposedDates.length > 0 && (
          <Bloc titre="Dates proposées">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
              {evenement.proposedDates.map((d, i) => {
                const texte = typeof d === 'string' ? d : (d.label ?? d.date ?? '')
                if (!texte) return null
                return (
                  <span key={i} style={{
                    fontSize: 'var(--app-text-xs)', color: 'var(--app-text)',
                    background: 'var(--app-surface-2)',
                    border: '1px solid var(--app-border)',
                    padding: '5px 10px', borderRadius: 'var(--app-radius-full)',
                    overflowWrap: 'anywhere',
                  }}>
                    {texte}
                  </span>
                )
              })}
            </div>
          </Bloc>
        )}

        {(evenement.location || evenement.deadline || budgetMedian !== null) && (
          <Bloc titre="Informations">
            <div style={{ display: 'grid', gap: 'var(--app-space-3)' }}>
              {evenement.location && <Ligne cle="Lieu" valeur={evenement.location} />}
              {evenement.deadline && (
                <Ligne cle="Échéance" valeur={formaterDate(evenement.deadline)} />
              )}
              {budgetMedian !== null && (
                <Ligne cle="Budget médian du groupe" valeur={`${budgetMedian} €`} />
              )}
            </div>
          </Bloc>
        )}

        {/* Inviter et régler viennent en fin de page : un participant vient
            d'abord voir où en est l'événement et répondre. */}
        {evenement.inviteCode && !evenement.cancelledAt && jePeuxInviter && (
          <Invitation code={evenement.inviteCode} nomEvenement={evenement.name} />
        )}

        {jeSuisOrganisateur && !evenement.cancelledAt && (
          <ReglagesOrganisateur
            evenementId={evenement.id}
            phase={evenement.phase}
            initiaux={{
              description:       evenement.description,
              deadline:          evenement.deadline,
              autoReminder:      evenement.autoReminder,
              revealAfterSubmit: evenement.revealAfterSubmit,
              openInvite:        evenement.openInvite,
              budgetGlobal:      evenement.budgetGlobal,
              budgetOverrunPct:  evenement.budgetOverrunPct,
            }}
            onEnregistre={reglages => onEvenementChange({ ...evenement, ...reglages })}
            onAnnule={() => onEvenementChange({ ...evenement, cancelledAt: new Date().toISOString() })}
          />
        )}
      </div>
    </>
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

function Ligne({ cle, valeur }: { cle: string; valeur: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 'var(--app-space-3)',
      flexWrap: 'wrap', minWidth: 0,
    }}>
      <span style={{ fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)', minWidth: 0 }}>
        {cle}
      </span>
      <span style={{
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text)', fontWeight: 600,
        textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere',
      }}>
        {valeur}
      </span>
    </div>
  )
}

function Pastille({ repondu }: { repondu: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0, width: 20, height: 20, borderRadius: 'var(--app-radius-full)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: repondu ? 'rgba(52, 211, 153, 0.16)' : 'var(--app-surface-2)',
        border: `1px solid ${repondu ? 'var(--app-success)' : 'var(--app-border)'}`,
      }}
    >
      {repondu && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="var(--app-success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  )
}

function formaterDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
