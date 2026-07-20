// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivitySlot { id: string; name: string; type: string; duration: number; cost: number; address: string | null }
interface TimelineStep { actId: string; start: number; end: number }
interface Candidate {
  id: string; dayLabel: string; activities: ActivitySlot[]; timeline: TimelineStep[]
  windowStart: number; windowEnd: number
  totalCost: number; totalTimeMinutes: number; totalWaitMinutes: number
  groupScore: number; myScore: number | null
}
interface Progress { votedCount: number; totalParticipants: number; progressPct: number; isExpired: boolean; deadlineISO: string | null }
interface VoteData {
  concluded:   boolean
  event?:      { id: string; name: string; phase: number; created_by: string }
  candidates?: Candidate[]
  myRanking?:  string[] | null
  progress?:   Progress
  redirectTo?: 'results' | 'activities'
  currentUserId?: string
}

const NONE_ID = 'NONE'

function minutesToTime(m: number): string { const h = Math.floor(m / 60) % 24, mi = m % 60; return `${String(h).padStart(2, '0')}h${String(mi).padStart(2, '0')}` }
function pct(v: number): string { return `${Math.round(v * 100)}%` }
const TYPE_EMOJI: Record<string, string> = { 'Escape Game': '🎭', Restaurant: '🍽️', Cinéma: '🎬', Sport: '⚽', Musée: '🏛️', Spectacle: '🎪', Jeux: '🎲', Karaoké: '🎤', Détente: '🌿', Gastronomie: '🍷', Randonnée: '🥾', Visite: '🗺️', Atelier: '🎨', 'Pique-nique': '🧺', Soirée: '🥂' }
function typeEmoji(t: string): string { return TYPE_EMOJI[t] ?? '🎯' }

const MEDAL: Record<number, { bg: string; color: string; icon: string }> = {
  1: { bg: '#FEF3C7', color: '#92400E', icon: '🥇' },
  2: { bg: '#F1F5F9', color: '#475569', icon: '🥈' },
  3: { bg: '#FEF2E8', color: '#9A3412', icon: '🥉' },
}

// ─── Progress widget ────────────────────────────────────────────────────────────

