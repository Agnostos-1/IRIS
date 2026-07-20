// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivitySlot {
  id:       string
  name:     string
  type:     string
  duration: number
  cost:     number
  address:  string | null
  lat:      number | null
  lng:      number | null
}

interface TimelineStep {
  actId:        string
  start:        number   // minutes from midnight
  end:          number
  travelBefore: number   // travel+transition minutes before this activity
  waitBefore:   number   // idle time waiting for the activity to open
}

interface Scenario {
  id:               string
  date:             string
  dayLabel:         string
  activityNames:    string[]
  activities:       ActivitySlot[]
  timeline:         TimelineStep[]
  windowStart:      number
  windowEnd:        number
  totalCost:        number
  totalTimeMinutes: number
  totalWaitMinutes: number
  participantCount: number
}

interface EliminatedActivity {
  id:     string
  name:   string
  reason: string
  date:   string
}

interface PageData {
  event:                { id: string; name: string; phase: number; created_by: string }
  scenarios:            Scenario[]
  eliminatedActivities: EliminatedActivity[]
  participantCount:     number
  activityCount:        number
  currentUserId:        string
  organizerBudget:      { amount: number | null; overrunPct: number | null; limit: number; visible: boolean } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesToTime(m: number): string {
  const h   = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}h${String(min).padStart(2, '0')}`
}

const TYPE_EMOJI: Record<string, string> = {
  'Escape Game': '🎭', Restaurant: '🍽️', Cinéma: '🎬', Sport: '⚽',
  Musée: '🏛️', Spectacle: '🎪', Jeux: '🎲', Karaoké: '🎤',
  Détente: '🌿', Gastronomie: '🍷', Randonnée: '🥾', Visite: '🗺️',
  Atelier: '🎨', 'Pique-nique': '🧺', Soirée: '🥂',
}
function typeEmoji(type: string): string { return TYPE_EMOJI[type] ?? '🎯' }

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 15, height: 15, borderRadius: '50%', background: '#EDE9FE',
          color: '#7C3AED', fontSize: 9, fontWeight: 700, cursor: 'help', marginLeft: 4,
        }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: '#1E293B', color: 'white', fontSize: 11, lineHeight: 1.5,
          padding: '7px 10px', borderRadius: 8, width: 220, zIndex: 100,
          whiteSpace: 'normal', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>{text}</span>
      )}
    </span>
  )
}

// ─── Timeline visual ──────────────────────────────────────────────────────────

function ScenarioTimeline({ scenario }: { scenario: Scenario }) {
  const { timeline, activities, windowStart, windowEnd } = scenario
  const totalWindow = windowEnd - windowStart
  if (!totalWindow) return null

  const colors = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div style={{ marginTop: 10 }}>
      {/* Bar timeline */}
      <div style={{ position: 'relative', height: 36, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
        {timeline.map((step, i) => {
          const act        = activities.find(a => a.id === step.actId)!
          const leftPct    = ((step.start - windowStart) / totalWindow) * 100
          const widthPct   = ((step.end - step.start) / totalWindow) * 100
          const color      = colors[i % colors.length]
          const gapStart   = step.start - step.travelBefore - step.waitBefore
          const travelLeft = ((gapStart - windowStart) / totalWindow) * 100
          const travelPct  = (step.travelBefore / totalWindow) * 100
          const waitLeft   = ((gapStart + step.travelBefore - windowStart) / totalWindow) * 100
          const waitPct    = (step.waitBefore / totalWindow) * 100

          return (
            <div key={step.actId}>
              {step.travelBefore > 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${travelLeft}%`, width: `${travelPct}%`,
                  background: `${color}22`, borderRight: `2px dashed ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: `${color}88` }}>🚗</span>
                </div>
              )}
              {step.waitBefore > 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${waitLeft}%`, width: `${waitPct}%`,
                  background: '#FEF3C733', borderRight: '2px dotted #F59E0B55',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: '#D97706' }}>⏳</span>
                </div>
              )}
              <div style={{
                position: 'absolute', top: 4, bottom: 4,
                left: `${leftPct}%`, width: `${widthPct}%`,
                background: color, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', minWidth: 24,
              }}>
                <span style={{ fontSize: 10, color: 'white', fontWeight: 700, padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {typeEmoji(act.type)} {act.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{minutesToTime(windowStart)}</span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{minutesToTime(windowEnd)}</span>
      </div>

      {/* Step-by-step detail */}
      <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
        {timeline.map((step, i) => {
          const act   = activities.find(a => a.id === step.actId)!
          const color = colors[i % colors.length]

          return (
            <div key={step.actId}>
              {step.travelBefore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 10px' }}>
                  <div style={{ width: 2, alignSelf: 'stretch', background: `${color}40`, borderRadius: 2 }}/>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                    🚗 Trajet + transition — {step.travelBefore} min
                  </span>
                </div>
              )}
              {step.waitBefore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 10px' }}>
                  <div style={{ width: 2, alignSelf: 'stretch', background: '#F59E0B40', borderRadius: 2 }}/>
                  <span style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic' }}>
                    ⏳ Temps d'attente — {step.waitBefore} min
                    <span style={{ marginLeft: 8, color: '#FDE68A' }}>(activité pas encore ouverte)</span>
                  </span>
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 9,
                background: `${color}12`, border: `1.5px solid ${color}30`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {typeEmoji(act.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{act.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    <span style={{ color }}>{minutesToTime(step.start)}</span>
                    {' → '}
                    <span style={{ color }}>{minutesToTime(step.end)}</span>
                    {' · '}
                    {act.duration} min
                    {act.address && <span> · 📍 {act.address.length > 35 ? act.address.slice(0, 35) + '…' : act.address}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{act.cost}€</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>/pers.</div>
                </div>
              </div>
            </div>
          )
        })}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 10px', borderRadius: 8,
          background: '#F8FAFC', border: '1px solid #E2E8F0', marginTop: 2,
        }}>
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
            ⏱️ Durée totale : {scenario.totalTimeMinutes} min
            {scenario.totalWaitMinutes > 0 && (
              <span style={{ color: '#D97706' }}> (dont {scenario.totalWaitMinutes} min d'attente)</span>
            )}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>
            💶 {scenario.totalCost}€ / pers.
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Scenario Card ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, rank, organizerBudget }: { scenario: Scenario; rank: number; organizerBudget: PageData['organizerBudget'] }) {
  const [expanded, setExpanded] = useState(rank <= 2)
  const realTotalCost = scenario.totalCost * scenario.participantCount
  const exceedsBudget = organizerBudget != null && realTotalCost > organizerBudget.limit

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: `2px solid ${rank === 1 ? '#7C3AED' : '#E2E8F0'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: rank <= 3 ? '#EDE9FE' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800,
            color: rank <= 3 ? '#4C1D95' : '#64748B',
          }}>
            #{rank}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
              {scenario.activityNames.join(' + ')}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              📅 {scenario.dayLabel}
              {' · '}
              {scenario.participantCount} participant{scenario.participantCount > 1 ? 's' : ''}
              {' · '}
              {minutesToTime(scenario.windowStart)}–{minutesToTime(scenario.windowEnd)}
            </div>
          </div>

          <button onClick={() => setExpanded(e => !e)} style={{
            background: 'none', border: '1px solid #E2E8F0', borderRadius: 7,
            cursor: 'pointer', color: '#64748B', fontSize: 11,
            padding: '4px 8px', flexShrink: 0,
          }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>💶 {scenario.totalCost}€/pers.</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>⏱️ {scenario.totalTimeMinutes} min</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>👥 {scenario.participantCount} participants</span>
          {scenario.totalWaitMinutes > 0 && (
            <span style={{ fontSize: 12, color: '#D97706' }}>⏳ {scenario.totalWaitMinutes} min d'attente</span>
          )}
          {exceedsBudget && (
            <span title={organizerBudget?.visible
              ? `Coût total réel ${realTotalCost}€ > plafond ${Math.round(organizerBudget.limit)}€ (organisateur)`
              : "Dépasse le plafond défini par l'organisateur pour cet événement"}
              style={{
                fontSize: 11, color: '#991B1B', background: '#FEE2E2',
                padding: '2px 8px', borderRadius: 6, fontWeight: 600, cursor: 'help',
              }}>
              ⚠️ Dépasse le budget{organizerBudget?.visible ? ` (${realTotalCost}€ total)` : ''}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '14px 18px' }}>
          <ScenarioTimeline scenario={scenario}/>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const eventId = params.id

  const [data,       setData]       = useState<PageData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [closing,    setClosing]    = useState(false)
  const [reverting,  setReverting]  = useState(false)
  const [filterDate, setFilterDate] = useState<string>('all')
  const [showElim,   setShowElim]   = useState(false)

  async function load() {
    setLoading(true); setError(null)
    const res  = await fetch(`/api/events/${eventId}/scenarios`)
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Erreur'); setLoading(false); return }
    setData(json as PageData)
    setLoading(false)
  }

  useEffect(() => { load() }, [eventId])

  async function handleClose() {
    setClosing(true)
    const res = await fetch(`/api/events/${eventId}/scenarios`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'close_phase4' }),
    })
    if (res.ok) {
      router.push(`/event/${eventId}/pareto`)
    } else {
      const { error: e } = await res.json()
      setError(e ?? 'Erreur lors de la clôture.')
    }
    setClosing(false)
  }

  async function handleRevert() {
    if (!window.confirm('Revenir à la phase Activités ? Les scénarios ne seront pas sauvegardés.')) return
    setReverting(true)
    const res = await fetch(`/api/events/${eventId}/scenarios`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'revert_to_activities' }),
    })
    if (res.ok) {
      router.push(`/event/${eventId}/activities`)
    } else {
      const { error: e } = await res.json()
      setError(e ?? 'Erreur')
    }
    setReverting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Calcul des scénarios en cours…</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>{error}</p>
          <Link href={`/event/${eventId}/activities`} style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
            ← Retour aux activités
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { event, scenarios, eliminatedActivities, participantCount, activityCount, currentUserId, organizerBudget } = data
  const isOrganizer = event.created_by === currentUserId

  const dates    = [...new Set(scenarios.map(s => s.date))].sort()
  const filtered = filterDate === 'all' ? scenarios : scenarios.filter(s => s.date === filterDate)

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px',
        background: 'white', borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28}/>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95' }}>IRIS</span>
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <Link href={`/event/${eventId}`} style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>{event.name}</Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Scénarios</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
            background: '#DDD6FE', color: '#4C1D95',
          }}>Phase 4 — Scénarios</span>
          <button onClick={load} style={{
            padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
            background: 'white', color: '#64748B', fontSize: 12, cursor: 'pointer',
          }}>↻</button>
        </div>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 100px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Scénarios possibles
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            {scenarios.length} scénario{scenarios.length !== 1 ? 's' : ''} viables
            sur {activityCount} activité{activityCount !== 1 ? 's' : ''}
            et {participantCount} participant{participantCount !== 1 ? 's' : ''}
            {eliminatedActivities.length > 0 && (
              <span style={{ color: '#F59E0B', marginLeft: 8, fontWeight: 600 }}>
                · {eliminatedActivities.length} activité{eliminatedActivities.length > 1 ? 's' : ''} exclue{eliminatedActivities.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {eliminatedActivities.length > 0 && (
          <div style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #FDE68A', overflow: 'hidden' }}>
            <button onClick={() => setShowElim(e => !e)}
              style={{
                width: '100%', padding: '12px 16px', background: '#FEF9C3',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#713F12' }}>
                ⚠️ {eliminatedActivities.length} activité{eliminatedActivities.length > 1 ? 's' : ''} exclue{eliminatedActivities.length > 1 ? 's' : ''} des scénarios
              </span>
              <span style={{ fontSize: 12, color: '#92400E' }}>{showElim ? '▲' : '▼ Voir pourquoi'}</span>
            </button>
            {showElim && (
              <div style={{ background: 'white', padding: '10px 16px' }}>
                {eliminatedActivities.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0', borderBottom: i < eliminatedActivities.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', flex: 1 }}>{e.name}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{e.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {scenarios.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: 'white', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
              Aucun scénario viable
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 20px' }}>
              Les activités proposées ne peuvent pas être combinées sur la date disponible
              en respectant toutes les contraintes.
            </p>
            {isOrganizer && (
              <button onClick={handleRevert} disabled={reverting} style={{
                padding: '11px 24px', borderRadius: 10, border: 'none',
                background: reverting ? '#E2E8F0' : '#4C1D95',
                color: reverting ? '#94A3B8' : 'white',
                fontSize: 13, fontWeight: 700, cursor: reverting ? 'default' : 'pointer',
              }}>
                {reverting ? 'Redirection…' : '← Retourner aux activités'}
              </button>
            )}
          </div>
        )}

        {scenarios.length > 0 && dates.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterDate('all')} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: filterDate === 'all' ? '#4C1D95' : '#EDE9FE',
              color: filterDate === 'all' ? 'white' : '#4C1D95',
            }}>Toutes les dates ({scenarios.length})</button>
            {dates.map(date => {
              const count = scenarios.filter(s => s.date === date).length
              const label = new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <button key={date} onClick={() => setFilterDate(date)} style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: filterDate === date ? '#4C1D95' : '#EDE9FE',
                  color: filterDate === date ? 'white' : '#4C1D95',
                }}>{label} ({count})</button>
              )
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ display: 'grid', gap: 16 }}>
            {filtered.map((s, i) => (
              <ScenarioCard key={s.id} scenario={s} rank={i + 1} organizerBudget={organizerBudget}/>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 13, color: '#991B1B' }}>
            {error}
          </div>
        )}

        {isOrganizer && scenarios.length > 0 && (
          <div style={{ marginTop: 32, padding: '20px 22px', borderRadius: 14, background: 'white', border: '2px solid #DDD6FE' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95', margin: '0 0 8px' }}>Panel organisateur</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
              La liste des scénarios vous convient ? Validez pour passer au filtre Pareto (calcul des utilités et sélection des finalistes).
              Sinon, revenez aux activités pour ajuster la liste.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={handleRevert} disabled={reverting} style={{
                padding: '10px 20px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', background: 'white',
                color: '#64748B', fontSize: 13, fontWeight: 600,
                cursor: reverting ? 'default' : 'pointer',
              }}>{reverting ? 'Redirection…' : '← Modifier les activités'}</button>
              <button onClick={handleClose} disabled={closing} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: closing ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: closing ? '#94A3B8' : 'white',
                fontSize: 13, fontWeight: 700, cursor: closing ? 'default' : 'pointer',
              }}>{closing ? 'Validation…' : `✓ Valider ces ${scenarios.length} scénarios → Phase filtre Pareto`}</button>
            </div>
          </div>
        )}

      </main>

      <a href="https://tally.so/r/Y5qxz0" target="_blank" rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 24, background: 'white', color: '#4C1D95',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(76,29,149,0.15)', border: '1.5px solid #DDD6FE', zIndex: 100,
        }}>
        💬 Suggestion
      </a>
    </div>
  )
}
