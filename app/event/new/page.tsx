// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'
import Link from 'next/link'

interface Group { id: string; name: string; memberCount?: number; members?: { id: string; displayName: string; email: string }[] }

interface DateSlot {
  date: string
  label: string
  startTime: string
  endTime: string
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase())
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function windowMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          background: '#EDE9FE', color: '#7C3AED',
          fontSize: 10, fontWeight: 700, cursor: 'help', marginLeft: 5, flexShrink: 0,
        }}
      >?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1E293B', color: 'white',
          fontSize: 11, lineHeight: 1.5, padding: '7px 10px', borderRadius: 8,
          width: 230, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
        background: value ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}/>
    </button>
  )
}

// ── Popup création de groupe auto ─────────────────────────────────────────────
interface AutoGroupPopupProps {
  extraEmails: string[]
  onConfirm:   (groupName: string) => void
  onSkip:      () => void
  onCancel:    () => void
  mode:        'suggest' | 'required'  // suggest = optionnel, required = bloquant
}

function AutoGroupPopup({ extraEmails, onConfirm, onSkip, onCancel, mode }: AutoGroupPopupProps) {
  const [groupName, setGroupName] = useState(`Mon groupe (${new Date().toLocaleDateString('fr-FR', {month:'short',year:'numeric'})})`)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '28px 28px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>👥</div>
        <h2 style={{
          fontSize: 18, fontWeight: 700, color: '#1E293B',
          textAlign: 'center', marginBottom: 8,
        }}>
          {mode === 'required'
            ? 'Créer un groupe pour cet événement'
            : 'Créer un groupe avec ces participants ?'}
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
          {mode === 'required'
            ? `Vous avez ${extraEmails.length} participant(s) sans groupe. Un groupe est nécessaire pour suivre l'historique et calculer l'équité entre participants.`
            : `Vous avez ajouté ${extraEmails.length} participant(s) supplémentaire(s). Créer un groupe vous permettra de les retrouver facilement et de bénéficier de l'historique de compensation.`
          }
        </p>

        {/* Participants listés */}
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          marginBottom: 16, maxHeight: 100, overflowY: 'auto',
        }}>
          {extraEmails.map(e => (
            <div key={e} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>
              📧 {e}
            </div>
          ))}
        </div>

        {/* Nom du groupe */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: '#374151', marginBottom: 5,
          }}>
            Nom du groupe
          </label>
          <input
            type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9,
              border: '1.5px solid #DDD6FE', fontSize: 14,
              fontFamily: 'inherit', outline: 'none', color: '#1E293B',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {mode === 'suggest' && (
            <button type="button" onClick={onSkip}
              style={{
                flex: 1, padding: '10px', borderRadius: 9,
                border: '1.5px solid #E2E8F0', background: 'white',
                color: '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
              Pas maintenant
            </button>
          )}
          <button type="button" onClick={onCancel}
            style={{
              padding: '10px 16px', borderRadius: 9,
              border: '1.5px solid #E2E8F0', background: 'white',
              color: '#94A3B8', fontSize: 13, cursor: 'pointer',
            }}>
            Annuler
          </button>
          <button type="button" onClick={() => groupName.trim() && onConfirm(groupName.trim())}
            disabled={!groupName.trim()}
            style={{
              flex: 2, padding: '10px', borderRadius: 9, border: 'none',
              background: groupName.trim()
                ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
              color: groupName.trim() ? 'white' : '#94A3B8',
              fontSize: 13, fontWeight: 700,
              cursor: groupName.trim() ? 'pointer' : 'default',
            }}>
            Créer le groupe →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function NewEventPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const preselectedGroup = searchParams.get('group')

  const [allGroups,      setAllGroups]      = useState<Group[]>([])
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    preselectedGroup ? new Set([preselectedGroup]) : new Set()
  )
  const [excludedMemberIds, setExcludedMemberIds] = useState<Set<string>>(new Set())
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [location,     setLocation]     = useState('')
  const [locationMode, setLocationMode] = useState<'zone' | 'hub'>('zone')
  const [dates,        setDates]        = useState<DateSlot[]>([])
  const [dateInput,    setDateInput]    = useState('')
  const [startTime,    setStartTime]    = useState('10:00')
  const [endTime,      setEndTime]      = useState('18:00')
  const [extraEmail,   setExtraEmail]   = useState('')
  const [extraEmails,  setExtraEmails]  = useState<string[]>([])
  const [quorumEnabled, setQuorumEnabled] = useState(false)
  const [quorum,        setQuorum]        = useState(4)
  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [budgetInput,   setBudgetInput]   = useState('')
  const [budgetOverrunPct, setBudgetOverrunPct] = useState('0')
  const [budgetVisible,    setBudgetVisible]    = useState(true)
  const [openInvite,    setOpenInvite]    = useState(false)
  const [popup,  setPopup]  = useState<'suggest' | 'required' | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showDuplicatePicker, setShowDuplicatePicker] = useState(false)
  const [duplicateQuery, setDuplicateQuery] = useState('')
  const [duplicateResults, setDuplicateResults] = useState<{ id: string; name: string; groupName: string | null; dateLabel: string | null }[]>([])
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null)
  const [duplicateSourceName, setDuplicateSourceName] = useState<string | null>(null)
  const [duplicateActivityCount, setDuplicateActivityCount] = useState(0)

  useEffect(() => {
    if (!showDuplicatePicker) { setDuplicateResults([]); return }
    const handle = setTimeout(async () => {
      setDuplicateLoading(true)
      try {
        const res  = await fetch(`/api/events/mine?q=${encodeURIComponent(duplicateQuery)}`)
        const json = await res.json()
        setDuplicateResults(json.events ?? [])
      } catch {
        setDuplicateResults([])
      } finally {
        setDuplicateLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [showDuplicatePicker, duplicateQuery])

  async function applyDuplicateSource(id: string, label: string) {
    const res  = await fetch(`/api/events/${id}/duplicate-source`)
    if (!res.ok) return
    const src = await res.json()

    setName(src.name ? `${src.name} (copie)` : '')
    setDescription(src.description ?? '')
    setLocation(src.location ?? '')
    setLocationMode(src.locationMode ?? 'zone')
    setOpenInvite(src.openInvite ?? false)
    setSelectedGroups(new Set(src.groupIds ?? []))
    setExcludedMemberIds(new Set())
    setExtraEmails(src.extraEmails ?? [])

    // Fusionne les groupes de la source dans allGroups — y compris ceux auxquels je
    // n'appartiens pas moi-même, pour qu'ils apparaissent avec leur propre liste de
    // membres exclusifs, plutôt que d'être invisibles/non gérables dans ce formulaire.
    if (src.groupDetails?.length) {
      setAllGroups(prev => {
        const byId = new Map(prev.map((g: Group) => [g.id, g]))
        for (const g of src.groupDetails as unknown as { id: string; name: string; members: { id: string; displayName: string; email: string }[] }[]) {
          byId.set(g.id, { id: g.id, name: g.name, memberCount: g.members.length, members: g.members })
        }
        return [...byId.values()]
      })
    }
    if (src.quorum) { setQuorumEnabled(true); setQuorum(src.quorum) } else { setQuorumEnabled(false) }
    if (src.budgetGlobal) {
      setBudgetEnabled(true)
      setBudgetInput(String(src.budgetGlobal))
      setBudgetOverrunPct(String(Math.round((src.budgetOverrunPct ?? 0) * 100)))
      setBudgetVisible(src.budgetVisible ?? true)
    } else {
      setBudgetEnabled(false)
    }

    setDuplicateSourceId(id)
    setDuplicateSourceName(label)
    setDuplicateActivityCount(src.activityCount ?? 0)
    setShowDuplicatePicker(false)
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const res  = await fetch('/api/groups')
      const data = await res.json()

      type RawGroupMember = { user_id: string; status: string; users: { id: string; display_name: string | null; email: string } | null }
      type RawGroup = Group & { group_members?: RawGroupMember[] }

      function extractMembers(gm?: RawGroupMember[]): { id: string; displayName: string; email: string }[] {
        const seen = new Set<string>()
        const result: { id: string; displayName: string; email: string }[] = []
        for (const m of (gm ?? [])) {
          if (!m.users || !['active', 'invited'].includes(m.status) || seen.has(m.users.id)) continue
          seen.add(m.users.id)
          result.push({ id: m.users.id, displayName: m.users.display_name ?? m.users.email.split('@')[0], email: m.users.email })
        }
        return result
      }

      const ownedIds = new Set((data.owned ?? []).map((g: Group) => g.id))
      const all: Group[] = [
        ...(data.owned ?? []).map((g: RawGroup) => ({
          id: g.id, name: g.name,
          memberCount: extractMembers(g.group_members).length,
          members: extractMembers(g.group_members),
        })),
        ...(data.memberships ?? [])
          .map((m: { groups: RawGroup | null }) => m.groups)
          .filter((g: Group | null): g is Group => !!g && !ownedIds.has(g.id))
          .map((g: RawGroup) => ({
            id: g.id, name: g.name,
            memberCount: extractMembers(g.group_members).length,
            members: extractMembers(g.group_members),
          })),
      ]
      setAllGroups(all)
      if (preselectedGroup && all.some(g => g.id === preselectedGroup)) {
        setSelectedGroups(new Set([preselectedGroup]))
      } else if (all.length === 1) {
        setSelectedGroups(new Set([all[0].id]))
      }
    }
    load()
  }, [])

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleMember(id: string) {
    setExcludedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function addDate() {
    if (!dateInput || dates.length >= 5) return
    if (dates.some(d => d.date === dateInput)) return
    if (windowMinutes(startTime, endTime) <= 0) return
    setDates(prev => [...prev, {
      date: dateInput, label: formatDateLabel(dateInput), startTime, endTime,
    }])
    setDateInput('')
  }

  function removeDate(date: string) {
    setDates(prev => prev.filter(d => d.date !== date))
  }

  function updateSlot(date: string, field: 'startTime' | 'endTime', value: string) {
    setDates(prev => prev.map(d => d.date === date ? { ...d, [field]: value } : d))
  }

  function addExtra() {
    const e = extraEmail.trim().toLowerCase()
    if (!e.includes('@') || extraEmails.includes(e)) return
    setExtraEmails(prev => [...prev, e])
    setExtraEmail('')
  }

  // ── Validation et soumission ──────────────────────────────────────────────
  function handleClickSubmit() {
	  if (!name.trim() || !dates.length) return
	  setErrorMsg('')

	  const hasGroups = selectedGroups.size > 0
	  const hasExtras = extraEmails.length > 0
	  const enoughPax = extraEmails.length >= 2

	  // Invitation ouverte → validation souple, on soumet directement
	  // Les participants et groupes seront ajoutés à la phase suivante
	  if (openInvite) {
		submitEvent([...selectedGroups])
		return
	  }

	  // Invitation fermée — validation stricte
	  if (!hasGroups && !enoughPax) {
		setErrorMsg(
		  extraEmails.length === 1
			? 'Ajoutez au moins un groupe ou un deuxième participant (minimum 2 sans groupe).'
			: 'Sélectionnez au moins un groupe ou ajoutez des participants (minimum 2).'
		)
		return
	  }

	  // Pas de groupe mais >= 2 participants → créer un groupe obligatoire
	  if (!hasGroups && enoughPax) {
		setPopup('required')
		return
	  }

	  // Groupes + extras → proposer de créer un groupe
	  if (hasGroups && hasExtras) {
		setPopup('suggest')
		return
	  }

	  // Cas normal
	  submitEvent([...selectedGroups])
  }

  async function handleAutoGroup(groupName: string) {
    // Crée le groupe avec les participants supplémentaires
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName, description: null, emails: extraEmails }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPopup(null)
      setErrorMsg(data.error ?? 'Erreur lors de la création du groupe.')
      return
    }
    const newGroupId = data.id
    setPopup(null)
    submitEvent([...selectedGroups, newGroupId])
  }

  async function submitEvent(groupIds: string[]) {
    setStatus('loading')
    const budget = budgetEnabled ? Number(budgetInput) : null

    // null = tout le monde dans les groupes (comportement par défaut) ; sinon la liste
    // explicite des membres NON exclus, à travers tous les groupes sélectionnés.
    const allMemberIdsInSelectedGroups = groupIds.flatMap(gid =>
      (allGroups.find(g => g.id === gid)?.members ?? []).map(m => m.id)
    )
    const invitedMemberIds = excludedMemberIds.size > 0
      ? [...new Set(allMemberIdsInSelectedGroups.filter(id => !excludedMemberIds.has(id)))]
      : null

    const res = await fetch('/api/events', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        name.trim(),
        description: description.trim() || null,
        groupIds,
        invitedMemberIds,
        sourceEventId: duplicateSourceId,
        location:    location.trim() || null,
        locationMode,
        extraEmails,
        openInvite,
        proposedDates: dates.map(d => ({
          label:     d.label,
          date:      d.date,
          startTime: d.startTime,
          endTime:   d.endTime,
          window:    windowMinutes(d.startTime, d.endTime),
        })),
        quorum:       quorumEnabled ? quorum : null,
        budgetGlobal: budget && budget > 0 ? budget : null,
        budgetOverrunPct: budget && budget > 0 ? (Number(budgetOverrunPct) || 0) / 100 : null,
        budgetVisible:    budget && budget > 0 ? budgetVisible : null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setStatus('error')
      setErrorMsg(data.error ?? 'Erreur lors de la création.')
      return
    }
    router.push(`/event/${data.id}`)
  }

  const formValid = name.trim() && dates.length > 0

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
    color: '#1E293B', background: 'white',
    boxSizing: 'border-box', width: '100%',
  }
  const labelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
  }
  const sectionStyle: React.CSSProperties = { marginBottom: 24 }
  const timeInputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8,
    border: '1.5px solid #DDD6FE', fontSize: 13,
    color: '#4C1D95', background: '#F5F3FF',
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Popup création groupe auto */}
      {popup && (
        <AutoGroupPopup
          extraEmails={extraEmails}
          mode={popup}
          onConfirm={handleAutoGroup}
          onSkip={() => { setPopup(null); submitEvent([...selectedGroups]) }}
          onCancel={() => setPopup(null)}
        />
      )}

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px', background: 'white', borderBottom: '1px solid #E2E8F0',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28}/>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95' }}>IRIS</span>
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Nouvel événement</span>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 100px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#1E293B',
            letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            Créer un événement
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Proposez des dates à votre groupe — chaque participant indiquera
            ses disponibilités et préférences.
          </p>
        </div>

        {/* Dupliquer un événement existant — préremplit le formulaire, seules les
            dates restent à choisir puisque c'est le seul paramètre qui doit varier. */}
        <div style={{ marginBottom: 20 }}>
          {duplicateSourceId ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '10px 14px', borderRadius: 10, background: '#EDE9FE', border: '1px solid #DDD6FE',
            }}>
              <span style={{ fontSize: 13, color: '#4C1D95' }}>
                📋 Prérempli depuis « {duplicateSourceName} »
                {duplicateActivityCount > 0 && ` — ${duplicateActivityCount} activité${duplicateActivityCount > 1 ? 's' : ''} sera${duplicateActivityCount > 1 ? 'ont' : ''} copiée${duplicateActivityCount > 1 ? 's' : ''}`}
                . Choisissez de nouvelles dates ci-dessous, et vérifiez la liste des invités (les membres d'un groupe auquel vous n'appartenez pas apparaissent en participants individuels).
              </span>
              <button type="button" onClick={() => { setDuplicateSourceId(null); setDuplicateSourceName(null); setDuplicateActivityCount(0) }} style={{
                fontSize: 12, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Annuler ✕
              </button>
            </div>
          ) : !showDuplicatePicker ? (
            <button type="button" onClick={() => setShowDuplicatePicker(true)} style={{
              fontSize: 13, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              📋 Dupliquer un événement existant…
            </button>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input type="text" value={duplicateQuery} onChange={e => setDuplicateQuery(e.target.value)}
                  placeholder="Rechercher un de vos événements par nom…" autoFocus
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
                    fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1E293B', background: 'white',
                  }}
                />
                <button type="button" onClick={() => setShowDuplicatePicker(false)} style={{
                  fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  Annuler
                </button>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 4 }}>
                {duplicateLoading && <div style={{ fontSize: 12, color: '#94A3B8', padding: '6px 8px' }}>Recherche…</div>}
                {!duplicateLoading && duplicateResults.length === 0 && (
                  <div style={{ fontSize: 12, color: '#94A3B8', padding: '6px 8px' }}>Aucun événement trouvé.</div>
                )}
                {!duplicateLoading && duplicateResults.map(ev => (
                  <button key={ev.id} type="button" onClick={() => applyDuplicateSource(ev.id, ev.name)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 10px', borderRadius: 8, background: 'white', border: '1px solid #E2E8F0',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600 }}>{ev.name}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {ev.groupName ?? '—'}{ev.dateLabel ? ` · ${ev.dateLabel}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pas de groupe — bandeau d'info */}
        {allGroups.length === 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: '#FEF9C3', border: '1px solid #FDE68A',
            fontSize: 13, color: '#713F12',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>💡 Vous n'avez pas encore de groupe.</span>
            <Link href="/group/new" style={{
              color: '#4C1D95', fontWeight: 700, textDecoration: 'none',
              background: '#EDE9FE', padding: '4px 10px', borderRadius: 6, fontSize: 12,
            }}>
              + Créer un groupe
            </Link>
          </div>
        )}

        <div>

          {/* ── Nom ── */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Nom de l'événement <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Soirée d'équipe, Journée cohésion, Anniversaire…"
              required maxLength={80} autoFocus style={inputStyle}
            />
          </div>

          {/* ── Description ── */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Description
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>
                optionnel
              </span>
            </label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Contexte, idées, contraintes particulières…"
              rows={2} maxLength={300}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* ── Groupes ── */}
          {allGroups.length > 0 && (
            <div style={sectionStyle}>
              <label style={labelStyle}>
                Groupes invités
                <Tooltip text="Sélectionnez un ou plusieurs groupes. Un participant commun à plusieurs groupes n'est compté qu'une fois. L'historique de chaque groupe contribue au calcul d'équité Rᵢ." />
              </label>
              <div style={{ display: 'grid', gap: 8 }}>
                {allGroups.map(g => {
                  const selected = selectedGroups.has(g.id)
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                      style={{
                        padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${selected ? '#7C3AED' : '#E2E8F0'}`,
                        background: selected ? '#F5F3FF' : 'white',
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: selected
                          ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#EDE9FE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: selected ? 'white' : '#7C3AED',
                      }}>
                        {g.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 500,
                          color: selected ? '#4C1D95' : '#1E293B',
                        }}>
                          {g.name}
                        </div>
                        {g.memberCount !== undefined && (
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            {g.memberCount} membre{g.memberCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${selected ? '#7C3AED' : '#CBD5E1'}`,
                        background: selected ? '#7C3AED' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Membres des groupes sélectionnés — cochés par défaut, décocher pour exclure.
                  L'organisateur n'apparaît jamais ici : il fait toujours partie de son
                  propre événement, se l'exclure soi-même n'aurait aucun sens et pourrait
                  même le couper de l'accès à ce qu'il vient de créer. */}
              {[...selectedGroups].map(gid => {
                const g = allGroups.find(x => x.id === gid)
                const invitableMembers = (g?.members ?? []).filter(m => m.id !== currentUserId)
                if (!invitableMembers.length) return null
                return (
                  <div key={gid} style={{ marginTop: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
                      Membres de {g!.name} à inviter à cet événement
                    </div>
                    <div style={{ display: 'grid', gap: 4, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                      {invitableMembers.map(m => {
                        const included = !excludedMemberIds.has(m.id)
                        return (
                          <label key={m.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            padding: '4px 6px', borderRadius: 6, fontSize: 13,
                            color: included ? '#1E293B' : '#94A3B8',
                          }}>
                            <input type="checkbox" checked={included} onChange={() => toggleMember(m.id)} />
                            {m.displayName}
                            {!included && <span style={{ fontSize: 11 }}>(exclu)</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {selectedGroups.size > 1 && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: '#EDE9FE', fontSize: 12, color: '#4C1D95',
                }}>
                  ℹ️ {selectedGroups.size} groupes — participants communs comptés une seule fois.
                </div>
              )}
              <Link href="/group/new" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 8, fontSize: 12, color: '#7C3AED',
                textDecoration: 'none', fontWeight: 500,
              }}>
                + Créer un nouveau groupe
              </Link>
            </div>
          )}

          {/* ── Participants supplémentaires ── */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Participants supplémentaires
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>
                optionnel
              </span>
              <Tooltip text="Personnes hors des groupes sélectionnés. Leur historique personnel global est utilisé pour le calcul d'équité. Vous pourrez les regrouper dans un nouveau groupe à la soumission." />
            </label>

            {extraEmails.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                padding: '8px 10px', background: '#F8FAFC',
                borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 8,
              }}>
                {extraEmails.map(e => (
                  <span key={e} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20,
                    background: '#EDE9FE', color: '#4C1D95', fontSize: 12, fontWeight: 500,
                  }}>
                    {e}
                    <button type="button"
                      onClick={() => setExtraEmails(p => p.filter(x => x !== e))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#7C3AED', fontSize: 14, lineHeight: 1, padding: 0,
                      }}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email" value={extraEmail}
                onChange={e => setExtraEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addExtra() }
                }}
                placeholder="email@exemple.com"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={addExtra}
                disabled={!extraEmail.includes('@')}
                style={{
                  padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: extraEmail.includes('@') ? '#EDE9FE' : '#F8FAFC',
                  color: extraEmail.includes('@') ? '#4C1D95' : '#94A3B8',
                  border: `1.5px solid ${extraEmail.includes('@') ? '#DDD6FE' : '#E2E8F0'}`,
                  cursor: extraEmail.includes('@') ? 'pointer' : 'default',
                }}>
                + Ajouter
              </button>
            </div>
          </div>

          {/* ── Localisation ── */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Localisation de l'évènement
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>
                optionnel
              </span>
              <Tooltip text="Zone géographique : le moteur recherche des activités dans cette zone. Lieu fixe : point de rendez-vous fixe (hub) autour duquel les activités sont proposées." />
            </label>
            <div style={{
              display: 'flex', background: '#F8FAFC', borderRadius: 8,
              padding: 3, marginBottom: 10, gap: 3,
            }}>
              {(['zone', 'hub'] as const).map(m => (
                <button key={m} type="button" onClick={() => setLocationMode(m)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: locationMode === m ? 'white' : 'transparent',
                    color: locationMode === m ? '#4C1D95' : '#94A3B8',
                    boxShadow: locationMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {m === 'zone' ? '📍 Zone de recherche' : '🏠 Lieu fixe (hub)'}
                </button>
              ))}
            </div>
            <input
              type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder={locationMode === 'zone'
                ? 'Ex : Paris centre, Lyon 2ème…'
                : 'Ex : Siège social, Domicile de Marie…'}
              style={inputStyle}
            />
          </div>

          {/* ── Dates ── */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Dates proposées <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>
                1 à 5 dates
              </span>
              <Tooltip text="Pour chaque date, définissez la tranche horaire. Le moteur ne proposera que des scénarios tenant dans ce créneau, trajets compris." />
            </label>

            {dates.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                {dates.map(d => {
                  const win = windowMinutes(d.startTime, d.endTime)
                  return (
                    <div key={d.date} style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: 'white', border: '1px solid #DDD6FE',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', flex: 1 }}>
                          📅 {d.label}
                        </span>
                        <button type="button" onClick={() => removeDate(d.date)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#94A3B8', fontSize: 18, padding: '0 4px',
                          }}>×</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>De</span>
                        <input type="time" value={d.startTime}
                          onChange={e => updateSlot(d.date, 'startTime', e.target.value)}
                          style={timeInputStyle}/>
                        <span style={{ fontSize: 12, color: '#64748B' }}>à</span>
                        <input type="time" value={d.endTime}
                          onChange={e => updateSlot(d.date, 'endTime', e.target.value)}
                          style={timeInputStyle}/>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: win > 0 ? '#7C3AED' : '#EF4444',
                          background: win > 0 ? '#EDE9FE' : '#FEE2E2',
                          padding: '3px 8px', borderRadius: 6,
                        }}>
                          {win > 0
                            ? `${Math.floor(win/60)}h${win%60 > 0 ? String(win%60).padStart(2,'0') : ''}`
                            : 'Invalide'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {dates.length < 5 && (
              <div style={{
                padding: '14px', borderRadius: 10,
                background: '#F8FAFC', border: '1.5px dashed #E2E8F0',
              }}>
                <input
                  type="date" value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  min={todayStr()}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDate())}
                  style={{ ...inputStyle, marginBottom: 8 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>De</span>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    style={{ ...timeInputStyle, background: 'white', borderColor: '#E2E8F0', color: '#1E293B' }}/>
                  <span style={{ fontSize: 12, color: '#64748B' }}>à</span>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ ...timeInputStyle, background: 'white', borderColor: '#E2E8F0', color: '#1E293B' }}/>
                  <button type="button" onClick={addDate}
                    disabled={!dateInput || windowMinutes(startTime, endTime) <= 0}
                    style={{
                      padding: '9px 16px', borderRadius: 9, flexShrink: 0, border: 'none',
                      background: dateInput && windowMinutes(startTime, endTime) > 0
                        ? '#4C1D95' : '#E2E8F0',
                      color: dateInput && windowMinutes(startTime, endTime) > 0
                        ? 'white' : '#94A3B8',
                      fontSize: 13, fontWeight: 600,
                      cursor: dateInput && windowMinutes(startTime, endTime) > 0
                        ? 'pointer' : 'default',
                    }}>
                    + Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Options avancées ── */}
          <div style={{
            marginBottom: 24, padding: '16px 18px', borderRadius: 12,
            background: 'white', border: '1px solid #E2E8F0',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
            }}>
              Options avancées
            </div>

            {/* Quorum */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #F1F5F9',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                    Quorum minimum
                  </span>
                  <Tooltip text="Nombre minimum de participants requis pour valider une date. Désactivé = toute date avec ≥ 1 participant est éligible." />
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  Participants minimum pour valider une date.
                </p>
                {quorumEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <input type="range" min={2} max={20} value={quorum}
                      onChange={e => setQuorum(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#7C3AED' }}/>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#4C1D95',
                      minWidth: 32, textAlign: 'center',
                    }}>
                      {quorum}
                    </span>
                  </div>
                )}
              </div>
              <Toggle value={quorumEnabled} onChange={setQuorumEnabled}/>
            </div>

            {/* Budget global */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #F1F5F9',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                    Budget global de l'événement
                  </span>
                  <Tooltip text="Budget total pris en charge par l'organisateur (entreprise, association, hôte). Distinct du budget individuel de chaque participant saisi dans son profil." />
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  Coût total maximum (entreprise, association, hôte…).
                </p>
                {budgetEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <input
                      type="number" value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      placeholder="Ex : 1500"
                      min={1} step={1}
                      style={{
                        width: 120, padding: '7px 10px', borderRadius: 8,
                        border: '1.5px solid #DDD6FE', fontSize: 14,
                        fontFamily: 'inherit', outline: 'none', color: '#4C1D95',
                        background: '#F5F3FF',
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#64748B' }}>€</span>
                    {budgetInput && Number(budgetInput) > 0 && (
                      <span style={{
                        fontSize: 11, color: '#7C3AED', background: '#EDE9FE',
                        padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                      }}>
                        {Number(budgetInput).toLocaleString('fr-FR')} € au total
                      </span>
                    )}
                  </div>
                )}
                {budgetEnabled && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, color: '#64748B' }}>Dépassement toléré :</label>
                      <input
                        type="number" value={budgetOverrunPct}
                        onChange={e => setBudgetOverrunPct(e.target.value)}
                        min={0} max={100} step={5}
                        style={{
                          width: 60, padding: '5px 8px', borderRadius: 7,
                          border: '1.5px solid #DDD6FE', fontSize: 13,
                          fontFamily: 'inherit', outline: 'none', color: '#4C1D95',
                          background: '#F5F3FF',
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#64748B' }}>%</span>
                      <Tooltip text="Un scénario dépassant légèrement le budget peut quand même être proposé, dans cette limite. 0% = aucun dépassement accepté." />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B', cursor: 'pointer' }}>
                      <input type="checkbox" checked={budgetVisible} onChange={e => setBudgetVisible(e.target.checked)} />
                      Montant (et seuil) visibles par les participants
                    </label>
                  </div>
                )}
              </div>
              <Toggle value={budgetEnabled} onChange={setBudgetEnabled}/>
            </div>

            {/* Invitation ouverte */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                    Invitation ouverte
                  </span>
                  <Tooltip text="Les participants peuvent inviter leurs propres groupes et contacts depuis leur page de réponse. La validation du minimum de participants se fait à la phase de confirmation des disponibilités." />
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  Les participants peuvent inviter d'autres personnes.
                </p>
                {openInvite && (
                  <div style={{
                    marginTop: 8, padding: '7px 10px', borderRadius: 7,
                    background: '#FEF9C3', border: '1px solid #FDE68A',
                    fontSize: 12, color: '#713F12',
                  }}>
                    ⚠️ N'importe quel participant pourra agrandir la liste des invités.
                    La validation du quorum se fera à la phase suivante.
                  </div>
                )}
              </div>
              <Toggle value={openInvite} onChange={setOpenInvite}/>
            </div>
          </div>

          {/* Erreur */}
          {(status === 'error' || errorMsg) && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#FEE2E2', color: '#991B1B',
              fontSize: 13, marginBottom: 16,
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Récap */}
          {formValid && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, lineHeight: 1.6,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              fontSize: 13, color: '#166534', marginBottom: 16,
            }}>
              ✓ <strong>{name}</strong>
              {selectedGroups.size > 0 && ` · ${selectedGroups.size} groupe${selectedGroups.size > 1 ? 's' : ''}`}
              {extraEmails.length > 0 && ` + ${extraEmails.length} invité(s) direct(s)`}
              {' '}· {dates.length} date{dates.length > 1 ? 's' : ''}
              {quorumEnabled && ` · quorum ${quorum}`}
              {budgetEnabled && budgetInput && ` · budget ${Number(budgetInput).toLocaleString('fr-FR')} €`}
              {openInvite && ' · invitation ouverte'}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Link href="/dashboard" style={{
              padding: '11px 22px', borderRadius: 10,
              border: '1.5px solid #E2E8F0', color: '#64748B',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>
              Annuler
            </Link>
            <button
              type="button"
              onClick={handleClickSubmit}
              disabled={!formValid || status === 'loading'}
              style={{
                padding: '11px 28px', borderRadius: 10, border: 'none',
                background: formValid && status !== 'loading'
                  ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
                color: formValid && status !== 'loading' ? 'white' : '#94A3B8',
                fontSize: 14, fontWeight: 700,
                cursor: formValid && status !== 'loading' ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {status === 'loading' ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }}/>
                  Création…
                </>
              ) : 'Créer l\'événement →'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        </div>
      </main>

      {/* Bouton feedback flottant */}
      <a href="https://tally.so/r/Y5qxz0" target="_blank" rel="noopener noreferrer"
        title="Donner un feedback ou suggérer une amélioration"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 24,
          background: 'white', color: '#4C1D95',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(76,29,149,0.15)',
          border: '1.5px solid #DDD6FE', zIndex: 100,
        }}>
        💬 Suggestion
      </a>

    </div>
  )
}
