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
import { Carte } from '../../../_components/Ecran'
import {
  DUREES, PHASE_ACTIVITES,
  chargerActivites, formaterCout, formaterDuree, proposerActivite, supprimerActivite,
  type Activite, type DonneesActivites, type TypePrefereGroupe,
} from '../../../_lib/activites'
import { TYPES_ACTIVITE_PAR_DEFAUT, rechercherAdresse, type AdresseTrouvee } from '../../../_lib/profil'

type Etat =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'pret'; donnees: DonneesActivites }

export default function ActivitesApp() {
  const params = useParams<{ id: string }>()
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)

  const charger = useCallback(async () => {
    try {
      setEtat({ nom: 'pret', donnees: await chargerActivites(params.id) })
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

  const donnees = etat.nom === 'pret' ? etat.donnees : null
  const phaseOuverte = donnees !== null && donnees.evenement.phase <= PHASE_ACTIVITES

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
        {donnees?.evenement.name ?? 'Retour'}
      </Link>

      <h1 style={{
        fontSize: 'var(--app-text-xl)', fontWeight: 800, letterSpacing: '-0.02em',
        color: 'var(--app-text)', margin: '0 0 var(--app-space-2)',
      }}>
        Activités
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
          <button onClick={() => { setEtat({ nom: 'chargement' }); charger() }} style={boutonPlein(true)}>
            Réessayer
          </button>
        </Carte>
      )}

      {donnees && (
        <>
          <p style={{
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
            margin: '0 0 var(--app-space-5)', lineHeight: 1.6,
          }}>
            {donnees.activites.length} proposition{donnees.activites.length !== 1 ? 's' : ''}
            {donnees.nbParticipants > 0 && ` · ${donnees.nbParticipants} profil${donnees.nbParticipants > 1 ? 's' : ''} pris en compte`}
          </p>

          <div style={{ display: 'grid', gap: 'var(--app-space-3)', paddingBottom: 'var(--app-space-8)' }}>

            {donnees.typesPreferes.length > 0 && (
              <TypesPreferes types={donnees.typesPreferes} />
            )}

            {phaseOuverte && !formulaireOuvert && (
              <button
                type="button"
                onClick={() => setFormulaireOuvert(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  minHeight: 50, borderRadius: 'var(--app-radius)',
                  border: '1.5px dashed var(--app-border-strong)',
                  background: 'transparent', color: 'var(--app-text-muted)',
                  fontSize: 'var(--app-text-sm)', fontWeight: 700, cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Proposer une activité
              </button>
            )}

            {phaseOuverte && formulaireOuvert && (
              <Formulaire
                evenementId={params.id}
                sousTypesConnus={donnees.sousTypesConnus}
                onAnnule={() => setFormulaireOuvert(false)}
                onCreee={() => { setFormulaireOuvert(false); charger() }}
              />
            )}

            {!phaseOuverte && (
              <Carte style={{ background: 'var(--app-surface-2)' }}>
                <span style={{ fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)', lineHeight: 1.6 }}>
                  La phase Activités est close : les propositions ne sont plus
                  modifiables.
                </span>
              </Carte>
            )}

            {donnees.activites.length === 0 ? (
              <Carte>
                <p style={{
                  fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
                  margin: 0, lineHeight: 1.6,
                }}>
                  Aucune proposition pour l&apos;instant. Chacun peut en ajouter —
                  le moteur combinera ensuite celles qui tiennent ensemble.
                </p>
              </Carte>
            ) : (
              donnees.activites.map(activite => (
                <CarteActivite
                  key={activite.id}
                  activite={activite}
                  estLaMienne={activite.suggested_by === donnees.monId}
                  suppressionPossible={phaseOuverte}
                  evenementId={params.id}
                  onSupprimee={charger}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Types préférés du groupe.
 *
 * La moyenne, et non la médiane, est volontaire : sur un petit groupe la
 * médiane efface un avis dissident, alors que ce classement n'est qu'une
 * suggestion d'idées, pas un mécanisme d'équité.
 */
function TypesPreferes({ types }: { types: TypePrefereGroupe[] }) {
  return (
    <Carte style={{
      padding: 'var(--app-space-4)',
      background: 'linear-gradient(145deg, rgba(124,58,237,0.14), rgba(168,85,247,0.05))',
      borderColor: 'var(--app-border-strong)',
    }}>
      <h2 style={{
        fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--app-text-muted)',
        margin: '0 0 var(--app-space-2)',
      }}>
        Ce qui plairait au groupe
      </h2>
      <p style={{
        fontSize: 'var(--app-text-xs)', color: 'var(--app-text-dim)',
        margin: '0 0 var(--app-space-3)', lineHeight: 1.5,
      }}>
        D&apos;après les profils des participants. Une suggestion d&apos;idées, rien
        de plus : aucun scénario n&apos;en dépend.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
        {types.map((t, i) => (
          <span key={t.type} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--app-text-xs)', fontWeight: 600,
            color: i === 0 ? 'var(--app-on-primary)' : 'var(--app-text)',
            background: i === 0 ? 'var(--app-primary)' : 'var(--app-surface-2)',
            border: `1px solid ${i === 0 ? 'var(--app-primary)' : 'var(--app-border)'}`,
            padding: '5px 10px', borderRadius: 'var(--app-radius-full)',
            minWidth: 0, overflowWrap: 'anywhere',
          }}>
            {t.type}
            <span style={{
              fontWeight: 800,
              color: i === 0 ? 'var(--app-on-primary)' : 'var(--app-primary)',
            }}>
              {Math.round(t.avg)} %
            </span>
          </span>
        ))}
      </div>
    </Carte>
  )
}

function CarteActivite({
  activite, estLaMienne, suppressionPossible, evenementId, onSupprimee,
}: {
  activite: Activite
  estLaMienne: boolean
  suppressionPossible: boolean
  evenementId: string
  onSupprimee: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)

  const details = [
    formaterDuree(activite.duration_minutes),
    formaterCout(activite.cost_per_person),
  ].filter(Boolean) as string[]

  async function supprimer() {
    setEncours(true)
    try {
      await supprimerActivite(evenementId, activite.id)
      onSupprimee()
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : 'Suppression impossible.')
      setEncours(false)
      setConfirme(false)
    }
  }

  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 'var(--app-space-3)', flexWrap: 'wrap',
      }}>
        <h3 style={{
          flex: 1, minWidth: 0, overflowWrap: 'anywhere',
          fontSize: 'var(--app-text-base)', fontWeight: 700,
          color: 'var(--app-text)', margin: 0, lineHeight: 1.3,
        }}>
          {activite.name}
        </h3>
        <span style={{
          flexShrink: 0, fontSize: 'var(--app-text-xs)', fontWeight: 600,
          color: 'var(--app-primary)', background: 'rgba(139, 92, 246, 0.14)',
          padding: '3px 9px', borderRadius: 'var(--app-radius-full)',
          overflowWrap: 'anywhere',
        }}>
          {activite.type}
        </span>
      </div>

      {activite.address && (
        <p style={{
          fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
          margin: 'var(--app-space-2) 0 0', lineHeight: 1.5, overflowWrap: 'anywhere',
        }}>
          {activite.address}
        </p>
      )}

      {details.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)', marginTop: 'var(--app-space-3)' }}>
          {details.map(d => (
            <span key={d} style={{
              fontSize: 'var(--app-text-xs)', color: 'var(--app-text-muted)',
              background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
              padding: '3px 9px', borderRadius: 'var(--app-radius-full)',
            }}>
              {d}
            </span>
          ))}
        </div>
      )}

      {erreur && (
        <p style={{
          fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
          margin: 'var(--app-space-3) 0 0', overflowWrap: 'anywhere',
        }}>
          {erreur}
        </p>
      )}

      {estLaMienne && suppressionPossible && (
        <div style={{ marginTop: 'var(--app-space-3)' }}>
          {!confirme ? (
            <button
              type="button"
              onClick={() => setConfirme(true)}
              style={{
                minHeight: 34, padding: '0 var(--app-space-3)',
                borderRadius: 'var(--app-radius-full)',
                border: '1px solid var(--app-border-strong)',
                background: 'transparent', color: 'var(--app-text-dim)',
                fontSize: 'var(--app-text-xs)', cursor: 'pointer',
              }}
            >
              Retirer ma proposition
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setConfirme(false)}
                style={{
                  flex: 1, minWidth: 100, minHeight: 34,
                  borderRadius: 'var(--app-radius-sm)',
                  border: '1px solid var(--app-border-strong)',
                  background: 'transparent', color: 'var(--app-text-muted)',
                  fontSize: 'var(--app-text-xs)', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Garder
              </button>
              <button
                type="button"
                onClick={supprimer}
                disabled={encours}
                style={{
                  flex: 1, minWidth: 100, minHeight: 34,
                  borderRadius: 'var(--app-radius-sm)', border: 'none',
                  background: 'var(--app-danger)', color: '#1A1130',
                  fontSize: 'var(--app-text-xs)', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {encours ? 'Retrait…' : 'Confirmer'}
              </button>
            </div>
          )}
        </div>
      )}
    </Carte>
  )
}

function Formulaire({
  evenementId, sousTypesConnus, onAnnule, onCreee,
}: {
  evenementId: string
  sousTypesConnus: string[]
  onAnnule: () => void
  onCreee: () => void
}) {
  const [nom, setNom] = useState('')
  const [type, setType] = useState('')
  const [typeParent, setTypeParent] = useState<string | null>(null)
  const [adresse, setAdresse] = useState<AdresseTrouvee | null>(null)
  const [requete, setRequete] = useState('')
  const [resultats, setResultats] = useState<AdresseTrouvee[]>([])
  const [rechercheEnCours, setRechercheEnCours] = useState(false)
  const [duree, setDuree] = useState<number | null>(120)
  const [cout, setCout] = useState('')
  const [envoi, setEnvoi] = useState<'repos' | 'encours' | string>('repos')

  // Types racine, plus les sous-types déjà créés ailleurs dans l'événement :
  // reproposer un sous-type connu évite d'en créer un doublon mal orthographié.
  const choix = [
    ...TYPES_ACTIVITE_PAR_DEFAUT.map(t => ({ cle: t.cle, libelle: t.libelle, parent: null as string | null })),
    ...sousTypesConnus
      .filter(s => !TYPES_ACTIVITE_PAR_DEFAUT.some(t => t.cle === s))
      .map(s => ({ cle: s, libelle: s, parent: null as string | null })),
  ]

  const valide = nom.trim().length > 0 && type.trim().length > 0

  async function chercher() {
    if (requete.trim().length < 3) return
    setRechercheEnCours(true)
    try {
      setResultats(await rechercherAdresse(requete))
    } catch {
      setResultats([])
    } finally {
      setRechercheEnCours(false)
    }
  }

  async function envoyer() {
    if (!valide) return
    setEnvoi('encours')
    try {
      await proposerActivite(evenementId, {
        nom,
        type,
        typeParent,
        adresse: adresse?.libelle ?? null,
        lat: adresse?.lat ?? null,
        lng: adresse?.lng ?? null,
        dureeMinutes: duree,
        coutParPersonne: cout === '' ? null : Number(cout),
      })
      onCreee()
    } catch (e) {
      setEnvoi(e instanceof Error && e.message ? e.message : 'Proposition impossible.')
    }
  }

  return (
    <Carte style={{ padding: 'var(--app-space-4)' }}>
      <h2 style={{
        fontSize: 'var(--app-text-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--app-text-dim)',
        margin: '0 0 var(--app-space-4)',
      }}>
        Proposer une activité
      </h2>

      <input
        type="text"
        value={nom}
        onChange={e => { setNom(e.target.value); setEnvoi('repos') }}
        placeholder="Nom de l'activité"
        style={champStyle}
      />

      <span style={{
        display: 'block', marginTop: 'var(--app-space-4)', marginBottom: 'var(--app-space-2)',
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
      }}>
        Type
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
        {choix.map(c => {
          const actif = type === c.cle
          return (
            <button
              key={c.cle}
              type="button"
              aria-pressed={actif}
              onClick={() => { setType(c.cle); setTypeParent(c.parent); setEnvoi('repos') }}
              style={{
                minHeight: 36, padding: '0 var(--app-space-3)',
                borderRadius: 'var(--app-radius-full)',
                border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border)'}`,
                background: actif ? 'var(--app-primary)' : 'transparent',
                color: actif ? 'var(--app-on-primary)' : 'var(--app-text-muted)',
                fontSize: 'var(--app-text-xs)', fontWeight: actif ? 700 : 500,
                cursor: 'pointer', minWidth: 0, overflowWrap: 'anywhere',
              }}
            >
              {c.libelle}
            </button>
          )
        })}
      </div>

      <span style={{
        display: 'block', marginTop: 'var(--app-space-4)', marginBottom: 'var(--app-space-2)',
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
      }}>
        Lieu, facultatif
      </span>
      {adresse ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--app-space-2)',
          padding: 'var(--app-space-3)', borderRadius: 'var(--app-radius-sm)',
          background: 'var(--app-surface-2)', border: '1px solid var(--app-success)',
        }}>
          <span style={{
            flex: 1, minWidth: 0, overflowWrap: 'anywhere',
            fontSize: 'var(--app-text-sm)', color: 'var(--app-text)', lineHeight: 1.4,
          }}>
            {adresse.libelle}
          </span>
          <button
            type="button"
            onClick={() => setAdresse(null)}
            aria-label="Retirer l'adresse"
            style={{
              flexShrink: 0, minHeight: 30, padding: '0 var(--app-space-3)',
              borderRadius: 'var(--app-radius-full)',
              border: '1px solid var(--app-border-strong)',
              background: 'transparent', color: 'var(--app-text-dim)',
              fontSize: 'var(--app-text-xs)', cursor: 'pointer',
            }}
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={requete}
              onChange={e => setRequete(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); chercher() } }}
              placeholder="Rechercher une adresse"
              style={{ ...champStyle, flex: 1, minWidth: 140, width: 'auto' }}
            />
            <button
              type="button"
              onClick={chercher}
              disabled={requete.trim().length < 3 || rechercheEnCours}
              style={{
                flex: '0 0 auto', padding: '0 var(--app-space-4)',
                borderRadius: 'var(--app-radius-sm)', border: 'none',
                background: requete.trim().length < 3 ? 'var(--app-surface-2)' : 'var(--app-grad)',
                color: requete.trim().length < 3 ? 'var(--app-text-dim)' : 'var(--app-on-primary)',
                fontSize: 'var(--app-text-sm)', fontWeight: 700,
                cursor: requete.trim().length < 3 ? 'default' : 'pointer',
              }}
            >
              {rechercheEnCours ? '…' : 'Chercher'}
            </button>
          </div>
          {resultats.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--app-space-2)', marginTop: 'var(--app-space-2)' }}>
              {resultats.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setAdresse(r); setResultats([]); setRequete('') }}
                  style={{
                    textAlign: 'left', padding: 'var(--app-space-3)',
                    borderRadius: 'var(--app-radius-sm)',
                    border: '1px solid var(--app-border)',
                    background: 'transparent', color: 'var(--app-text-muted)',
                    fontSize: 'var(--app-text-sm)', cursor: 'pointer',
                    lineHeight: 1.4, overflowWrap: 'anywhere', minWidth: 0,
                  }}
                >
                  {r.libelle}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <span style={{
        display: 'block', marginTop: 'var(--app-space-4)', marginBottom: 'var(--app-space-2)',
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
      }}>
        Durée estimée
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
        {DUREES.map(d => {
          const actif = duree === d.minutes
          return (
            <button
              key={d.minutes}
              type="button"
              aria-pressed={actif}
              onClick={() => setDuree(d.minutes)}
              style={{
                flex: 1, minWidth: 62, minHeight: 36,
                borderRadius: 'var(--app-radius-sm)',
                border: `1.5px solid ${actif ? 'var(--app-primary)' : 'var(--app-border)'}`,
                background: actif ? 'rgba(139, 92, 246, 0.16)' : 'transparent',
                color: actif ? 'var(--app-text)' : 'var(--app-text-muted)',
                fontSize: 'var(--app-text-xs)', fontWeight: actif ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {d.libelle}
            </button>
          )
        })}
      </div>

      <label htmlFor="cout" style={{
        display: 'block', marginTop: 'var(--app-space-4)', marginBottom: 'var(--app-space-2)',
        fontSize: 'var(--app-text-sm)', color: 'var(--app-text-muted)',
      }}>
        Coût par personne, facultatif
      </label>
      <input
        id="cout"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={cout}
        onChange={e => setCout(e.target.value)}
        placeholder="0 pour gratuit"
        style={champStyle}
      />

      {typeof envoi === 'string' && envoi !== 'repos' && envoi !== 'encours' && (
        <p style={{
          fontSize: 'var(--app-text-xs)', color: 'var(--app-danger)',
          margin: 'var(--app-space-3) 0 0', overflowWrap: 'anywhere',
        }}>
          {envoi}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--app-space-2)', marginTop: 'var(--app-space-4)' }}>
        <button
          type="button"
          onClick={onAnnule}
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
          onClick={envoyer}
          disabled={!valide || envoi === 'encours'}
          style={boutonPlein(valide && envoi !== 'encours')}
        >
          {envoi === 'encours' ? 'Envoi…' : 'Proposer'}
        </button>
      </div>
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

function boutonPlein(actif: boolean): React.CSSProperties {
  return {
    flex: 1, minWidth: 0,
    borderRadius: 'var(--app-radius-sm)', border: 'none',
    background: actif ? 'var(--app-grad)' : 'var(--app-surface-2)',
    color: actif ? 'var(--app-on-primary)' : 'var(--app-text-dim)',
    fontSize: 'var(--app-text-sm)', fontWeight: 700,
    cursor: actif ? 'pointer' : 'default',
  }
}
