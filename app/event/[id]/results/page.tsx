// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivitySlot { id: string; name: string; type: string; duration: number; cost: number; address: string | null }
interface TimelineStep { actId: string; start: number; end: number; travelBefore: number; waitBefore: number }
interface WinningScenario {
  id: string; date: string; dayLabel: string
  activities: ActivitySlot[]; timeline: TimelineStep[]
  windowStart: number; windowEnd: number
  totalCost: number; totalTimeMinutes: number; totalWaitMinutes: number
  groupScore: number
}
interface MyUtility { value: number; ri: number; fB: number; fS: number; fD: number }
interface ResultsData {
  outcome: 'scenario' | 'none'
  event: { id: string; name: string; created_by: string }
  winningScenario?: WinningScenario
  myUtility?: MyUtility | null
  participantCount?: number
  compensation?: {
    applied: { averageRi: number; allNeutral: boolean }
    updated: { myRi: number; averageRi: number; allNeutral: boolean }
    perGroup: { groupId: string; groupName: string; before: number; after: number }[]
    global: { before: number; after: number }
  }
  voteMethod: 'direct' | 'condorcet' | 'borda' | null
  condorcetSummary: {
    ranking: { id: string; label: string; wins: number; losses: number; ties: number }[]
    matrix:  { id: string; label: string; against: { id: string; label: string; count: number; opponentCount: number; won: boolean }[] }[]
  } | null
  currentUserId: string
  isOrganizer: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesToTime(m: number): string { const h = Math.floor(m / 60) % 24, mi = m % 60; return `${String(h).padStart(2, '0')}h${String(mi).padStart(2, '0')}` }
function pct(v: number): string { return `${Math.round(v * 100)}%` }
const TYPE_EMOJI: Record<string, string> = { 'Escape Game': '🎭', Restaurant: '🍽️', Cinéma: '🎬', Sport: '⚽', Musée: '🏛️', Spectacle: '🎪', Jeux: '🎲', Karaoké: '🎤', Détente: '🌿', Gastronomie: '🍷', Randonnée: '🥾', Visite: '🗺️', Atelier: '🎨', 'Pique-nique': '🧺', Soirée: '🥂' }
function typeEmoji(t: string): string { return TYPE_EMOJI[t] ?? '🎯' }

// ─── Timeline (réutilisée) ─────────────────────────────────────────────────────

function ResultTimeline({ scenario }: { scenario: WinningScenario }) {
  const totalWindow = scenario.windowEnd - scenario.windowStart
  if (!totalWindow) return null
  const colors = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div>
      <div style={{ position: 'relative', height: 40, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
        {scenario.timeline.map((step, i) => {
          const act = scenario.activities.find(a => a.id === step.actId)!
          const leftPct  = ((step.start - scenario.windowStart) / totalWindow) * 100
          const widthPct = ((step.end - step.start) / totalWindow) * 100
          const color = colors[i % colors.length]
          return (
            <div key={step.actId} style={{
              position: 'absolute', top: 4, bottom: 4,
              left: `${leftPct}%`, width: `${widthPct}%`,
              background: color, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 11, color: 'white', fontWeight: 700, padding: '0 6px', whiteSpace: 'nowrap' }}>
                {typeEmoji(act.type)} {act.name}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{minutesToTime(scenario.windowStart)}</span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{minutesToTime(scenario.windowEnd)}</span>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
        {scenario.timeline.map((step, i) => {
          const act = scenario.activities.find(a => a.id === step.actId)!
          const color = colors[i % colors.length]
          return (
            <div key={step.actId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              background: `${color}12`, border: `1.5px solid ${color}30`,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{typeEmoji(act.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{act.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  <span style={{ color }}>{minutesToTime(step.start)} → {minutesToTime(step.end)}</span>
                  {' · '}{act.duration} min
                  {act.address && <span> · 📍 {act.address}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{act.cost}€</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>/pers.</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params  = useParams<{ id: string }>()
  const eventId = params.id

  const [data,    setData]    = useState<ResultsData | null>(null)
  const [showMatrix, setShowMatrix] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      const res  = await fetch(`/api/events/${eventId}/results`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur'); setLoading(false); return }
      setData(json as ResultsData)
      setLoading(false)
    }
    load()
  }, [eventId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Chargement des résultats…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>{error ?? 'Résultats indisponibles.'}</p>
          <Link href={`/event/${eventId}`} style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>← Retour à l'événement</Link>
        </div>
      </div>
    )
  }

  if (data.outcome === 'none') {
    const { event, condorcetSummary } = data
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
          <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Résultat du vote</span>
        </nav>

        <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 100px' }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤷</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Aucun scénario n'a convaincu le groupe
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              {event.name} — l'option « Aucun de ces scénarios » a remporté le vote.
            </p>
          </div>

          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 28, background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.6 }}>
              Le groupe repart de la phase Activités pour proposer de nouvelles idées — aucun des scénarios soumis
              au vote n'a rassemblé suffisamment d'adhésion, y compris face à l'option de refus explicite.
            </p>
          </div>

          {condorcetSummary && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Comment ce résultat a été obtenu
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.6 }}>
                {data.voteMethod === 'condorcet'
                  ? '« Aucun de ces scénarios » a battu chaque scénario proposé en duel direct (vainqueur de Condorcet).'
                  : 'Aucune option ne battait toutes les autres en duel direct. Le classement a été départagé par score de Borda.'}
              </p>

              <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                {condorcetSummary.ranking.map((c, i) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 9,
                    background: c.id === 'NONE' ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${c.id === 'NONE' ? '#FECACA' : '#E2E8F0'}`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c.id === 'NONE' ? '#991B1B' : '#64748B', minWidth: 18 }}>
                      {i === 0 ? '🏆' : `${i + 1}.`}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: '#1E293B', flex: 1 }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      {c.wins} victoire{c.wins > 1 ? 's' : ''}, {c.losses} défaite{c.losses > 1 ? 's' : ''}
                      {c.ties > 0 ? `, ${c.ties} égalité(s)` : ''}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowMatrix(v => !v)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#7C3AED', fontWeight: 600, padding: 0,
              }}>
                {showMatrix ? '▲ Masquer la matrice des duels' : '▼ Voir le détail de chaque duel'}
              </button>

              {showMatrix && (
                <div style={{ marginTop: 10, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: '#94A3B8', fontWeight: 600 }}>Candidat</th>
                        {condorcetSummary.matrix.map(m => (
                          <th key={m.id} style={{ textAlign: 'center', padding: '6px 8px', color: '#94A3B8', fontWeight: 600, maxWidth: 90 }}>
                            {m.label}
                          </th>
                        ))}
                        <th style={{ textAlign: 'center', padding: '6px 8px', color: '#94A3B8', fontWeight: 600 }}>Victoires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {condorcetSummary.matrix.map(row => {
                        const winsCount = condorcetSummary.ranking.find(r => r.id === row.id)?.wins ?? 0
                        const isWinner = condorcetSummary.ranking[0]?.id === row.id
                        return (
                          <tr key={row.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1E293B' }}>{row.label}</td>
                            {row.against.map(cell => {
                              const total = cell.count + cell.opponentCount
                              const pct = total > 0 ? Math.round((cell.count / total) * 100) : 50
                              return (
                                <td key={cell.id} style={{
                                  textAlign: 'center', padding: '6px 8px',
                                  color: cell.won ? '#166534' : '#991B1B', fontWeight: 600,
                                }}>
                                  {pct}% ({cell.count}/{cell.opponentCount})
                                </td>
                              )
                            })}
                            <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: isWinner ? '#166534' : '#374151' }}>
                              {winsCount}{isWinner ? ' (Gagnant)' : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link href={`/event/${eventId}/activities`} style={{
              padding: '13px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              🎯 Proposer de nouvelles activités →
            </Link>
          </div>

        </main>
      </div>
    )
  }
  
  const { event, winningScenario: s, myUtility, participantCount, compensation, voteMethod, condorcetSummary } = data
	if (!s || participantCount === undefined) return null

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
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Résultat</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
          background: '#DCFCE7', color: '#166534',
        }}>✓ Phase 7 — Terminé</span>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 100px' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            C'est décidé !
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            {event.name} — {s.dayLabel}
          </p>
        </div>

        {/* Scénario retenu */}
        <div style={{ background: 'white', borderRadius: 18, border: '2px solid #7C3AED', padding: '22px 24px', marginBottom: 20, boxShadow: '0 4px 20px rgba(124,58,237,0.12)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            🏆 Programme retenu
          </div>
          <ResultTimeline scenario={s}/>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9',
          }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>
              👥 {participantCount} participant{participantCount > 1 ? 's' : ''}
              {s.totalWaitMinutes > 0 && <span style={{ color: '#D97706' }}> · ⏳ {s.totalWaitMinutes} min d'attente</span>}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4C1D95' }}>💶 {s.totalCost}€ / pers.</span>
          </div>
        </div>

        {/* Satisfaction */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Ma satisfaction</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#4C1D95' }}>
              {myUtility ? pct(myUtility.value) : '—'}
            </div>
            {myUtility && myUtility.ri !== 1.0 && (
              <div style={{ fontSize: 10, color: myUtility.ri > 1 ? '#166534' : '#94A3B8', marginTop: 3 }}>
                Coefficient d'équité appliqué : {myUtility.ri.toFixed(2)}
              </div>
            )}
          </div>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Satisfaction du groupe</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0369A1' }}>
              {pct(s.groupScore)}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>Moyenne géométrique pondérée</div>
          </div>
        </div>

        {/* Transparence du vote */}
        {voteMethod && (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Comment ce résultat a été obtenu
            </div>
            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.6 }}>
              {voteMethod === 'direct'
                ? 'ℹ️ Un seul scénario respectait suffisamment les contraintes de tout le monde — il a été retenu directement, sans vote.'
                : voteMethod === 'condorcet'
                ? '✓ Ce scénario a battu tous les autres en duel direct (vainqueur de Condorcet) — c\'est le choix le plus robuste possible face à n\'importe quelle alternative proposée.'
                : 'Aucun scénario ne battait tous les autres en duel direct. Le classement a été départagé par score de Borda (cumul des positions dans les votes de chacun).'}
            </p>

            {condorcetSummary && condorcetSummary.ranking.length > 1 && (
              <>
                <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                  {condorcetSummary.ranking.map((c, i) => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 9,
                      background: i === 0 ? '#F0FDF4' : '#F8FAFC',
                      border: `1px solid ${i === 0 ? '#BBF7D0' : '#E2E8F0'}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? '#166534' : '#64748B', minWidth: 18 }}>
                        {i === 0 ? '🏆' : `${i + 1}.`}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: '#1E293B', flex: 1 }}>
                        {c.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        {c.wins} victoire{c.wins > 1 ? 's' : ''}, {c.losses} défaite{c.losses > 1 ? 's' : ''}
                        {c.ties > 0 ? `, ${c.ties} égalité(s)` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <button onClick={() => setShowMatrix(v => !v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#7C3AED', fontWeight: 600, padding: 0,
                }}>
                  {showMatrix ? '▲ Masquer la matrice des duels' : '▼ Voir le détail de chaque duel'}
                </button>

                {showMatrix && (
                  <div style={{ marginTop: 10, overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#94A3B8', fontWeight: 600 }}>Candidat</th>
                          {condorcetSummary.matrix.map(m => (
                            <th key={m.id} style={{ textAlign: 'center', padding: '6px 8px', color: '#94A3B8', fontWeight: 600, maxWidth: 90 }}>
                              {m.label}
                            </th>
                          ))}
                          <th style={{ textAlign: 'center', padding: '6px 8px', color: '#94A3B8', fontWeight: 600 }}>Victoires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {condorcetSummary.matrix.map(row => {
                          const winsCount = condorcetSummary.ranking.find(r => r.id === row.id)?.wins ?? 0
                          const isWinner = condorcetSummary.ranking[0]?.id === row.id
                          return (
                            <tr key={row.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1E293B' }}>{row.label}</td>
                              {row.against.map(cell => {
                                const total = cell.count + cell.opponentCount
                                const pct = total > 0 ? Math.round((cell.count / total) * 100) : 50
                                return (
                                  <td key={cell.id} style={{
                                    textAlign: 'center', padding: '6px 8px',
                                    color: cell.won ? '#166534' : '#991B1B', fontWeight: 600,
                                  }}>
                                    {pct}% ({cell.count}/{cell.opponentCount})
                                  </td>
                                )
                              })}
                              {/* Cellule diagonale manquante pour l'auto-comparaison — on l'ajoute pour l'alignement */}
                              <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: isWinner ? '#166534' : '#374151' }}>
                                {winsCount}{isWinner ? ' (Gagnant)' : ''}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>
                      Lecture : "65% (65/35)" signifie que ce candidat a été préféré par 65% des votants dans ce duel direct.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Compensation historique */}
        <div style={{ background: '#F5F3FF', borderRadius: 14, border: '1px solid #DDD6FE', padding: '16px 18px', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            ⚖️ Équité et historique
          </div>

          <p style={{ fontSize: 13, color: '#4C1D95', margin: '0 0 12px', lineHeight: 1.6 }}>
            {!myUtility || myUtility.ri === 1.0
              ? 'Aucune compensation ne vous a été appliquée pour ce résultat — coefficient neutre (1.0) au global.'
              : myUtility.ri > 1
              ? `Un coefficient d'équité combiné de ${myUtility.ri.toFixed(2)} a été appliqué en votre faveur pour ce résultat.`
              : `Un coefficient d'équité combiné de ${myUtility.ri.toFixed(2)} a été appliqué pour ce résultat, en légère faveur des autres.`}
            {' '}Le détail exact, groupe par groupe et au global, est ci-dessous.
          </p>

          {/* Résumé toujours visible (global), détail complet replié — évite d'alourdir
              l'interface pour quelqu'un dans un seul groupe, tout en gardant le détail
              accessible en un clic pour qui appartient à plusieurs groupes liés à cet événement. */}
          {compensation && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                background: 'white', borderRadius: 10, border: '1px solid #DDD6FE', padding: '10px 14px', marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>🌐 Global (tous groupes confondus)</span>
                <span style={{ fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>{compensation.global.before.toFixed(2)}</span>
                  {' → '}
                  <strong style={{ color: compensation.global.after > compensation.global.before ? '#166534' : compensation.global.after < compensation.global.before ? '#B45309' : '#4C1D95' }}>
                    {compensation.global.after.toFixed(2)}
                  </strong>
                </span>
              </div>

              {compensation.perGroup.length > 0 && (
                <details>
                  <summary style={{
                    fontSize: 12, color: '#7C3AED', cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 9 }}>▶</span>
                    Voir le détail par groupe ({compensation.perGroup.length})
                  </summary>
                  <div style={{ background: 'white', borderRadius: 10, border: '1px solid #DDD6FE', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#F5F3FF' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: '#7C3AED', fontWeight: 700 }}>Groupe</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: '#7C3AED', fontWeight: 700 }}>Appliqué</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: '#7C3AED', fontWeight: 700 }}></th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: '#7C3AED', fontWeight: 700 }}>Mis à jour</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compensation.perGroup.map(g => (
                          <tr key={g.groupId} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', color: '#1E293B', fontWeight: 600 }}>👥 {g.groupName}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>{g.before.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: g.after > g.before ? '#166534' : g.after < g.before ? '#B45309' : '#94A3B8' }}>→</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: g.after > g.before ? '#166534' : g.after < g.before ? '#B45309' : '#4C1D95' }}>{g.after.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              <p style={{ fontSize: 10, color: '#94A3B8', margin: '8px 0 0' }}>
                "Appliqué" = ce qui a servi au calcul de ce résultat. "Mis à jour" = ce qui s'appliquera au prochain événement. Une hausse (🟢) vous favorisera davantage la prochaine fois ; une baisse (🟠) tempérera légèrement en faveur des autres.
              </p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <Link href={`/event/${eventId}`} style={{
            padding: '11px 24px', borderRadius: 10, border: '1.5px solid #E2E8F0',
            color: '#64748B', fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>← Retour à l'événement</Link>
          <Link href="/dashboard" style={{
            padding: '11px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>Dashboard →</Link>
        </div>

      </main>
    </div>
  )
}
