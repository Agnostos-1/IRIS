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
  id: string; name: string; type: string; duration: number; cost: number
  address: string | null; lat: number | null; lng: number | null
}
interface TimelineStep { actId: string; start: number; end: number; travelBefore: number; waitBefore: number }
interface ActivityBreakdown { activityId: string; name: string; fA: number; fO: number; fAInherited: boolean; weighted: number; centered: number }
interface MyUtility {
  value: number; fB: number; fS: number; fD: number; totalKm: number | null; uActivities: number; ri: number
  scheduleDetail: { overlapRatio: number; waitPenalty: number }
  weights: { activity: number; schedule: number; distance: number; budget: number; social: number }
  perActivity: ActivityBreakdown[]
  probability: number | null
  availStatus: string
  weight: number
}
interface Finalist {
  id: string; date: string; dayLabel: string
  activities: ActivitySlot[]; timeline: TimelineStep[]
  windowStart: number; windowEnd: number
  totalCost: number; totalTimeMinutes: number; totalWaitMinutes: number
  participantCount: number
  groupScore: number
  myUtility: MyUtility | null
}
interface LightScenario {
  id: string; label: string; groupScore: number; myScore: number | null
  status: 'finalist' | 'dominated' | 'belowCutoff'
}
interface PageData {
  event: { id: string; name: string; phase: number; created_by: string }
  allScenarios: LightScenario[]
  finalists: Finalist[]
  meta: {
    totalScenarios: number; nonDominatedCount: number; dominatedCount: number
    best: number; cutoff: number
    marginUsed: number; marginWasExtended: boolean
    isDirectWinner: boolean; message: string
    eliminatedForBudgetCount: number
  }
  organizerBudget: { amount: number | null; overrunPct: number | null; visible: boolean } | null
  myRiBreakdown: { perGroup: { groupId: string; groupName: string; ri: number }[]; global: number }
  currentUserId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24, min = m % 60
  return `${String(h).padStart(2, '0')}h${String(min).padStart(2, '0')}`
}
function pct(v: number): string { return `${Math.round(v * 100)}%` }

const TYPE_EMOJI: Record<string, string> = {
  'Escape Game': '🎭', Restaurant: '🍽️', Cinéma: '🎬', Sport: '⚽',
  Musée: '🏛️', Spectacle: '🎪', Jeux: '🎲', Karaoké: '🎤',
  Détente: '🌿', Gastronomie: '🍷', Randonnée: '🥾', Visite: '🗺️',
  Atelier: '🎨', 'Pique-nique': '🧺', Soirée: '🥂',
}
function typeEmoji(t: string): string { return TYPE_EMOJI[t] ?? '🎯' }

// ─── Tooltip (courte explication générique — plus utilisée pour des données denses) ──

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
          position: 'absolute', bottom: '130%', left: 0,
          background: '#1E293B', color: 'white', fontSize: 11, lineHeight: 1.5,
          padding: '8px 11px', borderRadius: 8, width: 230, zIndex: 100,
          whiteSpace: 'normal', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }}>{text}</span>
      )}
    </span>
  )
}

// ─── Chart — tous les scénarios, statut visuel + ligne de seuil ──────────────

