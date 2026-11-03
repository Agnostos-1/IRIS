// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'
import { Carte } from './Ecran'
import {
  PHASE_ANNULATION_BLOQUEE, annulerEvenement, dateVersChamp,
  enregistrerReglages, type ReglagesEvenement,
} from '../_lib/reglages-evenement'

type Sauvegarde =
  | { nom: 'repos' }
  | { nom: 'encours' }
  | { nom: 'fait' }
  | { nom: 'echec'; message: string }

/**
 * Réglages réservés à l'organisateur, regroupés en fin de page pour ne pas
 * encombrer ce qu'un participant vient faire : voir où en est l'événement et
 * répondre.
 */
export default function ReglagesOrganisateur({
  evenementId, phase, initiaux, onEnregistre, onAnnule,
}: {
  evenementId: string
  phase: number
  initiaux: ReglagesEvenement
  onEnregistre: (reglages: ReglagesEvenement) => void
  onAnnule: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [brouillon, setBrouillon] = useState<ReglagesEvenement>(initiaux)
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>({ nom: 'repos' })
  const [confirmeAnnulation, setConfirmeAnnulation] = useState(false)

  const modifie = JSON.stringify(brouillon) !== JSON.stringify(initiaux)
  const annulationPossible = phase < PHASE_ANNULATION_BLOQUEE

  function modifier(champs: Partial<ReglagesEvenement>) {
    setSauvegarde({ nom: 'repos' })
    setBrouillon(b => ({ ...b, ...champs }))
  }

  async function enregistrer() {
    setSauvegarde({ nom: 'encours' })
    try {
      await enregistrerReglages(evenementId, brouillon)
      onEnregistre(brouillon)
      setSauvegarde({ nom: 'fait' })
      setTimeout(() => setSauvegarde({ nom: 'repos' }), 2200)
    } catch (e) {
      setSauvegarde({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Enregistrement impossible.',
      })
    }
  }

  async function annuler() {
    setSauvegarde({ nom: 'encours' })
    try {
      await annulerEvenement(evenementId)
      onAnnule()
    } catch (e) {
      setSauvegarde({
        nom: 'echec',
        message: e instanceof Error && e.message ? e.message : 'Annulation impossible.',
      })
      setConfirmeAnnulation(false)
    }
  }

  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--app-space-3)',
          background: 'transparent', border: 'none', padding: 0,
          color: 'var(--app-text)', cursor: 'pointer', minHeight: 0,
        }}
      >
        <span style={{
          fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--app-text-dim)',
        }}>
          Réglages de l&apos;organisateur
        </span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ flexShrink: 0, transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {ouvert && (
        <div style={{ marginTop: 'var(--app-space-4)', display: 'grid', gap: 'var(--app-space-5)' }}>

          <Interrupteur
            titre="Invitations ouvertes"
            aide="Permet à tous les participants d'inviter, et pas seulement à vous."
            actif={brouillon.openInvite}
            onChange={v => modifier({ openInvite: v })}
          />

          <Interrupteur
            titre="Réponses visibles avant la clôture"
            aide="Chacun voit les disponibilités des autres au fur et à mesure. Désactivé, les réponses restent masquées jusqu'à la clôture."
            actif={brouillon.revealAfterSubmit}
            onChange={v => modifier({ revealAfterSubmit: v })}
          />

          <div style={{ minWidth: 0 }}>
            <label htmlFor="echeance" style={{
              display: 'block', fontSize: 'var(--app-text-sm)',
              color: 'var(--app-text)', marginBottom: 4,
            }}>
              Échéance des réponses
            </label>
            <input
              id="echeance"
              type="date"
              value={dateVersChamp(brouillon.deadline)}
              onChange={e => modifier({ deadline: e.target.value || null })}
              style={champStyle}
            />
            <p style={{
              fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
              margin: '4px 0 0', lineHeight: 1.5,
            }}>
              Sans échéance, aucune relance automatique n&apos;est possible.
            </p>
          </div>

          <Interrupteur
            titre="Relance automatique"
            aide="Un rappel part deux jours avant l'échéance, aux seules personnes n'ayant pas encore répondu."
            actif={brouillon.autoReminder}
            onChange={v => modifier({ autoReminder: v })}
            desactive={!brouillon.deadline}
            raisonDesactive="Fixez d'abord une échéance."
          />

          <div style={{ minWidth: 0 }}>
            <label htmlFor="budget-global" style={{
              display: 'block', fontSize: 'var(--app-text-sm)',
              color: 'var(--app-text)', marginBottom: 4,
            }}>
              Budget indicatif par personne, facultatif
            </label>
            <input
              id="budget-global"
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              value={brouillon.budgetGlobal ?? ''}
              onChange={e => modifier({
                budgetGlobal: e.target.value === '' ? null : Number(e.target.value),
              })}
              placeholder="Laisser vide pour ne rien imposer"
              style={champStyle}
            />
          </div>

          {sauvegarde.nom === 'echec' && (
            <p style={{
              fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
              margin: 0, overflowWrap: 'anywhere',
            }}>
              {sauvegarde.message}
            </p>
          )}

          {(modifie || sauvegarde.nom === 'fait') && (
            <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
              {sauvegarde.nom === 'fait' ? (
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: 'var(--app-text-sm)',
                  fontWeight: 700, color: 'var(--app-success)',
                }}>
                  Réglages enregistrés
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setBrouillon(initiaux); setSauvegarde({ nom: 'repos' }) }}
                    disabled={sauvegarde.nom === 'encours'}
                    style={{
                      flex: '0 0 auto', padding: '0 var(--app-space-4)',
                      borderRadius: 'var(--app-radius-sm)',
                      border: '1.5px solid var(--app-border-strong)',
                      background: 'transparent', color: 'var(--app-text-muted)',
                      fontSize: 'var(--app-text-sm)', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={enregistrer}
                    disabled={sauvegarde.nom === 'encours'}
                    style={{
                      flex: 1, minWidth: 0,
                      borderRadius: 'var(--app-radius-sm)', border: 'none',
                      background: sauvegarde.nom === 'encours' ? 'var(--app-surface-2)' : 'var(--app-grad)',
                      color: sauvegarde.nom === 'encours' ? 'var(--app-text-dim)' : 'var(--app-on-primary)',
                      fontSize: 'var(--app-text-sm)', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {sauvegarde.nom === 'encours' ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </>
              )}
            </div>
          )}

          <div style={{
            paddingTop: 'var(--app-space-4)',
            borderTop: '1px solid var(--app-border)',
          }}>
            {!annulationPossible ? (
              <p style={{
                fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
                margin: 0, lineHeight: 1.5,
              }}>
                L&apos;événement ne peut plus être annulé : les scénarios sont
                calculés. C&apos;est volontaire — annuler à ce stade permettrait
                d&apos;écarter un résultat qui ne conviendrait pas.
              </p>
            ) : !confirmeAnnulation ? (
              <button
                type="button"
                onClick={() => setConfirmeAnnulation(true)}
                style={{
                  width: '100%', borderRadius: 'var(--app-radius-sm)',
                  border: '1.5px solid var(--app-danger)',
                  background: 'transparent', color: 'var(--app-danger)',
                  fontSize: 'var(--app-text-sm)', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Annuler l&apos;événement
              </button>
            ) : (
              <>
                <p style={{
                  fontSize: 'var(--app-text-sm)', color: 'var(--app-text)',
                  margin: '0 0 var(--app-space-3)', lineHeight: 1.5,
                }}>
                  Annuler définitivement ? Tous les participants le verront
                  comme annulé, et c&apos;est irréversible.
                </p>
                <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmeAnnulation(false)}
                    style={{
                      flex: 1, minWidth: 0, borderRadius: 'var(--app-radius-sm)',
                      border: '1.5px solid var(--app-border-strong)',
                      background: 'transparent', color: 'var(--app-text-muted)',
                      fontSize: 'var(--app-text-sm)', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Garder
                  </button>
                  <button
                    type="button"
                    onClick={annuler}
                    disabled={sauvegarde.nom === 'encours'}
                    style={{
                      flex: 1, minWidth: 0, borderRadius: 'var(--app-radius-sm)',
                      border: 'none', background: 'var(--app-danger)',
                      color: '#1A1130', fontSize: 'var(--app-text-sm)',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {sauvegarde.nom === 'encours' ? 'Annulation…' : 'Confirmer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Carte>
  )
}

function Interrupteur({
  titre, aide, actif, onChange, desactive, raisonDesactive,
}: {
  titre: string
  aide: string
  actif: boolean
  onChange: (v: boolean) => void
  desactive?: boolean
  raisonDesactive?: string
}) {
  return (
    <div style={{ minWidth: 0, opacity: desactive ? 0.5 : 1 }}>
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        disabled={desactive}
        onClick={() => onChange(!actif)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--app-space-3)',
          background: 'transparent', border: 'none', padding: 0,
          cursor: desactive ? 'default' : 'pointer', minHeight: 0, textAlign: 'left',
        }}
      >
        <span style={{
          flex: 1, minWidth: 0, overflowWrap: 'anywhere',
          fontSize: 'var(--app-text-sm)', color: 'var(--app-text)',
        }}>
          {titre}
        </span>
        <span style={{
          flexShrink: 0, width: 42, height: 24,
          borderRadius: 'var(--app-radius-full)',
          background: actif ? 'var(--app-primary)' : 'var(--app-surface-2)',
          border: `1px solid ${actif ? 'var(--app-primary)' : 'var(--app-border-strong)'}`,
          display: 'flex', alignItems: 'center',
          justifyContent: actif ? 'flex-end' : 'flex-start',
          padding: 2, transition: 'background .15s',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 'var(--app-radius-full)',
            background: actif ? 'var(--app-on-primary)' : 'var(--app-text-dim)',
          }} />
        </span>
      </button>
      <p style={{
        fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
        margin: '4px 0 0', lineHeight: 1.5, overflowWrap: 'anywhere',
      }}>
        {desactive && raisonDesactive ? raisonDesactive : aide}
      </p>
    </div>
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