function ProgressWidget({ progress }: { progress: Progress }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
          🗳️ {progress.votedCount} / {progress.totalParticipants} ont voté
        </span>
        {progress.deadlineISO && (
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Clôture : {new Date(progress.deadlineISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', width: `${Math.max(progress.votedCount / Math.max(1, progress.totalParticipants) * 100, 4)}%`,
          background: 'linear-gradient(90deg, #7C3AED, #4C1D95)', borderRadius: 4, transition: 'width 0.3s',
        }}/>
      </div>
      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress.progressPct}%`,
          background: progress.progressPct > 80 ? '#F59E0B' : '#94A3B8', borderRadius: 3, transition: 'width 0.3s',
        }}/>
      </div>
      <p style={{ fontSize: 10, color: '#94A3B8', margin: '4px 0 0' }}>
        Temps écoulé avant clôture automatique du vote : {Math.round(progress.progressPct)}%
      </p>
    </div>
  )
}

// ─── Rendu visuel pur d'une carte (réutilisé dans la liste et dans l'overlay flottant) ──

function CandidateCardVisual({
  id, rank, candidate, floating = false, dragHandleProps,
}: {
  id: string; rank: number; candidate: Candidate | null; floating?: boolean
  dragHandleProps?: Record<string, unknown>
}) {
  const isNone = id === NONE_ID
  const medal  = MEDAL[rank]

  return (
    <div
      {...(dragHandleProps ?? {})}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 14,
        background: isNone ? '#FEF2F2' : 'white',
        border: `2px solid ${floating ? '#7C3AED' : isNone ? '#FECACA' : medal ? medal.color + '55' : '#E2E8F0'}`,
        boxShadow: floating ? '0 16px 32px rgba(124,58,237,0.35)' : 'none',
        transform: floating ? 'scale(1.04) rotate(-1deg)' : 'none',
        cursor: floating ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      <span style={{ fontSize: 16, color: floating ? '#7C3AED' : '#CBD5E1', flexShrink: 0 }}>⋮⋮</span>

      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: medal ? medal.bg : '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: medal ? 15 : 12, fontWeight: 800, color: medal ? medal.color : '#64748B',
      }}>
        {medal ? medal.icon : rank}
      </div>

      {isNone ? (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
            🚫 Aucun des scénarios en dessous ne me convient vraiment
          </div>
          <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>
            Si cette option gagne le vote collectif, on revient à la phase Activités pour proposer d'autres idées.
          </div>
        </div>
      ) : candidate ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidate.activities.map(a => `${typeEmoji(a.type)} ${a.name}`).join(' + ')}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            📅 {candidate.dayLabel} · {minutesToTime(candidate.windowStart)}–{minutesToTime(candidate.windowEnd)}
            {' · '}💶 {candidate.totalCost}€/pers.
          </div>
        </div>
      ) : null}

      {!isNone && candidate && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '3px 8px', borderRadius: 7, background: '#EDE9FE', color: '#4C1D95', fontSize: 12, fontWeight: 700 }}>
              {candidate.myScore != null ? pct(candidate.myScore) : '—'}
            </div>
            <div style={{ fontSize: 7, color: '#94A3B8' }}>Moi</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '3px 8px', borderRadius: 7, background: '#E0F2FE', color: '#0369A1', fontSize: 12, fontWeight: 700 }}>
              {pct(candidate.groupScore)}
            </div>
            <div style={{ fontSize: 7, color: '#94A3B8' }}>Groupe</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Wrapper triable (dnd-kit) ─────────────────────────────────────────────────

function SortableCandidateCard({ id, rank, candidate }: { id: string; rank: number; candidate: Candidate | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1, // l'emplacement d'origine s'estompe — le "vrai" bloc flotte dans l'overlay
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CandidateCardVisual id={id} rank={rank} candidate={candidate} dragHandleProps={{ ...attributes, ...listeners }}/>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function VotePage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const eventId = params.id

  const [data,         setData]         = useState<VoteData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [order,        setOrder]        = useState<string[]>([])
  const [submitting,   setSubmitting]   = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [activeId,     setActiveId]     = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    const res  = await fetch(`/api/events/${eventId}/vote`)
    const json: VoteData = await res.json()
    if (!res.ok) { setError((json as { error?: string }).error ?? 'Erreur'); setLoading(false); return }

    if (json.concluded) {
      router.push(`/event/${eventId}/${json.redirectTo}`)
      return
    }

    setData(json)
    if (!silent) {
      if (json.myRanking) {
        setOrder(json.myRanking)
      } else if (json.candidates) {
        const sorted = [...json.candidates].sort((a, b) => (b.myScore ?? 0) - (a.myScore ?? 0))
        setOrder([...sorted.map(c => c.id), NONE_ID])
      }
    }
    setLoading(false)
  }, [eventId, router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => load(true), 15000)
    return () => clearInterval(interval)
  }, [load])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      setOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  async function handleSubmit() {
    setSubmitting(true); setError(null)
    const res  = await fetch(`/api/events/${eventId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranking: order }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Erreur'); setSubmitting(false); return }
    if (json.concluded) {
      router.push(`/event/${eventId}/${json.redirectTo}`)
      return
    }
    setJustSubmitted(true)
    setSubmitting(false)
    load(true)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Chargement du vote…</p>
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
          <Link href={`/event/${eventId}`} style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'underline' }}>← Retour à l'événement</Link>
        </div>
      </div>
    )
  }

  if (!data || !data.candidates || !data.progress || !data.event) return null

  const candidateById = Object.fromEntries(data.candidates.map(c => [c.id, c]))
  const activeIndex = activeId ? order.indexOf(activeId) : -1

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
        <Link href={`/event/${eventId}`} style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>{data.event.name}</Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Vote</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
          background: '#DDD6FE', color: '#4C1D95',
        }}>Phase 6 — Vote</span>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 100px' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Classez les scénarios par ordre de préférence
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Glissez-déposez pour réorganiser. Le résultat utilise la méthode de Condorcet — le scénario qui bat tous les autres en duel l'emporte.
          </p>
        </div>

        <ProgressWidget progress={data.progress}/>

        {justSubmitted && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 13, color: '#166534' }}>
            ✓ Vote enregistré — vous pouvez encore le modifier tant que tout le monde n'a pas voté.
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
              {order.map((id, idx) => (
                <SortableCandidateCard key={id} id={id} rank={idx + 1} candidate={candidateById[id] ?? null}/>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <CandidateCardVisual id={activeId} rank={activeIndex + 1} candidate={candidateById[activeId] ?? null} floating/>
            ) : null}
          </DragOverlay>
        </DndContext>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 13, color: '#991B1B' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: '13px 32px', borderRadius: 12, border: 'none',
            background: submitting ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: submitting ? '#94A3B8' : 'white',
            fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
          }}>
            {submitting ? 'Enregistrement…' : data.myRanking ? '✓ Mettre à jour mon vote' : '🗳️ Valider mon vote'}
          </button>
        </div>

      </main>
    </div>
  )
}