function ComparisonChart({ scenarios, best, cutoff }: { scenarios: LightScenario[]; best: number; cutoff: number }) {
  const W = 700, H = 300
  const padL = 42, padR = 20, padT = 24, padB = 56
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = Math.max(1, scenarios.length)
  const colWidth = plotW / n

  const yFor = (v: number) => padT + plotH * (1 - v)
  const showLabels = n <= 12

  const [hover, setHover] = useState<{ xPct: number; yPct: number; s: LightScenario } | null>(null)

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 700, display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={yFor(v)} y2={yFor(v)} stroke="#F1F5F9" strokeWidth={1}/>
            <text x={padL - 8} y={yFor(v) + 4} fontSize={10} fill="#94A3B8" textAnchor="end">{Math.round(v * 100)}%</text>
          </g>
        ))}

        {/* Ligne de seuil */}
        <line x1={padL} x2={W - padR} y1={yFor(cutoff)} y2={yFor(cutoff)} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="6,4"/>
        <text x={W - padR} y={yFor(cutoff) - 5} fontSize={10} fill="#DC2626" textAnchor="end" fontWeight={700}>
          Seuil {Math.round(cutoff * 100)}%
        </text>

        {scenarios.map((s, i) => {
          const cx = padL + colWidth * (i + 0.5)
          const groupY = yFor(s.groupScore)
          const xPct = (cx / W) * 100
          const yPct = (groupY / H) * 100
          const handleEnter = () => setHover({ xPct, yPct, s })
          const handleLeave = () => setHover(null)

          if (s.status === 'dominated') {
            return (
              <g key={s.id} onMouseEnter={handleEnter} onMouseLeave={handleLeave} style={{ cursor: 'pointer' }}>
                <circle cx={cx} cy={groupY} r={11} fill="transparent"/>
                <circle cx={cx} cy={groupY} r={4.5} fill="#F1F5F9" stroke="#94A3B8" strokeWidth={1}/>
                <line x1={cx - 3} y1={groupY - 3} x2={cx + 3} y2={groupY + 3} stroke="#94A3B8" strokeWidth={1.2}/>
                <line x1={cx - 3} y1={groupY + 3} x2={cx + 3} y2={groupY - 3} stroke="#94A3B8" strokeWidth={1.2}/>
                {showLabels && (
                  <text x={cx} y={H - padB + 16} fontSize={9} fill="#CBD5E1" textAnchor="middle">#{i + 1}</text>
                )}
              </g>
            )
          }

          const myY = s.myScore != null ? yFor(s.myScore) : null
          const isFinalist = s.status === 'finalist'
          const opacity = isFinalist ? 1 : 0.4
          const r = isFinalist ? 6 : 4

          return (
            <g key={s.id} opacity={opacity} onMouseEnter={handleEnter} onMouseLeave={handleLeave} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={myY !== null ? (groupY + myY) / 2 : groupY} r={14} fill="transparent"/>
              {myY !== null && <line x1={cx} x2={cx} y1={myY} y2={groupY} stroke="#CBD5E1" strokeWidth={2}/>}
              <circle cx={cx} cy={groupY} r={r} fill="#0EA5E9"/>
              {myY !== null && <circle cx={cx} cy={myY} r={r} fill="#7C3AED"/>}
              {showLabels && (
                <text x={cx} y={H - padB + 16} fontSize={9} fill={isFinalist ? '#64748B' : '#CBD5E1'} textAnchor="middle">
                  #{i + 1}
                </text>
              )}
            </g>
          )
        })}

        <circle cx={padL} cy={H - 30} r={5} fill="#7C3AED"/>
        <text x={padL + 10} y={H - 26} fontSize={11} fill="#374151">Mon score</text>
        <circle cx={padL + 100} cy={H - 30} r={5} fill="#0EA5E9"/>
        <text x={padL + 110} y={H - 26} fontSize={11} fill="#374151">Score du groupe</text>
        <line x1={padL + 230} x2={padL + 250} y1={H - 30} y2={H - 30} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="6,4"/>
        <text x={padL + 256} y={H - 26} fontSize={11} fill="#374151">Seuil de sélection</text>
        <circle cx={padL + 400} cy={H - 30} r={4.5} fill="#F1F5F9" stroke="#94A3B8" strokeWidth={1}/>
        <line x1={padL + 397.5} y1={H - 32.5} x2={padL + 402.5} y2={H - 27.5} stroke="#94A3B8" strokeWidth={1}/>
        <line x1={padL + 397.5} y1={H - 27.5} x2={padL + 402.5} y2={H - 32.5} stroke="#94A3B8" strokeWidth={1}/>
        <text x={padL + 412} y={H - 26} fontSize={11} fill="#374151">Dominé (exclu, indép. du seuil)</text>

        <text x={padL} y={H - 8} fontSize={10} fill="#94A3B8">
          Seuil = meilleur score ({Math.round(best * 100)}%) × (1 − marge) — points clairs = sous le seuil, × gris = dominé
        </text>
      </svg>

      {hover && (
        <div style={{
          position: 'absolute', left: `${hover.xPct}%`, top: `${hover.yPct}%`,
          transform: 'translate(-50%, -125%)',
          background: '#1E293B', color: 'white', fontSize: 11, lineHeight: 1.5,
          padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 50,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{hover.s.label}</div>
          {hover.s.status === 'dominated' ? (
            <div style={{ color: '#CBD5E1' }}>Dominé — exclu indépendamment du score</div>
          ) : (
            <>
              <div>Score groupe : <strong>{pct(hover.s.groupScore)}</strong></div>
              {hover.s.myScore != null && <div>Mon score : <strong>{pct(hover.s.myScore)}</strong></div>}
              <div style={{ color: hover.s.status === 'finalist' ? '#86EFAC' : '#FCA5A5', marginTop: 2 }}>
                {hover.s.status === 'finalist' ? '✓ Finaliste' : '✗ Sous le seuil'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Timeline mini ─────────────────────────────────────────────────────────────

function MiniTimeline({ f }: { f: Finalist }) {
  const totalWindow = f.windowEnd - f.windowStart
  if (!totalWindow) return null
  const colors = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', height: 30, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
        {f.timeline.map((step, i) => {
          const act = f.activities.find(a => a.id === step.actId)!
          const leftPct  = ((step.start - f.windowStart) / totalWindow) * 100
          const widthPct = ((step.end - step.start) / totalWindow) * 100
          const color = colors[i % colors.length]
          return (
            <div key={step.actId} style={{
              position: 'absolute', top: 3, bottom: 3,
              left: `${leftPct}%`, width: `${widthPct}%`,
              background: color, borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 9, color: 'white', fontWeight: 700, padding: '0 4px', whiteSpace: 'nowrap' }}>
                {typeEmoji(act.type)} {act.name}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{minutesToTime(f.windowStart)}</span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{minutesToTime(f.windowEnd)}</span>
      </div>
    </div>
  )
}

// ─── Détail de calcul — tableau inline, plus lisible qu'une tooltip ──────────

function FactorBadge({ label, value, weight, extra }: { label: string; value: number; weight: number; extra?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 9, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 9, color: '#94A3B8' }}>{label} ({weight}%)</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#4C1D95' }}>{pct(value)}</div>
      {extra && <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{extra}</div>}
    </div>
  )
}

function MyCalculationDetail({ f, organizerBudget }: { f: Finalist; organizerBudget: PageData['organizerBudget'] }) {
  if (!f.myUtility) return (
    <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
      Vous n'êtes pas participant actif de ce scénario.
    </p>
  )
  const u = f.myUtility
  const groupWeight = u.weights.activity + u.weights.social

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Mon détail de calcul
        <Tooltip text="Activité et Social sont combinés par activité (l'effet des activités s'additionne, tempéré pour rester borné). Horaires, Budget et Distance sont des propriétés du scénario entier — comptés une seule fois, quel que soit le nombre d'activités." />
      </div>

      {/* Compensation historique — appliquée à ce calcul */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        padding: '8px 12px', borderRadius: 9,
        background: u.ri === 1.0 ? '#F8FAFC' : '#FEF3C7',
        border: `1px solid ${u.ri === 1.0 ? '#E2E8F0' : '#FDE68A'}`,
      }}>
        <span style={{ fontSize: 15 }}>⚖️</span>
        <span style={{ fontSize: 12, color: u.ri === 1.0 ? '#64748B' : '#92400E' }}>
          Coefficient d'équité appliqué : <strong>{u.ri.toFixed(2)}</strong>
          {u.ri === 1.0
            ? ' — neutre pour ce calcul.'
            : u.ri > 1 ? ' — vous êtes légèrement favorisé suite à votre historique passé.' : ' — léger rééquilibrage suite à votre historique passé.'}
          {' '}<span style={{ fontSize: 10, opacity: 0.8 }}>(combine l'historique de tous vos groupes liés à cet événement)</span>
        </span>
      </div>

      {u.availStatus === 'cond' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          padding: '8px 12px', borderRadius: 9, background: '#FEF9C3', border: '1px solid #FDE68A',
        }}>
          <span style={{ fontSize: 15 }}>⚡</span>
          <span style={{ fontSize: 12, color: '#713F12' }}>
            Votre disponibilité conditionnelle (<strong>{u.probability}%</strong>) réduit votre poids dans le score de groupe à <strong>{Math.round(u.weight * 100)}%</strong> de celui d'une présence certaine — votre propre score individuel n'en est en revanche pas affecté.
          </span>
        </div>
      )}

      {/* Facteurs de scénario (une fois chacun) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <FactorBadge label="Horaires" value={u.fS} weight={u.weights.schedule} />
        {organizerBudget
          ? <div style={{ flex: 1, padding: '8px 10px', borderRadius: 9, background: '#F5F3FF', border: '1px solid #DDD6FE', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>Budget</div>
              <div style={{ fontSize: 12, color: '#4C1D95', fontWeight: 700 }}>🏢 Pris en charge</div>
            </div>
          : <FactorBadge label="Budget"   value={u.fB} weight={u.weights.budget} />
        }
        <FactorBadge label="Distance" value={u.fD} weight={u.weights.distance}
          extra={u.totalKm != null ? `${u.totalKm} km A/R` : 'coordonnées manquantes'} />
      </div>

      {/* Détail par activité */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Activité</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Appréciation</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Social</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Combiné</th>
          </tr>
        </thead>
        <tbody>
          {u.perActivity.map(a => (
            <tr key={a.activityId} style={{ borderTop: '1px solid #F1F5F9' }}>
              <td style={{ padding: '6px 8px', fontSize: 12, color: '#1E293B' }}>{a.name}</td>
              <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'center', color: '#4C1D95', fontWeight: 600 }}>
                {pct(a.fA)}
                {a.fAInherited && (
                  <span title="Valeur héritée de votre note du type parent — jamais confirmée spécifiquement pour ce sous-type"
                    style={{
                      marginLeft: 4, fontSize: 9, color: '#B45309', background: '#FEF3C7',
                      padding: '1px 5px', borderRadius: 5, cursor: 'help',
                    }}>
                    héritée
                  </span>
                )}
              </td>
              <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'center', color: '#4C1D95', fontWeight: 600 }}>{pct(a.fO)}</td>
              <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'center', color: '#0369A1', fontWeight: 700 }}>{pct(a.weighted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 12px', fontStyle: 'italic' }}>
        La colonne "Combiné" de chaque activité est centrée (parfait→+1, neutre→0, horrible→−1),
        additionnée sur les {u.perActivity.length} activité{u.perActivity.length > 1 ? 's' : ''}, puis ramenée entre 0 et 100% → {pct(u.uActivities)}.
      </p>

      {/* Formule finale */}
      <div style={{ padding: '10px 12px', borderRadius: 9, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
        <div style={{ fontSize: 11, color: '#4C1D95', lineHeight: 1.7 }}>
          <strong>{groupWeight}%</strong> × {pct(u.uActivities)} (Activité+Social)
          {' + '}<strong>{u.weights.schedule}%</strong> × {pct(u.fS)} (Horaires)
          {u.weights.budget > 0 && (
            <>{' + '}<strong>{u.weights.budget}%</strong> × {pct(u.fB)} (Budget)</>
          )}
          {' + '}<strong>{u.weights.distance}%</strong> × {pct(u.fD)} (Distance)
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#4C1D95', marginTop: 6 }}>
          = {pct(u.value)}
        </div>
      </div>
    </div>
  )
}

// ─── Finalist card ─────────────────────────────────────────────────────────────

function FinalistCard({ f, rank, organizerBudget }: { f: Finalist; rank: number; organizerBudget: PageData['organizerBudget'] }) {
  const [expanded, setExpanded] = useState(rank === 1)

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: `2px solid ${rank === 1 ? '#7C3AED' : '#E2E8F0'}`,
      overflow: 'hidden',
      boxShadow: rank === 1 ? '0 4px 20px rgba(124,58,237,0.12)' : 'none',
    }}>
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: rank === 1 ? '#4C1D95' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: rank === 1 ? 'white' : '#64748B',
          }}>
            {rank === 1 ? '🏆' : `#${rank}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
              {f.activities.map(a => a.name).join(' + ')}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              📅 {f.dayLabel} · {f.participantCount} participant{f.participantCount > 1 ? 's' : ''} · {minutesToTime(f.windowStart)}–{minutesToTime(f.windowEnd)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: '4px 10px', borderRadius: 8, background: '#EDE9FE', color: '#4C1D95', fontSize: 13, fontWeight: 800 }}>
                {f.myUtility ? pct(f.myUtility.value) : '—'}
              </div>
              <div style={{ fontSize: 8, color: '#94A3B8' }}>Moi</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: '4px 10px', borderRadius: 8, background: '#E0F2FE', color: '#0369A1', fontSize: 13, fontWeight: 800 }}>
                {pct(f.groupScore)}
              </div>
              <div style={{ fontSize: 8, color: '#94A3B8' }}>Groupe</div>
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)} style={{
            background: 'none', border: '1px solid #E2E8F0', borderRadius: 7,
            cursor: 'pointer', color: '#64748B', fontSize: 11, padding: '4px 8px', flexShrink: 0,
          }}>{expanded ? '▲' : '▼'}</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>💶 {f.totalCost}€/pers.</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>⏱️ {f.totalTimeMinutes} min</span>
          {f.totalWaitMinutes > 0 && (
            <span style={{ fontSize: 12, color: '#D97706' }}>⏳ {f.totalWaitMinutes} min d'attente</span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '14px 18px' }}>
          <MiniTimeline f={f}/>
          <MyCalculationDetail f={f} organizerBudget={organizerBudget}/>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ParetoPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const eventId = params.id

  const [data,    setData]    = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [proceeding, setProceeding] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      const res  = await fetch(`/api/events/${eventId}/pareto`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur'); setLoading(false); return }
      setData(json as PageData)
      setLoading(false)
    }
    load()
  }, [eventId])

  async function handleProceed() {
    if (!data) return
    setProceeding(true)
    const res = await fetch(`/api/events/${eventId}/pareto`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'proceed',
        isDirectWinner: data.meta.isDirectWinner,
        winningScenarioId: data.meta.isDirectWinner ? data.finalists[0]?.id : undefined,
      }),
    })
    if (res.ok) {
      router.push(data.meta.isDirectWinner ? `/event/${eventId}/results` : `/event/${eventId}/vote`)
    } else {
      const { error: e } = await res.json()
      setError(e ?? 'Erreur')
      setProceeding(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Calcul des utilités et filtrage Pareto…</p>
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
          <Link href={`/event/${eventId}/scenarios`} style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>
            ← Retour aux scénarios
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { event, allScenarios, finalists, meta, organizerBudget, myRiBreakdown } = data

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
        <Link href={`/event/${eventId}/scenarios`} style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Scénarios</Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Filtre</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
          background: '#DDD6FE', color: '#4C1D95',
        }}>Phase 5 — Filtre Pareto</span>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 100px' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {meta.isDirectWinner ? 'Un scénario se démarque' : 'Scénarios retenus pour le vote'}
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            {meta.totalScenarios} scénarios évalués · {meta.nonDominatedCount} non-dominés · {finalists.length} finaliste{finalists.length > 1 ? 's' : ''}
            {meta.eliminatedForBudgetCount > 0 && (
              <> · <span style={{ color: '#991B1B' }}>{meta.eliminatedForBudgetCount} exclu{meta.eliminatedForBudgetCount > 1 ? 's' : ''} pour dépassement budget</span></>
            )}
          </p>
          {organizerBudget && (
            <p style={{ fontSize: 12, color: '#7C3AED', margin: '4px 0 0' }}>
              🏢 Événement pris en charge par l'organisateur
              {organizerBudget.visible && organizerBudget.amount != null && (
                <> — {organizerBudget.amount.toLocaleString('fr-FR')} € {organizerBudget.overrunPct ? `(+${Math.round(organizerBudget.overrunPct * 100)}% toléré)` : ''}</>
              )}
            </p>
          )}
        </div>

        {/* Détail de MON Rᵢ par groupe — une seule fois, pas répété par scénario
            puisque cette valeur ne dépend pas du scénario, seulement de mon
            historique. Évite "coefficient combiné" flou dès qu'on est dans
            plusieurs des groupes de cet événement. */}
        {myRiBreakdown.perGroup.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            marginBottom: 20, padding: '8px 14px', borderRadius: 10,
            background: '#F5F3FF', border: '1px solid #DDD6FE', fontSize: 12,
          }}>
            <span style={{ color: '#7C3AED', fontWeight: 700 }}>⚖️ Détail de votre Rᵢ :</span>
            {myRiBreakdown.perGroup.map(g => (
              <span key={g.groupId} style={{ color: '#4C1D95' }}>
                👥 {g.groupName} <strong>{g.ri.toFixed(2)}</strong>
              </span>
            ))}
            <span style={{ color: '#4C1D95' }}>
              🌐 Global <strong>{myRiBreakdown.global.toFixed(2)}</strong>
            </span>
          </div>
        )}

        {/* Graphe — tous les scénarios + seuil */}
        {allScenarios.length > 1 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Positionnement et filtrage des scénarios
              <Tooltip text="Chaque point représente un scénario évalué. Un × gris marque un scénario dominé (exclu quelle que soit sa position). Un point clair (rond) est sous le seuil. Un point plein est finaliste." />
            </div>
            <ComparisonChart scenarios={allScenarios} best={meta.best} cutoff={meta.cutoff}/>
            {meta.dominatedCount > 0 && (
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, lineHeight: 1.5 }}>
                ℹ️ Les {meta.dominatedCount} point{meta.dominatedCount > 1 ? 's' : ''} marqué{meta.dominatedCount > 1 ? 's' : ''} d'un × gris
                {meta.dominatedCount > 1 ? ' sont des scénarios dominés' : ' est un scénario dominé'} : un autre scénario fait au moins
                aussi bien pour tout le monde et strictement mieux pour au moins une personne. {meta.dominatedCount > 1 ? 'Ils sont' : 'Il est'} donc
                écarté{meta.dominatedCount > 1 ? 's' : ''} indépendamment de leur position par rapport au seuil — même s'ils semblent au-dessus.
              </p>
            )}
          </div>
        )}

        {/* Tableau comparatif — finalistes uniquement */}
        {finalists.length > 1 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#64748B', fontWeight: 600 }}>Scénario</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, color: '#64748B', fontWeight: 600 }}>Mon score</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, color: '#64748B', fontWeight: 600 }}>Score groupe</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, color: '#64748B', fontWeight: 600 }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {finalists.map((f, i) => {
                  const gap = f.myUtility ? f.myUtility.value - f.groupScore : null
                  return (
                    <tr key={f.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#1E293B' }}>
                        #{i + 1} {f.activities.map(a => a.name).join(' + ')}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>
                        {f.myUtility ? pct(f.myUtility.value) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
                        {pct(f.groupScore)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: gap != null && gap < -0.1 ? '#DC2626' : gap != null && gap > 0.1 ? '#166534' : '#94A3B8' }}>
                        {gap != null ? `${gap >= 0 ? '+' : ''}${Math.round(gap * 100)}pts` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Texte explicatif */}
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: meta.isDirectWinner ? '#F0FDF4' : '#F5F3FF',
          border: `1px solid ${meta.isDirectWinner ? '#BBF7D0' : '#DDD6FE'}`,
        }}>
          <p style={{ fontSize: 13, color: meta.isDirectWinner ? '#166534' : '#4C1D95', margin: 0, lineHeight: 1.6 }}>
            {meta.isDirectWinner ? '🎯' : 'ℹ️'} {meta.message}
          </p>
        </div>

        {/* Liste classée */}
        <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
          {finalists.map((f, i) => (
            <FinalistCard key={f.id} f={f} rank={i + 1} organizerBudget={organizerBudget}/>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 13, color: '#991B1B' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {event.phase >= 6 ? (
            // Le groupe a déjà tranché pendant que ce participant consultait cette page
            // (ou l'a ouverte après coup) — on ne relance pas l'action, on l'oriente
            // simplement vers l'étape suivante, à son propre rythme.
            <Link href={`/event/${eventId}/${event.phase >= 7 ? 'results' : 'vote'}`} style={{
              padding: '13px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              display: 'inline-block',
            }}>
              {event.phase >= 7 ? '✓ Voir le résultat final →' : '🗳️ Le vote a commencé — voter →'}
            </Link>
          ) : (
            <button onClick={handleProceed} disabled={proceeding} style={{
              padding: '13px 32px', borderRadius: 12, border: 'none',
              background: proceeding ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: proceeding ? '#94A3B8' : 'white',
              fontSize: 14, fontWeight: 700, cursor: proceeding ? 'default' : 'pointer',
            }}>
              {proceeding
                ? 'Chargement…'
                : meta.isDirectWinner
                ? '✓ Voir le résultat final →'
                : '🗳️ Aller voter →'}
            </button>
          )}
        </div>

      </main>
    </div>
  )
}
