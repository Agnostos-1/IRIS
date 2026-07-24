// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'
import Link from 'next/link'
import InviteLinkBox from '@/components/InviteLinkBox'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateSlot {
  label: string
  date: string
  startTime: string
  endTime: string
  window: number
}

interface Availability {
  userId:      string
  displayName: string
  email?:      string
  statuses:    Record<string, 'ok' | 'no' | 'cond'>
  probas:      Record<string, number>
  slots:       Record<string, { start: string; end: string }>
  budget?:     number
  submitted:   boolean
}

interface EventData {
  id:             string
  name:           string
  description:    string | null
  phase:          number
  proposedDates:  DateSlot[]
  location:       string | null
  locationMode:   string
  inviteCode:     string
  openInvite:     boolean
  budgetGlobal:   number | null
  budgetVisible:  boolean
  budgetOverrunPct: number
  quorum:         number | null
  deadline:       string | null
  autoReminder:   boolean
  revealAfterSubmit: boolean
  groupIds:       string[]
  createdBy:      string
  createdAt:      string
  groupNames:     string[]
  cancelledAt:    string | null
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function daysLeft(deadline: string): number {
  const d = new Date(deadline)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function pct(n: number, total: number): string {
  if (!total) return '0%'
  return Math.round((n / total) * 100) + '%'
}

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
          fontSize: 10, fontWeight: 700, cursor: 'help', marginLeft: 5,
        }}
      >?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1E293B', color: 'white',
          fontSize: 11, lineHeight: 1.5, padding: '7px 10px', borderRadius: 8,
          width: 220, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          pointerEvents: 'none', whiteSpace: 'normal',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()

  const [eventId,       setEventId]       = useState<string | null>(null)
  const [event,         setEvent]         = useState<EventData | null>(null)
  const [currentUser,   setCurrentUser]   = useState<{ id: string; email: string } | null>(null)
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [serverMedianBudget, setServerMedianBudget] = useState<number | null>(null)
  const [myAvail,       setMyAvail]       = useState<Availability | null>(null)
  const [hasSubmitted,  setHasSubmitted]  = useState(false)

  // Formulaire participant
  const [myStatuses, setMyStatuses] = useState<Record<string, 'ok' | 'no' | 'cond'>>({})
  const [myProbas,   setMyProbas]   = useState<Record<string, number>>({})
  const [myBudget,   setMyBudget]   = useState('')
  const [mySlots,    setMySlots]    = useState<Record<string, { start: string; end: string }>>({})
  const [saving,     setSaving]     = useState(false)

  // Organisateur — modifier événement
  const [editMode,      setEditMode]      = useState(false)
  const [deadlineInput, setDeadlineInput] = useState('')
  const [autoReminder,  setAutoReminder]  = useState(true)
  const [revealAfter,   setRevealAfter]   = useState(true)
  const [descriptionInput,   setDescriptionInput]   = useState('')
  const [budgetGlobalInput,  setBudgetGlobalInput]  = useState('')
  const [budgetOverrunInput, setBudgetOverrunInput] = useState('0')
  const [openInviteEdit,     setOpenInviteEdit]     = useState(false)
  const [savingEdit,    setSavingEdit]    = useState(false)

  // Invitation ouverte
  const [extraEmail,  setExtraEmail]  = useState('')
  const [extraEmails, setExtraEmails] = useState<string[]>([])
  const [inviteStatus, setInviteStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [inviteMsg,   setInviteMsg]   = useState('')

  // Clôture
  const [closingPhase, setClosingPhase] = useState(false)
  const [proposedDate, setProposedDate] = useState<DateSlot | null>(null)

  //Bandeau
  const [profileDone, setProfileDone] = useState(true)

  // Synchro différée des préférences (participants non-organisateurs qui ont
  // modifié une appréciation pendant la Phase Activités, désormais clôturée)
  const [prefSyncDiffs,      setPrefSyncDiffs]      = useState<{ type: string; oldVal: number | null; newVal: number }[]>([])
  const [showPrefSyncModal,  setShowPrefSyncModal]  = useState(false)
  const [prefSyncDecisions,  setPrefSyncDecisions]  = useState<Record<string, { action: 'update' | 'create_subtype' | 'skip'; parent: string; subtype: string }>>({})
  const [prefSyncSubmitting, setPrefSyncSubmitting] = useState(false)
  const [missingWarning, setMissingWarning] = useState<{ missingCount: number; totalCount: number } | null>(null)
  const [groupAssignment, setGroupAssignment] = useState<{ extras: { id: string; displayName: string; email: string }[]; ownedGroups: { id: string; name: string }[] } | null>(null)
  const [groupChoice, setGroupChoice] = useState<'existing' | 'new' | 'none'>('new')
  const [groupChoiceId, setGroupChoiceId] = useState('')
  const [groupChoiceName, setGroupChoiceName] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Résolution des params async
  useEffect(() => {
    params.then(p => setEventId(p.id))
  }, [params])

  // Chargement initial
  const loadAll = useCallback(async () => {
    if (!eventId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setCurrentUser({ id: user.id, email: user.email ?? '' })

    const res = await fetch(`/api/events/${eventId}`)
    if (!res.ok) { router.push('/dashboard'); return }
    const data = await res.json()
    setEvent(data.event)
    const profileRes = await fetch('/api/profile')
    if (profileRes.ok) {
      const profileData = await profileRes.json()
      setProfileDone(profileData.onboarding_done ?? false)
    }
    setAvailabilities(data.availabilities)
    setServerMedianBudget(data.medianBudget ?? null)
    setDeadlineInput(data.event.deadline?.split('T')[0] ?? '')
    setAutoReminder(data.event.autoReminder ?? true)
    setRevealAfter(data.event.revealAfterSubmit ?? true)
    setDescriptionInput(data.event.description ?? '')
    setBudgetGlobalInput(data.event.budgetGlobal != null ? String(data.event.budgetGlobal) : '')
    setBudgetOverrunInput(String(Math.round((data.event.budgetOverrunPct ?? 0) * 100)))
    setOpenInviteEdit(data.event.openInvite ?? false)

    const mine = data.availabilities.find((a: Availability) => a.userId === user.id)
    if (mine) {
      setMyAvail(mine)
      setMyStatuses(mine.statuses)
      setMyProbas(mine.probas)
      setMyBudget(mine.budget ? String(mine.budget) : '')
      setMySlots(mine.slots ?? {})
      setHasSubmitted(mine.submitted)
    }

    // Vérifie si des préférences ajustées pendant la Phase Activités (désormais
    // close) diffèrent encore du profil permanent — propose la synchro si oui.
    const syncRes = await fetch(`/api/events/${eventId}/pref-sync-check`)
    if (syncRes.ok) {
      const syncData = await syncRes.json()
      if (syncData.diffs?.length > 0) {
        setPrefSyncDiffs(syncData.diffs)
        setPrefSyncDecisions(Object.fromEntries(
          syncData.diffs.map((d: { type: string; oldVal: number | null }) => [d.type, { action: d.oldVal === null ? 'update' : 'update', parent: d.type, subtype: '' }])
        ))
        setShowPrefSyncModal(true)
      }
    }
  }, [eventId, router])

  useEffect(() => { loadAll() }, [loadAll])

  function normalizeTypeNameLocal(raw: string): string {
    return raw.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  async function handlePrefSyncConfirm() {
    setPrefSyncSubmitting(true)
    try {
      const profileRes = await fetch('/api/profile')
      const profile     = profileRes.ok ? await profileRes.json() : null
      const currentPrefs = (profile?.activity_prefs ?? {}) as Record<string, number>
      const nextPrefs = { ...currentPrefs }

      for (const diff of prefSyncDiffs) {
        const dec = prefSyncDecisions[diff.type]
        if (!dec || dec.action === 'skip') continue
        if (dec.action === 'update') {
          nextPrefs[diff.type] = diff.newVal
        } else if (dec.action === 'create_subtype' && dec.parent) {
          const subtypeName = normalizeTypeNameLocal(dec.subtype || diff.type)
          nextPrefs[subtypeName] = diff.newVal
          fetch('/api/activity-subtypes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parent_type: dec.parent, name: subtypeName }),
          }).catch(() => {})
        }
      }

      await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, activity_prefs: nextPrefs, onboarding_done: true }),
      })
      // Marque comme traité — efface les pref_overrides en attente pour cet événement
      await fetch(`/api/events/${eventId}/pref-sync-check`, { method: 'POST' })
    } finally {
      setShowPrefSyncModal(false)
      setPrefSyncSubmitting(false)
    }
  }

  async function handlePrefSyncDismiss() {
    await fetch(`/api/events/${eventId}/pref-sync-check`, { method: 'POST' })
    setShowPrefSyncModal(false)
  }

  if (!event || !currentUser) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui', background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED',
            borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  const isOrganizer = event.createdBy === currentUser.id
  const dates       = event.proposedDates ?? []

  if (event.cancelledAt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8FAFC', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>Événement annulé</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
            "{event.name}" a été annulé par l'organisateur le {new Date(event.cancelledAt).toLocaleDateString('fr-FR')}.
          </p>
          <Link href="/dashboard" style={{
            padding: '11px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>← Retour au dashboard</Link>
        </div>
      </div>
    )
  }

  // Score par date : somme des poids de présence
function dateScore(date: string): { score: number; ok: number; cond: number; no: number } {
  let score = 0, ok = 0, cond = 0, no = 0
  availabilities.forEach(a => {
    const s = a.statuses[date] ?? 'no'
    const p = (a.probas[date] ?? 70) / 100

    // Calcule le ratio de présence selon les horaires personnalisés
    const slot = a.slots?.[date]
    const eventDate = event?.proposedDates?.find(d => d.date === date)
    let slotRatio = 1.0
    if (slot && eventDate) {
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
      }
      const eventDur = toMin(eventDate.endTime) - toMin(eventDate.startTime)
      const slotDur  = toMin(slot.end) - toMin(slot.start)
      if (eventDur > 0) slotRatio = Math.min(1, Math.max(0, slotDur / eventDur))
    }

    if (s === 'ok')   { score += 1 * slotRatio;   ok++ }
    if (s === 'cond') { score += p * slotRatio;   cond++ }
    if (s === 'no')   { no++ }
  })
  return { score, ok, cond, no }
}

  const bestDate = dates.reduce<DateSlot | null>((best, d) => {
    if (!best) return d
    return dateScore(d.date).score > dateScore(best.date).score ? d : best
  }, null)

  // Sauvegarde disponibilités
  async function handleSaveAvail() {
    setSaving(true)
    const res = await fetch(`/api/events/${eventId}/availability`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statuses:  myStatuses,
        probas:    myProbas,
        slots:     mySlots,
        budget:    myBudget ? Number(myBudget) : null,
        submitted: true,
      }),
    })
    if (res.ok) {
      setHasSubmitted(true)
      // Garde les slots locaux, recharge seulement les availabilities des autres
      const slotsBackup = { ...mySlots }
      await loadAll()
      setMySlots(slotsBackup)
    }
    setSaving(false)
  }

  // Sauvegarde paramètres organisateur
  async function handleSaveEdit() {
    setSavingEdit(true)
    await fetch(`/api/events/${eventId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deadline:           deadlineInput || null,
        autoReminder,
        revealAfterSubmit:  revealAfter,
        description:        descriptionInput.trim() || null,
		budgetGlobal:       event!.budgetGlobal != null && budgetGlobalInput ? Number(budgetGlobalInput) : event!.budgetGlobal,
        budgetOverrunPct:   event!.budgetGlobal != null ? (Number(budgetOverrunInput) || 0) / 100 : undefined,
        openInvite:         openInviteEdit,
      }),
    })
    setSavingEdit(false)
    setEditMode(false)
    await loadAll()
  }

  // Invitation ouverte — ajouter participant
  async function handleInvite() {
    const e = extraEmail.trim().toLowerCase()
    if (!e.includes('@')) return
    if (extraEmails.includes(e)) return
    setInviteStatus('loading')
    const res = await fetch(`/api/events/${eventId}/invite`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    })
    const data = await res.json()
    if (res.ok) {
      setExtraEmails(p => [...p, e])
      setExtraEmail('')
      setInviteStatus('success')
      setInviteMsg(data.existing ? `${e} ajouté.` : `Invitation envoyée à ${e}.`)
      setTimeout(() => setInviteStatus('idle'), 3000)
      await loadAll()
    } else {
      setInviteStatus('error')
      setInviteMsg(data.error ?? 'Erreur')
    }
  }

  async function handleCancelEvent() {
    setCancelling(true)
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    if (res.ok) {
      setEvent(prev => prev ? { ...prev, cancelledAt: new Date().toISOString() } : prev)
    } else {
      const { error } = await res.json()
      alert(error ?? 'Erreur lors de l\'annulation.')
    }
    setCancelling(false)
    setShowCancelConfirm(false)
  }

  // Clôture de la phase
  async function handleClose() {
    if (!bestDate) return
    setProposedDate(bestDate)
    setClosingPhase(true)
  }

	async function confirmClose(force = false, groupAction: { type: 'existing'; groupId: string } | { type: 'new'; groupName: string } | { type: 'none' } | null = null) {
	  if (!proposedDate) return
	  const res = await fetch(`/api/events/${eventId}/close-phase`, {
		method:  'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ selectedDate: proposedDate, force, groupAction }),
	  })
	  const json = await res.json()
	  if (res.ok && json.needsConfirmation) {
	    setMissingWarning({ missingCount: json.missingCount, totalCount: json.totalCount })
	    return
	  }
	  if (res.ok && json.needsGroupAssignment) {
	    setMissingWarning(null)
	    setGroupAssignment({ extras: json.extras, ownedGroups: json.ownedGroups })
	    setGroupChoice(json.ownedGroups?.length ? 'existing' : 'new')
	    if (json.ownedGroups?.length) setGroupChoiceId(json.ownedGroups[0].id)
	    return
	  }
	  if (res.ok) {
		setClosingPhase(false)
		setMissingWarning(null)
		setEvent(prev => prev ? { ...prev, phase: 3 } : prev)
		router.push(`/event/${eventId}/activities`)
	  } else {
		alert(json.error ?? 'Erreur lors de la clôture.')
	  }
	}

	function submitGroupChoice() {
	  if (groupChoice === 'existing' && groupChoiceId) {
	    confirmClose(true, { type: 'existing', groupId: groupChoiceId })
	  } else if (groupChoice === 'new' && groupChoiceName.trim()) {
	    confirmClose(true, { type: 'new', groupName: groupChoiceName.trim() })
	  } else if (groupChoice === 'none') {
	    confirmClose(true, { type: 'none' })
	  }
	}

  const respondedCount = availabilities.filter(a => a.submitted).length
  const medianBudget = serverMedianBudget
  const totalCount     = availabilities.length
  const canSeeTable    = !revealAfter || hasSubmitted || isOrganizer
  const deadline       = event.deadline ? new Date(event.deadline) : null
  const dLeft          = deadline ? daysLeft(event.deadline!) : null

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    color: '#1E293B', background: 'white',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Popup clôture */}
      {closingPhase && proposedDate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px',
            maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {groupAssignment ? (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>👥</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', textAlign: 'center', marginBottom: 8 }}>
                  Rattacher les invités hors groupe
                </h2>
                <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 1.6 }}>
                  {groupAssignment.extras.length} personne{groupAssignment.extras.length > 1 ? 's' : ''} {groupAssignment.extras.length > 1 ? 'ont' : 'a'} participé sans faire partie d'un groupe : {groupAssignment.extras.map(e => e.displayName).join(', ')}.
                  Rattachez-{groupAssignment.extras.length > 1 ? 'les' : 'la'} à un groupe existant, ou créez-en un nouveau.
                </p>
                <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                  {groupAssignment.ownedGroups.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input type="radio" checked={groupChoice === 'existing'} onChange={() => setGroupChoice('existing')} />
                      Ajouter à :
                      <select value={groupChoiceId} onChange={e => setGroupChoiceId(e.target.value)} disabled={groupChoice !== 'existing'}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: 7, border: '1.5px solid #E2E8F0', color: '#1E293B', background: 'white' }}>
                        {groupAssignment.ownedGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </label>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" checked={groupChoice === 'new'} onChange={() => setGroupChoice('new')} />
                    Créer un nouveau groupe :
                    <input type="text" value={groupChoiceName} onChange={e => setGroupChoiceName(e.target.value)}
                      disabled={groupChoice !== 'new'} placeholder="Nom du groupe"
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 7, border: '1.5px solid #E2E8F0', color: '#1E293B', background: 'white' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" checked={groupChoice === 'none'} onChange={() => setGroupChoice('none')} />
                    Ne rien changer — laisser en dehors de tout groupe (Rᵢ global uniquement)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setClosingPhase(false); setGroupAssignment(null) }} style={{
                    flex: 1, padding: '10px', borderRadius: 9,
                    border: '1.5px solid #E2E8F0', background: 'white',
                    color: '#64748B', fontSize: 13, cursor: 'pointer',
                  }}>
                    Annuler
                  </button>
                  <button onClick={submitGroupChoice} style={{
                    flex: 2, padding: '10px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                    color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Confirmer et clôturer →
                  </button>
                </div>
              </>
            ) : (
              <>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>📅</div>
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: '#1E293B',
              textAlign: 'center', marginBottom: 8,
            }}>
              Clôturer la phase de disponibilités ?
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 1.6 }}>
              IRIS a calculé la date la plus favorable pour le groupe.
            </p>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#EDE9FE', border: '1px solid #DDD6FE',
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4C1D95' }}>
                {proposedDate.label}
              </div>
              <div style={{ fontSize: 13, color: '#7C3AED' }}>
                {proposedDate.startTime} – {proposedDate.endTime}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {(() => { const s = dateScore(proposedDate.date); return `${s.ok} dispo · ${s.cond} conditionnel(s) · ${s.no} indispo` })()}
              </div>
            </div>
            {missingWarning ? (
              <div style={{
                padding: '12px 14px', borderRadius: 10, background: '#FEF3C7',
                border: '1px solid #FDE68A', marginBottom: 16,
              }}>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
                  ⚠️ {missingWarning.missingCount} participant{missingWarning.missingCount > 1 ? 's' : ''} sur {missingWarning.totalCount} n'{missingWarning.missingCount > 1 ? 'ont' : 'a'} pas encore soumis ses disponibilités. Clôturer maintenant les prive de la possibilité de participer à cet événement.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 20 }}>
                Une fois confirmée, les participants passent à la phase activités.
                Les disponibilités sont verrouillées.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setClosingPhase(false); setMissingWarning(null) }} style={{
                flex: 1, padding: '10px', borderRadius: 9,
                border: '1.5px solid #E2E8F0', background: 'white',
                color: '#64748B', fontSize: 13, cursor: 'pointer',
              }}>
                Annuler
              </button>
              <button onClick={() => confirmClose(!!missingWarning)} style={{
                flex: 2, padding: '10px', borderRadius: 9, border: 'none',
                background: missingWarning ? '#D97706' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {missingWarning ? 'Clôturer quand même →' : 'Confirmer et passer aux activités →'}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px', background: 'white', borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10,
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
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>{event.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Code invitation */}
          <div style={{
            fontSize: 12, fontFamily: 'monospace',
            background: '#F1F5F9', color: '#64748B',
            padding: '4px 10px', borderRadius: 6,
          }}>
            {event.inviteCode}
          </div>
          {/* Deadline */}
          {dLeft !== null && (
            <div style={{
              fontSize: 11, fontWeight: 600,
              background: dLeft <= 2 ? '#FEE2E2' : dLeft <= 5 ? '#FEF9C3' : '#DCFCE7',
              color: dLeft <= 2 ? '#991B1B' : dLeft <= 5 ? '#713F12' : '#166534',
              padding: '4px 10px', borderRadius: 6,
            }}>
              ⏱ {dLeft > 0 ? `J-${dLeft}` : 'Délai dépassé'}
            </div>
          )}
          {isOrganizer && (
            <span style={{
              fontSize: 10, background: '#EDE9FE', color: '#7C3AED',
              padding: '3px 8px', borderRadius: 8, fontWeight: 600,
            }}>
              Organisateur
            </span>
          )}
        </div>
      </nav>

      {/* Bandeau profil — visible pour les participants */}
      {!profileDone && (
        <div style={{
          background: 'linear-gradient(135deg, #EDE9FE, #E0F2FE)',
          borderBottom: '1px solid #DDD6FE',
          padding: '10px 28px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ fontSize: 13, color: '#4C1D95', flex: 1 }}>
            <strong>Conseil :</strong> Complétez votre profil de préférences pendant que vous attendez —
            IRIS s'en servira pour vous proposer les meilleures activités.
          </span>
          <Link href="/profile" style={{
            fontSize: 12, fontWeight: 600, color: '#4C1D95',
            textDecoration: 'none', background: 'white',
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #DDD6FE', whiteSpace: 'nowrap',
          }}>
            Mon profil →
          </Link>
        </div>
      )}

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 100px' }}>

        {/* Accès à la phase en cours — visible dès que les disponibilités sont clôturées */}
        {event.phase >= 3 && (() => {
          const phaseInfo = event.phase >= 7
            ? { url: 'results', icon: '🎉', title: 'Résultat disponible', subtitle: 'Le programme retenu pour cet événement' }
            : event.phase >= 5
            ? { url: 'pareto',    icon: '⚖️', title: event.phase === 6 ? 'Vote en cours' : 'Filtre en cours', subtitle: 'Consultez les scénarios et le calcul détaillé, à votre rythme' }
            : event.phase === 4
            ? { url: 'scenarios', icon: '🗂️', title: 'Scénarios calculés',   subtitle: 'Explorez les combinaisons possibles pour cet événement' }
            : { url: 'activities', icon: '🎯', title: 'Activités proposées', subtitle: 'Consultez et proposez des activités pour le groupe' }

          return (
            <Link href={`/event/${eventId}/${phaseInfo.url}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: 14, marginBottom: 20,
                background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(76,29,149,0.15)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{phaseInfo.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{phaseInfo.title}</div>
                  <div style={{ fontSize: 12, color: '#DDD6FE', marginTop: 2 }}>{phaseInfo.subtitle}</div>
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'white' }}>→</span>
            </Link>
          )
        })()}

        {/* ── Récap événement ── */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '20px 24px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 800, color: '#1E293B',
                letterSpacing: '-0.02em', margin: '0 0 4px',
              }}>
                {event.name}
              </h1>
              {event.description && (
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 8px' }}>
                  {event.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {event.location && (
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    {event.locationMode === 'hub' ? '🏠' : '📍'} {event.location}
                  </span>
                )}
                {event.groupNames?.map((n, i) => (
                  <span key={i} style={{
                    fontSize: 11, background: '#EDE9FE', color: '#7C3AED',
                    padding: '2px 8px', borderRadius: 8, fontWeight: 500,
                  }}>
                    {n}
                  </span>
                ))}
                {event.budgetGlobal && (
                  <span style={{ fontSize: 12, color: '#166534' }}>
                    💰 {(event.budgetVisible || isOrganizer)
                      ? `Budget global : ${event.budgetGlobal.toLocaleString('fr-FR')} €${event.budgetOverrunPct ? ` (+${Math.round(event.budgetOverrunPct * 100)}% toléré)` : ''}${isOrganizer && !event.budgetVisible ? ' 🔒 masqué aux autres' : ''}`
                      : 'Pris en charge par l\'organisateur'}
                  </span>
                )}
                {event.openInvite && (
                  <span style={{
                    fontSize: 11, background: '#F0FDF4', color: '#166534',
                    padding: '2px 8px', borderRadius: 8, fontWeight: 500,
                  }}>
                    🔓 Invitation ouverte
                  </span>
                )}
              </div>
            </div>

            {/* Progression globale */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#4C1D95' }}>
                {respondedCount}/{totalCount}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>réponses reçues</div>
              <div style={{
                marginTop: 6, width: 100, height: 6,
                background: '#E2E8F0', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  width: pct(respondedCount, totalCount), height: '100%',
                  background: 'linear-gradient(90deg, #4C1D95, #7C3AED)',
                  borderRadius: 3, transition: 'width 0.3s',
                }}/>
              </div>
            </div>
          </div>
        </div>

        {event.deadline && (() => {
          const start = new Date(event.createdAt).getTime()
          const end   = new Date(event.deadline!).getTime()
          const now   = Date.now()
          const deadlinePct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
          return (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  📅 Date limite de réponse
                </span>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Deadline : {new Date(event.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${deadlinePct}%`,
                  background: deadlinePct > 80 ? '#F59E0B' : '#94A3B8', borderRadius: 3, transition: 'width 0.3s',
                }}/>
              </div>
              <p style={{ fontSize: 10, color: '#94A3B8', margin: '4px 0 0' }}>
                Temps écoulé avant la deadline de réponse : {Math.round(deadlinePct)}% — clôture toujours manuelle par l'organisateur.
              </p>
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── Colonne gauche ── */}
          <div>

            {/* Scores par date */}
            <div style={{
              background: 'white', borderRadius: 14, padding: '16px 18px',
              border: '1px solid #E2E8F0', marginBottom: 16,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#64748B',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
              }}>
                Dates — score de présence
                <Tooltip text="Score pondéré : 1 point par participant disponible + probabilité pour les conditionnels. Mis à jour en temps réel." />
              </div>

              {dates.map(d => {
                const s   = dateScore(d.date)
                const max = availabilities.length || 1
                const isBest = d.date === bestDate?.date
                return (
                  <div key={d.date} style={{
                    padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                    background: isBest ? '#EDE9FE' : '#F8FAFC',
                    border: `1px solid ${isBest ? '#DDD6FE' : '#E2E8F0'}`,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: isBest ? 700 : 500,
                        color: isBest ? '#4C1D95' : '#1E293B', flex: 1,
                      }}>
                        {isBest && '⭐ '}{d.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        {d.startTime}–{d.endTime}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: isBest ? '#4C1D95' : '#64748B',
                      }}>
                        {s.score.toFixed(1)}/{max}
                      </span>
                    </div>
                    {/* Barre de score */}
                    <div style={{
                      height: 6, background: '#E2E8F0',
                      borderRadius: 3, overflow: 'hidden', marginBottom: 5,
                    }}>
                      <div style={{
                        width: pct(s.score, max), height: '100%',
                        background: isBest
                          ? 'linear-gradient(90deg, #4C1D95, #7C3AED)'
                          : '#94A3B8',
                        borderRadius: 3, transition: 'width 0.3s',
                      }}/>
                    </div>
                    {/* Légende */}
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94A3B8' }}>
                      {s.ok > 0 && <span style={{ color: '#166534' }}>✓ {s.ok} dispo</span>}
                      {s.cond > 0 && <span style={{ color: '#713F12' }}>⚡ {s.cond} cond.</span>}
                      {s.no > 0 && <span style={{ color: '#991B1B' }}>✗ {s.no} indispo</span>}
                      {totalCount - s.ok - s.cond - s.no > 0 && (
                        <span>… {totalCount - s.ok - s.cond - s.no} non répondu</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tableau des réponses (visible si soumis ou orga) */}
            {canSeeTable && availabilities.length > 0 && (
              <div style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                }}>
                  Réponses détaillées
                </div>
                {medianBudget !== null && (
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                    💰 Budget médian du groupe : <strong style={{ color: '#4C1D95' }}>{medianBudget}€</strong>
                    {' '}— les budgets individuels des autres participants restent privés.
                  </div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '40%' }}/>
                      {dates.map(d => <col key={d.date} style={{ width: `${60/dates.length}%` }}/>)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{
                          padding: '6px 10px', textAlign: 'left',
                          borderBottom: '2px solid #E2E8F0', color: '#94A3B8', fontWeight: 400,
                        }}>
                          Participant
                        </th>
                        {dates.map(d => (
                          <th key={d.date} style={{
                            padding: '6px 5px', textAlign: 'center',
                            borderBottom: '2px solid #E2E8F0', fontWeight: 500,
                            fontSize: 10, color: '#475569',
                          }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {d.label}
                            </div>
                            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 400 }}>
                              {d.startTime}–{d.endTime}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {availabilities.filter(a => a.submitted).map(a => (
                        <tr key={a.userId} style={{ borderBottom: '1px solid #F8FAFC' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}
                            title={a.email ?? undefined}>
                            <div style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              maxWidth: '100%', color: '#1E293B', fontSize: 12,
                            }}>
                              {a.displayName || 'Participant'}
                              {a.userId === currentUser.id && (
                                <span style={{ fontSize: 9, color: '#7C3AED', marginLeft: 4 }}>
                                  (vous)
                                </span>
                              )}
                            </div>
                            {a.budget && a.userId === currentUser.id && (
                              <div style={{ fontSize: 9, color: '#94A3B8' }}>
                                💰 {a.budget}€ (mon budget)
                              </div>
                            )}
                            {/* {Object.keys(a.slots ?? {}).length > 0 && (
                              <div style={{ fontSize: 9, color: '#7C3AED' }}>
                                ⏱ {Object.entries(a.slots).map(([date, s]) =>
                                  `${s.start}–${s.end}`
                                ).join(', ')}
                              </div>
                            )} */}
                          </td>
                          {dates.map(d => {
                            const s = a.statuses[d.date] ?? 'no'
                            const p = a.probas[d.date] ?? 70
                            const bg = s==='ok'?'#DCFCE7':s==='cond'?'#FEF9C3':'#FEE2E2'
                            const tc = s==='ok'?'#166534':s==='cond'?'#713F12':'#991B1B'
                            const lbl = s==='ok'?'✓':s==='cond'?`⚡${p}%`:'✗'
                            const slot = a.slots?.[d.date]
                            const slotLabel = slot ? `${slot.start}–${slot.end}` : null
                            const tip = s==='ok'?'Disponible'
                              :s==='cond'?`Conditionnel — probabilité ${p}% (compte pour ${p/100} dans le score de la date)`
                              :'Indisponible'
                            return (
                              <td key={d.date} title={tip} style={{
                                padding: '6px 5px', textAlign: 'center',
                                background: bg, color: tc, fontWeight: 600,
                                cursor: 'help',
                              }}>
                                {lbl}
                                {slotLabel && s !== 'no' && (
                                  <div style={{ fontSize: 8, color: tc, opacity: 0.8, fontWeight: 400 }}>
                                    {slotLabel}
                                  </div>
                               )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {availabilities.filter(a => !a.submitted).map(a => (
                        <tr key={a.userId} style={{
                          borderBottom: '1px solid #F8FAFC',
                        }}>
                          <td style={{ padding: '6px 10px' }} title={a.email ?? undefined}>
                            <div style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: '#94A3B8', fontStyle: 'italic', fontSize: 11,
                            }}>
                              {a.displayName || 'Participant'}
                            </div>
                            <div style={{ fontSize: 9, color: '#CBD5E1' }}>en attente…</div>
                          </td>
                          {dates.map(d => (
                            <td key={d.date} style={{
                              padding: '6px 5px', textAlign: 'center',
                              color: '#E2E8F0', fontSize: 16, background: '#FAFAFA',
                            }}>
                              ·
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!canSeeTable && !hasSubmitted && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#FEF9C3', border: '1px solid #FDE68A',
                fontSize: 12, color: '#713F12',
              }}>
                💡 Répondez à droite pour voir les disponibilités des autres participants.
              </div>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div>

            {/* ── Formulaire participant ── */}
            <div style={{
              background: 'white', borderRadius: 14, padding: '16px 18px',
              border: `2px solid ${hasSubmitted ? '#BBF7D0' : '#DDD6FE'}`,
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#64748B',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Mes disponibilités</span>
                {hasSubmitted && (
                  <span style={{
                    fontSize: 10, background: '#DCFCE7', color: '#166534',
                    padding: '2px 8px', borderRadius: 8, fontWeight: 600,
                  }}>
                    ✓ Répondu
                  </span>
                )}
              </div>

              {dates.map(d => {
                const status = myStatuses[d.date] ?? null
                return (
                  <div key={d.date} style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6,
                    }}>
                      📅 {d.label}
                      <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 6, fontWeight: 400 }}>
                        {d.startTime}–{d.endTime}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([
                        { v: 'ok'   as const, label: '✓ Disponible',    bg: '#DCFCE7', tc: '#166534', border: '#BBF7D0' },
                        { v: 'cond' as const, label: '⚡ Peut-être',     bg: '#FEF9C3', tc: '#713F12', border: '#FDE68A' },
                        { v: 'no'   as const, label: '✗ Indisponible',  bg: '#FEE2E2', tc: '#991B1B', border: '#FCA5A5' },
                      ]).map(opt => (
                        <button key={opt.v} type="button"
                          onClick={() => setMyStatuses(p => ({ ...p, [d.date]: opt.v }))}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8, border: '2px solid',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: status === opt.v ? opt.bg : 'white',
                            color: status === opt.v ? opt.tc : '#94A3B8',
                            borderColor: status === opt.v ? opt.border : '#E2E8F0',
                            transition: 'all 0.15s',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Slider probabilité si conditionnel */}
                    {myStatuses[d.date] === 'cond' && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                      }}>
                        <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          Probabilité
                          <Tooltip text="Votre probabilité de présence. Elle pondère votre poids dans le calcul du score de chaque date — une présence à 50% compte pour 0.5 dans le score collectif. Cela permet à IRIS de proposer des dates tenant compte des incertitudes." />
                          {' '}:
                        </span>
                        <input type="range" min={10} max={90} step={10}
                          value={myProbas[d.date] ?? 70}
                          onChange={e => setMyProbas(p => ({
                            ...p, [d.date]: Number(e.target.value),
                          }))}
                          style={{ flex: 1, accentColor: '#7C3AED' }}
                        />
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#7C3AED',
                          minWidth: 32, textAlign: 'right',
                        }}>
                          {myProbas[d.date] ?? 70}%
                        </span>
                      </div>
                    )}
                    {/* Horaires personnalisés si dispo ou peut-être */}
                    {(myStatuses[d.date] === 'ok' || myStatuses[d.date] === 'cond') && (
                      <div style={{
                        marginTop: 8, padding: '8px 10px', borderRadius: 8,
                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                      }}>
                        <div style={{
                          fontSize: 11, color: '#64748B', marginBottom: 5,
                          display: 'flex', alignItems: 'center',
                        }}>
                          Mes horaires pour ce jour
                          <Tooltip text="Précisez votre disponibilité horaire personnelle. Le moteur IRIS n'utilisera que les activités qui tiennent dans votre créneau. Laissez par défaut si vous êtes dispo sur toute la tranche proposée." />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#64748B' }}>De</span>
                          <input type="time"
                            value={mySlots[d.date]?.start ?? d.startTime}
                            onChange={e => setMySlots(p => ({
                              ...p,
                              [d.date]: { start: e.target.value, end: p[d.date]?.end ?? d.endTime }
                            }))}
                            style={{
                              padding: '4px 8px', borderRadius: 6,
                              border: '1.5px solid #DDD6FE', fontSize: 12,
                              color: '#4C1D95', background: '#F5F3FF',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#64748B' }}>à</span>
                          <input type="time"
                            value={mySlots[d.date]?.end ?? d.endTime}
                            onChange={e => setMySlots(p => ({
                              ...p,
                              [d.date]: { start: p[d.date]?.start ?? d.startTime, end: e.target.value }
                            }))}
                            style={{
                              padding: '4px 8px', borderRadius: 6,
                              border: '1.5px solid #DDD6FE', fontSize: 12,
                              color: '#4C1D95', background: '#F5F3FF',
                              outline: 'none',
                            }}
                          />
                          {/* Bouton reset */}
                          {(mySlots[d.date]?.start !== d.startTime || mySlots[d.date]?.end !== d.endTime) && (
                            <button type="button"
                              onClick={() => setMySlots(p => {
                                const next = { ...p }
                                delete next[d.date]
                                return next
                              })}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 11, color: '#94A3B8', padding: '0 4px',
                              }}
                              title="Réinitialiser aux horaires de l'événement"
                            >
                              ↺
                            </button>
                          )}
                        </div>
                        {/* Avertissement si créneau plus court que l'événement */}
                        {mySlots[d.date] && (
                          mySlots[d.date].start !== d.startTime || mySlots[d.date].end !== d.endTime
                        ) && (
                          <div style={{ fontSize: 10, color: '#7C3AED', marginTop: 4 }}>
                            ℹ️ Créneau personnalisé — seules les activités dans ta tranche seront considérées.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Budget personnel (si pas de budget global) */}
              {!event.budgetGlobal && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{
                    display: 'flex', alignItems: 'center',
                    fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6,
                  }}>
                    Mon budget pour cette sortie
                    <Tooltip text="Budget maximum que vous souhaitez dépenser pour l'ensemble des activités. Utilisé par le moteur IRIS pour filtrer les scénarios." />
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number" value={myBudget}
                      onChange={e => setMyBudget(e.target.value)}
                      placeholder="Ex : 40"
                      min={1} style={{ ...inputStyle, width: 100 }}
                    />
                    <span style={{ fontSize: 13, color: '#64748B' }}>€</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveAvail}
                disabled={saving || event.phase >= 3 || Object.keys(myStatuses).length < dates.length}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: event.phase >= 3
                    ? '#F1F5F9'
                    : Object.keys(myStatuses).length >= dates.length && !saving
                    ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
                  color: event.phase >= 3
                    ? '#94A3B8'
                    : Object.keys(myStatuses).length >= dates.length && !saving
                    ? 'white' : '#94A3B8',
                  fontSize: 14, fontWeight: 700,
                  cursor: event.phase >= 3
                    ? 'not-allowed'
                    : Object.keys(myStatuses).length >= dates.length && !saving
                    ? 'pointer' : 'default',
                }}>
                {event.phase >= 3
                  ? '🔒 Disponibilités clôturées'
                  : saving ? 'Enregistrement…' : hasSubmitted ? '✓ Mettre à jour' : 'Valider mes disponibilités'}
              </button>

              {hasSubmitted && event.phase === 2 && (
                <div style={{
                  marginTop: 10, padding: '10px 12px', borderRadius: 10,
                  background: '#EDE9FE', border: '1px solid #DDD6FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: '#4C1D95' }}>
                    💡 Vous pouvez déjà proposer des activités, sans attendre la clôture des disponibilités.
                  </span>
                  <Link href={`/event/${eventId}/activities`} style={{
                    fontSize: 12, fontWeight: 700, color: 'white', background: '#7C3AED',
                    padding: '6px 12px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
                  }}>
                    Proposer →
                  </Link>
                </div>
              )}

              {event.phase >= 3 && (
                <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
                  La phase disponibilités est clôturée — la date a été fixée.
                </p>
              )}
              {event.phase < 3 && Object.keys(myStatuses).length < dates.length && (
                <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
                  Répondez à toutes les dates pour valider.
                </p>
              )}
            </div>

            {/* ── Invitation ouverte ── */}
            {event.openInvite && (
              <div style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: '1px solid #E2E8F0', marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                }}>
                  Inviter quelqu'un
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="email" value={extraEmail}
                    onChange={e => setExtraEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleInvite())}
                    placeholder="email@exemple.com"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={handleInvite}
                    disabled={!extraEmail.includes('@') || inviteStatus === 'loading'}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      background: extraEmail.includes('@') ? '#4C1D95' : '#E2E8F0',
                      color: extraEmail.includes('@') ? 'white' : '#94A3B8',
                      border: 'none', fontSize: 12, fontWeight: 600,
                      cursor: extraEmail.includes('@') ? 'pointer' : 'default',
                    }}>
                    {inviteStatus === 'loading' ? '…' : 'Inviter'}
                  </button>
                </div>
                {inviteMsg && (
                  <p style={{
                    fontSize: 11, marginTop: 5,
                    color: inviteStatus === 'success' ? '#166534' : '#991B1B',
                  }}>
                    {inviteStatus === 'success' ? '✓ ' : '⚠️ '}{inviteMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Lien d'invitation — l'organisateur le voit toujours (pour l'envoyer
                manuellement), les autres participants seulement si l'invitation
                ouverte est activée ── */}
            {(isOrganizer || event.openInvite) && (
              <div style={{ marginBottom: 16 }}>
                <InviteLinkBox inviteCode={event.inviteCode} eventName={event.name}/>
                {isOrganizer && !event.openInvite && (
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                    🔒 Visible par vous seul — l'invitation ouverte est désactivée pour les autres participants.
                  </p>
                )}
              </div>
            )}

            {/* ── Accès aux activités (visible par tous) ── */}
            <Link href={`/event/${eventId}/activities`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: 14, marginBottom: 16,
                background: event.phase >= 2
                  ? 'linear-gradient(135deg, #4C1D95, #6D28D9)'
                  : 'white',
                border: event.phase >= 2 ? 'none' : '2px dashed #DDD6FE',
                textDecoration: 'none',
              }}>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: event.phase >= 2 ? 'white' : '#4C1D95',
                }}>
                  🎯 Activités proposées
                </div>
                <div style={{
                  fontSize: 11, marginTop: 2,
                  color: event.phase >= 2 ? '#DDD6FE' : '#94A3B8',
                }}>
                  {event.phase >= 3
                    ? 'Liste clôturée — voir les activités retenues'
                    : event.phase === 2
                    ? 'Phase ouverte — proposez et consultez les activités'
                    : 'Accessible dès maintenant — proposez vos idées'}
                </div>
              </div>
              <span style={{
                fontSize: 18,
                color: event.phase >= 2 ? 'white' : '#DDD6FE',
              }}>→</span>
            </Link>

            {/* ── Panneau organisateur ── */}
            {isOrganizer && event.phase < 3 && (
              <div style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: '1px solid #DDD6FE',
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#7C3AED',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>Paramètres organisateur</span>
                  <button onClick={() => setEditMode(p => !p)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: '#7C3AED', fontWeight: 600,
                    }}>
                    {editMode ? 'Fermer' : '✏️ Modifier'}
                  </button>
                </div>

                {editMode ? (
                  <div>
                    {/* Description */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                        Description
                      </label>
                      <textarea value={descriptionInput}
                        onChange={e => setDescriptionInput(e.target.value)}
                        rows={2}
                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Budget organisateur — éditable pour ajuster en fonction de la
                        participation réelle, sans avoir à recréer l'événement */}
                    {event.budgetGlobal != null && (
                      <div style={{ marginBottom: 12, padding: '10px 12px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE' }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#4C1D95', display: 'block', marginBottom: 5 }}>
                          Budget global (organisateur)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <input type="number" value={budgetGlobalInput}
                            onChange={e => setBudgetGlobalInput(e.target.value)}
                            min={1} step={1}
                            style={{ ...inputStyle, width: 100 }}
                          />
                          <span style={{ fontSize: 13, color: '#64748B' }}>€ au total</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 12, color: '#64748B' }}>Dépassement toléré :</label>
                          <input type="number" value={budgetOverrunInput}
                            onChange={e => setBudgetOverrunInput(e.target.value)}
                            min={0} max={100} step={5}
                            style={{ ...inputStyle, width: 60 }}
                          />
                          <span style={{ fontSize: 12, color: '#64748B' }}>%</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#7C3AED', margin: '8px 0 0' }}>
                          Ajustable ici selon la participation réelle, sans recréer l'événement.
                        </p>
                      </div>
                    )}

                    {/* Deadline */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{
                        fontSize: 12, fontWeight: 600, color: '#374151',
                        display: 'flex', alignItems: 'center', marginBottom: 5,
                      }}>
                        Date limite de réponse
                        <Tooltip text="À J-2 avant cette date, un rappel automatique est envoyé aux participants n'ayant pas encore répondu." />
                      </label>
                      <input type="date" value={deadlineInput}
                        onChange={e => setDeadlineInput(e.target.value)}
                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Rappel auto */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 12, padding: '10px 12px',
                      background: '#F8FAFC', borderRadius: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Rappel automatique à J-2
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          Email aux non-répondants 2 jours avant la deadline.
                        </div>
                      </div>
                      <button type="button" onClick={() => setAutoReminder(p => !p)}
                        style={{
                          width: 40, height: 22, borderRadius: 11, border: 'none',
                          background: autoReminder
                            ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
                          cursor: 'pointer', position: 'relative',
                        }}>
                        <span style={{
                          position: 'absolute', top: 2, left: autoReminder ? 20 : 2,
                          width: 18, height: 18, borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s',
                        }}/>
                      </button>
                    </div>

                    {/* Invitation ouverte */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 14, padding: '10px 12px',
                      background: '#F8FAFC', borderRadius: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Invitation ouverte
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          Le lien d'invitation devient visible et partageable par tous les participants, pas seulement vous.
                        </div>
                      </div>
                      <button type="button" onClick={() => setOpenInviteEdit(p => !p)}
                        style={{
                          width: 40, height: 22, borderRadius: 11, border: 'none',
                          background: openInviteEdit
                            ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
                          cursor: 'pointer', position: 'relative',
                        }}>
                        <span style={{
                          position: 'absolute', top: 2, left: openInviteEdit ? 20 : 2,
                          width: 18, height: 18, borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s',
                        }}/>
                      </button>
                    </div>

                    {/* Révéler après soumission */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 14, padding: '10px 12px',
                      background: '#F8FAFC', borderRadius: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Révéler après soumission
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          Les participants voient le tableau seulement après avoir répondu.
                        </div>
                      </div>
                      <button type="button" onClick={() => setRevealAfter(p => !p)}
                        style={{
                          width: 40, height: 22, borderRadius: 11, border: 'none',
                          background: revealAfter
                            ? 'linear-gradient(135deg, #4C1D95, #6D28D9)' : '#E2E8F0',
                          cursor: 'pointer', position: 'relative',
                        }}>
                        <span style={{
                          position: 'absolute', top: 2, left: revealAfter ? 20 : 2,
                          width: 18, height: 18, borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s',
                        }}/>
                      </button>
                    </div>

                    <button onClick={handleSaveEdit} disabled={savingEdit}
                      style={{
                        width: '100%', padding: '9px', borderRadius: 9, border: 'none',
                        background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                        color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>
                      {savingEdit ? 'Enregistrement…' : 'Enregistrer les paramètres'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {event.deadline
                      ? `📅 Deadline : ${new Date(event.deadline).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}`
                      : '📅 Aucune deadline définie'}
                    <br/>
                    {autoReminder ? '🔔 Rappel auto J-2 activé' : '🔕 Pas de rappel automatique'}
                    <br/>
                    {revealAfter ? '👁 Tableau révélé après soumission' : '👁 Tableau visible immédiatement'}
                  </div>
                )}

                {/* Bouton clôture */}
                <div style={{
                  marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9',
                }}>
                  <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8, lineHeight: 1.5 }}>
                    Une fois toutes les disponibilités reçues, clôturez pour verrouiller la date
                    et ouvrir officiellement la phase Activités.
                  </p>
                  <button onClick={handleClose}
                    disabled={respondedCount === 0}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                      background: respondedCount > 0
                        ? 'linear-gradient(135deg, #0F766E, #0369A1)' : '#E2E8F0',
                      color: respondedCount > 0 ? 'white' : '#94A3B8',
                      fontSize: 13, fontWeight: 700,
                      cursor: respondedCount > 0 ? 'pointer' : 'default',
                    }}>
                    Clôturer les disponibilités et choisir la date →
                  </button>
                  {respondedCount === 0 && (
                    <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 5 }}>
                      En attente d'au moins une réponse.
                    </p>
                  )}
                </div>
              </div>
            )}

            {isOrganizer && event.phase < 5 && (
              <div style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: '1px solid #FECACA', marginTop: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  ANNULATION
                </div>
                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 10, lineHeight: 1.5 }}>
                  Annule définitivement cet événement pour tout le groupe. Possible uniquement avant le calcul
                  des scénarios (Phase 5) — au-delà, utilisez le vote pour exprimer un désaccord sur le résultat.
                </p>
                <button onClick={() => setShowCancelConfirm(true)} style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #FCA5A5',
                  background: 'white', color: '#991B1B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Annuler cet événement
                </button>
              </div>
            )}

            {showCancelConfirm && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
              }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', textAlign: 'center', marginBottom: 8 }}>
                    Annuler définitivement cet événement ?
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
                    Cette action est irréversible. Tous les participants verront l'événement comme annulé.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowCancelConfirm(false)} disabled={cancelling} style={{
                      flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #E2E8F0',
                      background: 'white', color: '#64748B', fontSize: 13, cursor: 'pointer',
                    }}>
                      Retour
                    </button>
                    <button onClick={handleCancelEvent} disabled={cancelling} style={{
                      flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                      background: cancelling ? '#E2E8F0' : '#DC2626',
                      color: cancelling ? '#94A3B8' : 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {cancelling ? 'Annulation…' : 'Oui, annuler'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Bouton feedback flottant */}
      <a href="https://tally.so/r/Y5qxz0" target="_blank" rel="noopener noreferrer"
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

      {/* Synchro différée des préférences — participants non-organisateurs */}
      {showPrefSyncModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '24px 26px',
            maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>
              La phase Activités est clôturée
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px', lineHeight: 1.6 }}>
              Vos préférences ont changé par rapport à votre profil actuel pour {prefSyncDiffs.length} type{prefSyncDiffs.length > 1 ? 's' : ''}
              {' '}pendant que vous exploriez les activités de cet événement. Voulez-vous les mettre à jour ?
            </p>

            <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
              {prefSyncDiffs.map(d => {
                const dec = prefSyncDecisions[d.type] ?? { action: 'update', parent: '', subtype: '' }
                return (
                  <div key={d.type} style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                      {d.type} — {d.oldVal !== null ? `${d.oldVal}% → ` : 'nouveau, '}{d.newVal}%
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                        <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'update'}
                          onChange={() => setPrefSyncDecisions(p => ({ ...p, [d.type]: { ...dec, action: 'update' } }))}/>
                        Mettre à jour mon profil pour <strong>{d.type}</strong> ({d.newVal}%)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                        <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'create_subtype'}
                          onChange={() => setPrefSyncDecisions(p => ({ ...p, [d.type]: { ...dec, action: 'create_subtype' } }))}/>
                        Créer comme sous-type distinct (garder {d.type} à {d.oldVal ?? '—'}%)
                      </label>
                      {dec.action === 'create_subtype' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 22 }}>
                          <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                            Sous-type de <strong>{d.type}</strong> :
                          </span>
                          <input type="text" value={dec.subtype} placeholder="Nom du sous-type"
                            onChange={e => setPrefSyncDecisions(p => ({ ...p, [d.type]: { ...dec, subtype: e.target.value } }))}
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 7, border: '1px solid #E2E8F0', flex: 1 }}/>
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                        <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'skip'}
                          onChange={() => setPrefSyncDecisions(p => ({ ...p, [d.type]: { ...dec, action: 'skip' } }))}/>
                        Ignorer — ne rien changer à mon profil
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={handlePrefSyncDismiss} disabled={prefSyncSubmitting} style={{
                padding: '9px 16px', borderRadius: 9, border: '1.5px solid #E2E8F0',
                background: 'white', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Tout ignorer
              </button>
              <button onClick={handlePrefSyncConfirm} disabled={prefSyncSubmitting} style={{
                padding: '9px 18px', borderRadius: 9, border: 'none',
                background: prefSyncSubmitting ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: prefSyncSubmitting ? '#94A3B8' : 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {prefSyncSubmitting ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
