// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import Image from 'next/image'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  display_name:     string
  zone:             string
  home_lat:         number | null
  home_lng:         number | null
  transport:        string
  distance_max:     number
  budget:           number
  social_level:     number
  weights:          Record<string, number>
  hard_constraints: Record<string, boolean>
  activity_prefs:   Record<string, number>
  onboarding_done:  boolean
  fairness?:        { riGlobal: number; hasHistory: boolean }
}

interface NominatimResult {
  place_id:     number
  display_name: string
  lat:          string
  lon:          string
}

const DEFAULT_ACTIVITY_TYPES = [
  { key: 'Escape Game',  emoji: '🎭', label: 'Escape Game' },
  { key: 'Musée',        emoji: '🏛️', label: 'Musée / Culture' },
  { key: 'Restaurant',   emoji: '🍽️', label: 'Restaurant' },
  { key: 'Sport',        emoji: '⚽',  label: 'Sport / Plein air' },
  { key: 'Détente',      emoji: '🌿',  label: 'Détente / Bien-être' },
  { key: 'Spectacle',    emoji: '🎪',  label: 'Spectacle / Concert' },
  { key: 'Jeux',         emoji: '🎲',  label: 'Jeux / Bowling' },
  { key: 'Cinéma',       emoji: '🎬',  label: 'Cinéma' },
  { key: 'Karaoké',      emoji: '🎤',  label: 'Karaoké' },
  { key: 'Gastronomie',  emoji: '🍷',  label: 'Gastronomie / Dégustation' },
  { key: 'Randonnée',    emoji: '🥾',  label: 'Randonnée / Nature' },
  { key: 'Visite',       emoji: '🗺️',  label: 'Visite guidée / Tourisme' },
  { key: 'Atelier',      emoji: '🎨',  label: 'Atelier créatif' },
  { key: 'Pique-nique',  emoji: '🧺',  label: 'Pique-nique / Plein air' },
  { key: 'Soirée',       emoji: '🥂',  label: 'Soirée / Bar' },
  { key: 'Shopping',     emoji: '🛍️',  label: 'Shopping' },
]

const TRANSPORTS = [
  { value: 'foot',    label: '🚶 À pied',      desc: '~5 km/h' },
  { value: 'transit', label: '🚇 Transports',  desc: '~20 km/h' },
  { value: 'car',     label: '🚗 Voiture',     desc: '~30 km/h' },
]

const CONSTRAINT_LABELS: Record<string, { label: string; desc: string; category: string }> = {
  PMR:          { label: '♿ PMR',                         desc: 'Accessibilité fauteuil roulant requise', category: 'Mobilité' },
  stair:        { label: '🚶 Pas d\'escaliers',           desc: 'Difficultés à marcher, poussettes, cannes (ascenseur obligatoire)', category: 'Mobilité' },
  cardio:       { label: '🫀 Condition cardio',            desc: 'Exclut les efforts physiques intenses (cardiaques, asthme sévère)', category: 'Mobilité' },
  vertigo:      { label: '🧗 Vertige / Acrophobie',       desc: 'Exclut les activités en hauteur (accrobranche, rooftop, via ferrata)', category: 'Mobilité' },
  aquatic:      { label: '🏊 Aquaphobie / Non-nageur',    desc: 'Ne sait pas nager ou refuse les activités aquatiques', category: 'Mobilité' },
  nuts:         { label: '🥜 Allergie noix',               desc: 'Exclut les lieux servant des noix', category: 'Alimentaire' },
  diet:         { label: '🏥 Régime médical',              desc: 'Contrainte alimentaire / diabète', category: 'Alimentaire' },
  vegan:        { label: '🌱 Vegan',                       desc: 'Uniquement des options véganes', category: 'Alimentaire' },
  gluten:       { label: '🌾 Sans gluten',                 desc: 'Intolérance ou maladie cœliaque (options certifiées requises)', category: 'Alimentaire' },
  seafood:      { label: '🦞 Allergie fruits de mer',      desc: 'Exclut les restaurants poissons/crustacés', category: 'Alimentaire' },
  halal_kosher: { label: '🥩 Viande confessionnelle',      desc: 'Nécessite des options Halal ou Casher', category: 'Alimentaire' },
  alcohol:      { label: '🚫 Sans alcool',                 desc: 'Exclut les lieux centrés sur l\'alcool (bars spécifiques, dégustations)', category: 'Alimentaire' },
  pregnancy:    { label: '🤰 Grossesse',                   desc: 'Exclut aliments interdits (cru) et activités physiques intenses', category: 'Alimentaire' },
  noise:        { label: '🔇 Hyperacousie / Calme',        desc: 'Exclut les lieux très bruyants (boîtes, bars bondés, concerts)', category: 'Environnement' },
  epilepsy:     { label: '⚡ Épilepsie / Photosensibilité', desc: 'Exclut les jeux de lumière stroboscopiques', category: 'Environnement' },
  smoke:        { label: '🚬 Zone non-fumeur',             desc: 'Exclut les espaces autorisant le tabac/vapotage', category: 'Environnement' },
  allergy_pets: { label: '🐱 Allergie animaux',            desc: 'Exclut les lieux accueillant des animaux (bars à chats, etc.)', category: 'Environnement' },
  kids:         { label: '👶 Enfants',                     desc: 'Activités adaptées aux enfants', category: 'Accompagnement' },
  pets:         { label: '🐾 Animal d\'assistance',        desc: 'Le participant doit pouvoir venir avec son animal', category: 'Accompagnement' },
}

const DEFAULT_WEIGHTS = {
  activity: 35, schedule: 25, distance: 20, budget: 10, social: 10,
}

const WEIGHT_LABELS: Record<string, string> = {
  activity: 'Type d\'activité',
  schedule: 'Horaires',
  distance: 'Distance',
  budget:   'Budget',
  social:   'Ambiance sociale',
}

function normalizeTypeName(name: string): string {
  return name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

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
          width: 220, zIndex: 50, whiteSpace: 'normal',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ─── AddressAutocomplete ──────────────────────────────────────────────────────

interface AddressAutocompleteProps {
  value:     string
  onChange:  (address: string, lat: number | null, lng: number | null) => void
}

function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue,   setInputValue]   = useState(value)
  const [suggestions,  setSuggestions]  = useState<NominatimResult[]>([])
  const [open,         setOpen]         = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [confirmed,    setConfirmed]    = useState(!!value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data: NominatimResult[] = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(val: string) {
    setInputValue(val)
    setConfirmed(false)
    onChange(val, null, null) // reset coords until confirmed
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  function handleSelect(result: NominatimResult) {
    const label = result.display_name
    setInputValue(label)
    setConfirmed(true)
    setOpen(false)
    setSuggestions([])
    onChange(label, parseFloat(result.lat), parseFloat(result.lon))
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInput(e.target.value)}
          placeholder="Ex : Paris 11ème, 12 rue de la Paix Lyon…"
          style={{
            width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10,
            border: `1.5px solid ${confirmed ? '#A78BFA' : '#E2E8F0'}`,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            color: '#1E293B', boxSizing: 'border-box',
            background: confirmed ? '#F5F3FF' : 'white',
          }}
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, pointerEvents: 'none',
        }}>
          {loading ? '⏳' : confirmed ? '✓' : '📍'}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1.5px solid #DDD6FE',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(76,29,149,0.12)',
          marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map(r => (
            <div
              key={r.place_id}
              onMouseDown={() => handleSelect(r)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                color: '#1E293B', borderBottom: '1px solid #F1F5F9',
                lineHeight: 1.4,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              📍 {r.display_name}
            </div>
          ))}
        </div>
      )}

      {!confirmed && inputValue.length >= 3 && !loading && (
        <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>
          ⚠️ Sélectionnez une adresse dans la liste pour enregistrer les coordonnées.
        </p>
      )}
      {confirmed && (
        <p style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
          ✓ Adresse géolocalisée — la distance sera calculée depuis ce point.
        </p>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [fairness, setFairness] = useState<{ riGlobal: number; hasHistory: boolean } | null>(null)

  // Champs du profil
  const [displayName,    setDisplayName]    = useState('')
  const [zone,           setZone]           = useState('')
  const [homeLat,        setHomeLat]        = useState<number | null>(null)
  const [homeLng,        setHomeLng]        = useState<number | null>(null)
  const [transport,      setTransport]      = useState('transit')
  const [distanceMax,    setDistanceMax]    = useState(15)
  const [budget,         setBudget]         = useState(30)
  const [socialLevel,    setSocialLevel]    = useState(3)
  const [weights,        setWeights]        = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [constraints,    setConstraints]    = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(CONSTRAINT_LABELS).map(k => [k, false]))
  )
  const [activityPrefs,  setActivityPrefs]  = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_ACTIVITY_TYPES.map(t => [t.key, 50]))
  )
  const [newTypeInput,   setNewTypeInput]   = useState('')
  const [newTypeParent,  setNewTypeParent]  = useState(DEFAULT_ACTIVITY_TYPES[0].key) // toujours un vrai type parent — pas de création de type racine ici
  const [subtypeSuggestions, setSubtypeSuggestions] = useState<{ id: string; name: string; isLocal: boolean }[]>([])
  const [subtypeLoading, setSubtypeLoading] = useState(false)

  const activityTypes = [
    ...DEFAULT_ACTIVITY_TYPES,
    ...Object.keys(activityPrefs)
      .filter(k => !DEFAULT_ACTIVITY_TYPES.some(t => t.key === k))
      .map(k => ({ key: k, emoji: '✨', label: k })),
  ]

  const weightsSum = Object.values(weights).reduce((s, v) => s + v, 0)
  // Sur cette page, seuls les sous-types GLOBAUX pas encore dans le profil ont du sens à
  // suggérer — ceux déjà locaux sont par définition déjà visibles juste au-dessus.
  const visibleSubtypeSuggestions = subtypeSuggestions.filter(s => !s.isLocal)

  function addCustomType() {
    const normalized = normalizeTypeName(newTypeInput)
    if (!normalized || activityTypes.some(t => t.key.toLowerCase() === normalized.toLowerCase())) return
    if (!newTypeParent) return // un type parent est toujours requis — pas de création de type racine ici

    // Sous-type : hérite de la valeur actuelle du parent, enregistré dans le catalogue global
    const inherited = activityPrefs[newTypeParent] ?? 50
    setActivityPrefs(p => ({ ...p, [normalized]: inherited }))
    fetch('/api/activity-subtypes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_type: newTypeParent, name: normalized }),
    }).catch(() => {}) // best-effort — la préférence locale est déjà posée quoi qu'il arrive

    setNewTypeInput('')
    setSubtypeSuggestions([])
  }

  useEffect(() => {
    if (!newTypeParent) { setSubtypeSuggestions([]); return }
    const q = newTypeInput.trim()
    const handle = setTimeout(async () => {
      setSubtypeLoading(true)
      try {
        const res  = await fetch(`/api/activity-subtypes?parent=${encodeURIComponent(newTypeParent)}&q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setSubtypeSuggestions(json.subtypes ?? [])
      } catch {
        setSubtypeSuggestions([])
      } finally {
        setSubtypeLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [newTypeParent, newTypeInput])

  function removeCustomType(key: string) {
    setActivityPrefs(p => {
      const next = { ...p }
      delete next[key]
      return next
    })
  }

  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm,   setDeleteConfirm]   = useState('')
  const [deleteStep, setDeleteStep] = useState<'loading' | 'transfer' | 'confirm'>('confirm')
  const [deletionImpact, setDeletionImpact] = useState<{
    groups: { id: string; name: string; candidates: { id: string; displayName: string }[] }[]
    events: { id: string; name: string; candidates: { id: string; displayName: string }[] }[]
  } | null>(null)
  const [groupTransferChoices, setGroupTransferChoices] = useState<Record<string, string>>({})
  const [eventTransferChoices, setEventTransferChoices] = useState<Record<string, string>>({})

  async function startDeleteFlow() {
    setDeletingAccount(true)
    setDeleteStep('loading')
    const res = await fetch('/api/profile/deletion-impact')
    const impact = await res.json()
    setDeletionImpact(impact)
    if ((impact.groups?.length ?? 0) > 0 || (impact.events?.length ?? 0) > 0) {
      setDeleteStep('transfer')
      const gDefaults: Record<string, string> = {}
      for (const g of impact.groups ?? []) if (g.candidates?.length) gDefaults[g.id] = g.candidates[0].id
      setGroupTransferChoices(gDefaults)
      const eDefaults: Record<string, string> = {}
      for (const e of impact.events ?? []) if (e.candidates?.length) eDefaults[e.id] = e.candidates[0].id
      setEventTransferChoices(eDefaults)
    } else {
      setDeleteStep('confirm')
    }
  }

  const transferIncomplete = (deletionImpact?.groups ?? []).some(g => g.candidates.length > 0 && !groupTransferChoices[g.id])
    || (deletionImpact?.events ?? []).some(e => e.candidates.length > 0 && !eventTransferChoices[e.id])
  const hasOrphans = (deletionImpact?.groups ?? []).some(g => !g.candidates.length)
    || (deletionImpact?.events ?? []).some(e => !e.candidates.length)

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER') return
    const groupTransfers = Object.entries(groupTransferChoices).map(([groupId, newOwnerId]) => ({ groupId, newOwnerId }))
    const eventTransfers = Object.entries(eventTransferChoices).map(([eventId, newOrganizerId]) => ({ eventId, newOrganizerId }))
    const res = await fetch('/api/profile/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupTransfers, eventTransfers }),
    })
    if (res.ok) {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const res = await fetch('/api/profile')
      if (res.ok) {
        const data: UserProfile = await res.json()
        setFairness(data.fairness ?? null)
        setDisplayName(data.display_name ?? '')
        setZone(data.zone ?? '')
        setHomeLat(data.home_lat ?? null)
        setHomeLng(data.home_lng ?? null)
        setTransport(data.transport ?? 'transit')
        setDistanceMax(data.distance_max ?? 15)
        setBudget(data.budget ?? 30)
        setSocialLevel(data.social_level ?? 3)
        setWeights(data.weights ?? DEFAULT_WEIGHTS)
        setConstraints({
          ...Object.fromEntries(Object.keys(CONSTRAINT_LABELS).map(k => [k, false])),
          ...(data.hard_constraints ?? {}),
        })
        setActivityPrefs({
          ...Object.fromEntries(DEFAULT_ACTIVITY_TYPES.map(t => [t.key, 50])),
          ...(data.activity_prefs ?? {}),
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  function updateWeight(key: string, val: number) {
    setWeights(prev => ({ ...prev, [key]: val }))
  }

  function normalizeWeights() {
    const sum = Object.values(weights).reduce((s, v) => s + v, 0)
    if (sum === 0) return
    const normalized = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, Math.round((v / sum) * 100)])
    )
    const diff = 100 - Object.values(normalized).reduce((s, v) => s + v, 0)
    const firstKey = Object.keys(normalized)[0]
    normalized[firstKey] += diff
    setWeights(normalized)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name:     displayName.trim() || null,
        zone,
        home_lat:         homeLat,
        home_lng:         homeLng,
        transport,
        distance_max:     distanceMax,
        budget,
        social_level:     socialLevel,
        weights,
        hard_constraints: constraints,
        activity_prefs:   activityPrefs,
        onboarding_done:  true,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'system-ui', background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #DDD6FE',
            borderTopColor: '#7C3AED', borderRadius: '50%',
            margin: '0 auto 16px', animation: 'spin 0.7s linear infinite',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px', background: 'white',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28}/>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95' }}>IRIS</span>
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Mon profil</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
              ✓ Profil sauvegardé
            </span>
          )}
          <button onClick={handleSave} disabled={saving || weightsSum !== 100}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none',
              background: saving || weightsSum !== 100
                ? '#E2E8F0'
                : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: saving || weightsSum !== 100 ? '#94A3B8' : 'white',
              fontSize: 13, fontWeight: 700,
              cursor: saving || weightsSum !== 100 ? 'default' : 'pointer',
            }}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 100px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#1E293B',
            letterSpacing: '-0.02em', margin: '0 0 6px',
          }}>
            Mon profil de préférences
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Ces informations permettent à IRIS de calculer les scénarios
            les plus adaptés pour vous. Vous pouvez les ajuster
            pour chaque événement.
          </p>
        </div>

        {fairness?.hasHistory && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 14, marginBottom: 20,
            background: '#F5F3FF', border: '1px solid #DDD6FE',
          }}>
            <span style={{ fontSize: 22 }}>⚖️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>
                Votre coefficient d'équité global : {fairness.riGlobal.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>
                Calculé sur l'ensemble de vos participations, tous groupes confondus.
                {' '}
                {(() => {
                  const rounded = Math.round(fairness.riGlobal * 100) / 100
                  return rounded > 1
                    ? 'Vous serez légèrement favorisé lors des prochains événements.'
                    : rounded < 1
                    ? 'Un léger rééquilibrage en votre défaveur s\'appliquera lors des prochains événements.'
                    : 'Vous êtes actuellement dans la médiane.'
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Identité ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px',
          }}>
            Identité
          </h2>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#374151', marginBottom: 6,
            }}>
              Prénom / Pseudo affiché
            </label>
            <input
              type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ex : Alice, Marc, Nadia…"
              maxLength={40}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Visible par les autres participants dans le tableau des disponibilités.
            </p>
          </div>
        </section>

        {/* ── Localisation & transport ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px',
          }}>
            Localisation & déplacement
          </h2>

          {/* Adresse de départ — autocomplete Nominatim */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'flex', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
            }}>
              Mon adresse de départ
              <Tooltip text="Adresse ou ville d'où vous partez généralement. Utilisée pour calculer les distances vers les activités. Sélectionnez dans la liste pour géolocaliser précisément." />
            </label>
            <AddressAutocomplete
              value={zone}
              onChange={(address, lat, lng) => {
                setZone(address)
                setHomeLat(lat)
                setHomeLng(lng)
              }}
            />
          </div>

          {/* Transport */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'flex', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
            }}>
              Mode de transport habituel
              <Tooltip text="Utilisé pour estimer les temps de trajet entre activités lors de la génération des scénarios." />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TRANSPORTS.map(t => (
                <button key={t.value} type="button" onClick={() => setTransport(t.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                    border: `2px solid ${transport === t.value ? '#7C3AED' : '#E2E8F0'}`,
                    background: transport === t.value ? '#F5F3FF' : 'white',
                    textAlign: 'center',
                  }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: transport === t.value ? '#4C1D95' : '#475569',
                  }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Distance max */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
            }}>
              Distance maximale confortable
              <Tooltip text="Distance au-delà de laquelle votre score de satisfaction diminue exponentiellement. Paramètre Dm dans le calcul IRIS." />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={2} max={50} step={1} value={distanceMax}
                onChange={e => setDistanceMax(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#7C3AED' }}
              />
              <span style={{
                fontSize: 14, fontWeight: 700, color: '#4C1D95',
                minWidth: 56, textAlign: 'right',
              }}>
                {distanceMax} km
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Au-delà de {distanceMax} km, votre score distance chute significativement.
            </p>
          </div>
        </section>

        {/* ── Budget & social ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px',
          }}>
            Budget & social
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'flex', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
            }}>
              Budget habituel par sortie (€/personne)
              <Tooltip text="Votre budget typique pour une activité. Les activités plus chères que ce montant réduisent votre score budget. Peut être ajusté pour chaque événement." />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number" value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                min={0} max={500} step={5}
                style={{
                  width: 100, padding: '8px 12px', borderRadius: 9,
                  border: '1.5px solid #DDD6FE', fontSize: 16,
                  fontFamily: 'inherit', outline: 'none',
                  color: '#4C1D95', background: '#F5F3FF',
                  textAlign: 'center', fontWeight: 700,
                }}
              />
              <span style={{ fontSize: 14, color: '#64748B' }}>€ par personne</span>
            </div>
          </div>

          <div>
            <label style={{
              display: 'flex', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
            }}>
              Préférence d'ambiance sociale
              <Tooltip text="1 = calme et intime, 5 = festif et animé. IRIS favorise les activités dont le niveau social est proche du vôtre." />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 1, label: '1', desc: 'Calme' },
                { v: 2, label: '2', desc: 'Cosy' },
                { v: 3, label: '3', desc: 'Équilibré' },
                { v: 4, label: '4', desc: 'Vivant' },
                { v: 5, label: '5', desc: 'Festif' },
              ].map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => setSocialLevel(opt.v)}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 9, cursor: 'pointer',
                    border: `2px solid ${socialLevel === opt.v ? '#7C3AED' : '#E2E8F0'}`,
                    background: socialLevel === opt.v ? '#F5F3FF' : 'white',
                    textAlign: 'center',
                  }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: socialLevel === opt.v ? '#4C1D95' : '#475569',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Préférences par type d'activité ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            Préférences par type d'activité
          </h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 16px' }}>
            Votre attrait pour chaque catégorie (0 = ne m'intéresse pas, 100 = j'adore).
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {activityTypes.map(type => {
              const val = activityPrefs[type.key] ?? 50
              const isCustom = !DEFAULT_ACTIVITY_TYPES.some(t => t.key === type.key)
              const color = val >= 80 ? '#14532D' : val >= 60 ? '#3F6212'
                : val >= 40 ? '#713F12' : '#7F1D1D'
              const bg = val >= 80 ? '#BBF7D0' : val >= 60 ? '#D9F99D'
                : val >= 40 ? '#FEF9C3' : '#FECACA'
              return (
                <div key={type.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 18 }}>{type.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', flex: 1 }}>
                      {type.label}
                      {isCustom && (
                        <span style={{
                          fontSize: 9, background: '#EDE9FE', color: '#7C3AED',
                          padding: '1px 5px', borderRadius: 4, marginLeft: 6, fontWeight: 500,
                        }}>
                          personnalisé
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right',
                      padding: '2px 8px', borderRadius: 6, background: bg, color,
                    }}>
                      {val}%
                    </span>
                    {isCustom && (
                      <button type="button" onClick={() => removeCustomType(type.key)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#94A3B8', fontSize: 16, padding: '0 2px',
                        }}
                        title="Supprimer ce type"
                      >×</button>
                    )}
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={val}
                    onChange={e => setActivityPrefs(p => ({
                      ...p, [type.key]: Number(e.target.value),
                    }))}
                    style={{ width: '100%', accentColor: '#7C3AED' }}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              + Ajouter un sous-type d'activité personnalisé
              <Tooltip text="Un sous-type précise un type existant (ex. « Japonais » pour Restaurant, « Karting » pour Sport). Il hérite par défaut de votre note du type parent, modifiable ensuite librement. Les sous-types sont partagés entre tous les utilisateurs d'IRIS : s'il existe déjà, il vous sera proposé plutôt que d'en recréer un quasi-identique. Si vous participez à un événement où quelqu'un d'autre propose une activité de ce sous-type, il apparaîtra aussi dans votre propre profil, avec une note héritée de votre propre appréciation du type parent." />
            </div>
            <select value={newTypeParent} onChange={e => { setNewTypeParent(e.target.value); setNewTypeInput('') }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 9, marginBottom: 8,
                border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit',
                outline: 'none', color: '#1E293B', background: 'white',
              }}>
              {DEFAULT_ACTIVITY_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.key}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text" value={newTypeInput}
                  onChange={e => setNewTypeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomType())}
                  placeholder={`Rechercher ou créer un sous-type de ${newTypeParent}…`}
                  maxLength={40}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1.5px solid #E2E8F0', fontSize: 13,
                    fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                  }}
                />
                {newTypeParent && (subtypeLoading || visibleSubtypeSuggestions.length > 0) && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    borderRadius: 10, border: '1px solid #E2E8F0', background: 'white',
                    maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10,
                  }}>
                    {subtypeLoading && <div style={{ padding: '8px 12px', fontSize: 12, color: '#94A3B8' }}>Recherche…</div>}
                    {!subtypeLoading && visibleSubtypeSuggestions.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => { setNewTypeInput(s.name); addCustomType() }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                          borderBottom: '1px solid #F1F5F9',
                        }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={addCustomType}
                disabled={!newTypeInput.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 9, border: 'none',
                  background: newTypeInput.trim() ? '#4C1D95' : '#E2E8F0',
                  color: newTypeInput.trim() ? 'white' : '#94A3B8',
                  fontSize: 13, fontWeight: 600,
                  cursor: newTypeInput.trim() ? 'pointer' : 'default',
                }}>
                Ajouter
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
              Hérite par défaut de votre note actuelle pour "{newTypeParent}", modifiable ensuite ci-dessus.
            </p>
          </div>
        </section>

        {/* ── Poids des critères ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: `1px solid ${weightsSum !== 100 ? '#FCA5A5' : '#E2E8F0'}`,
          marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 6,
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
            }}>
              Poids des critères
              <Tooltip text="Comment IRIS pondère les 5 dimensions dans le calcul de votre satisfaction. La somme doit être égale à 100." />
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: weightsSum === 100 ? '#166534' : '#991B1B',
              }}>
                {weightsSum}/100
              </span>
              {weightsSum !== 100 && (
                <button onClick={normalizeWeights} type="button"
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none',
                    background: '#EDE9FE', color: '#4C1D95',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Normaliser
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 16px' }}>
            Ajustez selon ce qui compte le plus pour vous.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#374151', flex: 1, fontWeight: 500 }}>
                    {WEIGHT_LABELS[key]}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#4C1D95',
                    minWidth: 36, textAlign: 'right',
                    background: '#EDE9FE', padding: '2px 8px', borderRadius: 6,
                  }}>
                    {val}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={60} step={5} value={val}
                  onChange={e => updateWeight(key, Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#7C3AED' }}
                />
              </div>
            ))}
          </div>

          {weightsSum !== 100 && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 8,
              background: '#FEE2E2', border: '1px solid #FCA5A5',
              fontSize: 12, color: '#991B1B',
            }}>
              ⚠️ La somme des poids doit être égale à 100. Actuellement : {weightsSum}.
              Cliquez "Normaliser" pour ajuster automatiquement.
            </div>
          )}
        </section>

        {/* ── Contraintes dures ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #E2E8F0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            Contraintes dures
          </h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 14px' }}>
            Ces contraintes excluent automatiquement les activités incompatibles.
          </p>

          {['Mobilité', 'Alimentaire', 'Environnement', 'Accompagnement'].map(cat => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
              }}>
                {cat}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(CONSTRAINT_LABELS)
                  .filter(([, v]) => v.category === cat)
                  .map(([key, { label, desc }]) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${constraints[key] ? '#7C3AED' : '#E2E8F0'}`,
                      background: constraints[key] ? '#F5F3FF' : 'white',
                    }}
                      onClick={() => setConstraints(p => ({ ...p, [key]: !p[key] }))}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: constraints[key] ? '#4C1D95' : '#374151',
                        }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{desc}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        border: `2px solid ${constraints[key] ? '#7C3AED' : '#CBD5E1'}`,
                        background: constraints[key] ? '#7C3AED' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {constraints[key] && (
                          <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── Gestion du compte ── */}
        <section style={{
          background: 'white', borderRadius: 14, padding: '20px 22px',
          border: '1px solid #FCA5A5', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#991B1B',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px',
          }}>
            Gestion du compte
          </h2>

          {!deletingAccount ? (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
                  Supprimer mon compte
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                  Réinitialise votre profil et vos préférences. Votre coefficient d'équité
                  et votre historique sont conservés pour préserver l'équité de vos groupes.
                </div>
              </div>
              <button
                type="button"
                onClick={startDeleteFlow}
                style={{
                  padding: '9px 18px', borderRadius: 9, border: '1.5px solid #FCA5A5',
                  background: 'white', color: '#991B1B',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                Supprimer mon compte
              </button>
            </div>
          ) : deleteStep === 'loading' ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
              Vérification en cours…
            </div>
          ) : deleteStep === 'transfer' ? (
            <div>
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#FEF3C7', border: '1px solid #FDE68A',
                marginBottom: 14, fontSize: 13, color: '#92400E', lineHeight: 1.6,
              }}>
                ⚠️ Vous possédez {deletionImpact?.groups.length ?? 0} groupe{(deletionImpact?.groups.length ?? 0) > 1 ? 's' : ''} et organisez {deletionImpact?.events.length ?? 0} événement{(deletionImpact?.events.length ?? 0) > 1 ? 's' : ''} en cours. Choisissez qui reprend la main avant de continuer.
              </div>

              {(deletionImpact?.groups ?? []).map(g => (
                <div key={g.id} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    👥 Groupe « {g.name} »
                  </label>
                  {g.candidates.length > 0 ? (
                    <select value={groupTransferChoices[g.id] ?? ''} onChange={e => setGroupTransferChoices(prev => ({ ...prev, [g.id]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', color: '#1E293B', background: 'white', fontSize: 13 }}>
                      {g.candidates.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                    </select>
                  ) : (
                    <p style={{ fontSize: 12, color: '#991B1B', margin: 0 }}>Aucun autre membre actif — ce groupe restera sans propriétaire.</p>
                  )}
                </div>
              ))}

              {(deletionImpact?.events ?? []).map(ev => (
                <div key={ev.id} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    📅 Événement « {ev.name} »
                  </label>
                  {ev.candidates.length > 0 ? (
                    <select value={eventTransferChoices[ev.id] ?? ''} onChange={e => setEventTransferChoices(prev => ({ ...prev, [ev.id]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', color: '#1E293B', background: 'white', fontSize: 13 }}>
                      {ev.candidates.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                    </select>
                  ) : (
                    <p style={{ fontSize: 12, color: '#991B1B', margin: 0 }}>Aucun autre participant — cet événement restera sans organisateur.</p>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => { setDeletingAccount(false); setDeleteStep('confirm') }} style={{
                  padding: '10px 16px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: 'white',
                  color: '#64748B', fontSize: 13, cursor: 'pointer',
                }}>
                  Annuler
                </button>
                <button type="button" onClick={() => setDeleteStep('confirm')} disabled={transferIncomplete && !hasOrphans} style={{
                  padding: '10px 18px', borderRadius: 9, border: 'none',
                  background: (transferIncomplete && !hasOrphans) ? '#E2E8F0' : '#DC2626',
                  color: (transferIncomplete && !hasOrphans) ? '#94A3B8' : 'white',
                  fontSize: 13, fontWeight: 700, cursor: (transferIncomplete && !hasOrphans) ? 'default' : 'pointer',
                }}>
                  Continuer →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                marginBottom: 14, fontSize: 13, color: '#991B1B', lineHeight: 1.6,
              }}>
                ⚠️ Cette action réinitialise :<br/>
                • Votre nom affiché et vos préférences d'activité<br/>
                • Vos contraintes et informations de profil<br/><br/>
                <strong>Votre coefficient d'équité (Rᵢ) et votre historique de compensation sont conservés</strong> —
                ils restent rattachés à ce compte pour préserver l'équité vis-à-vis des autres membres de vos groupes, même après réinitialisation.
                Vous pourrez vous reconnecter normalement avec le même email et reconfigurer votre profil.<br/><br/>
                Vos groupes et événements créés <strong>ne seront pas supprimés</strong> —
                ils resteront accessibles aux autres membres.
              </div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 6,
              }}>
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 9,
                    border: '1.5px solid #FCA5A5', fontSize: 14,
                    fontFamily: 'inherit', outline: 'none', color: '#1E293B',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setDeletingAccount(false); setDeleteConfirm('') }}
                  style={{
                    padding: '10px 16px', borderRadius: 9,
                    border: '1.5px solid #E2E8F0', background: 'white',
                    color: '#64748B', fontSize: 13, cursor: 'pointer',
                  }}>
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'SUPPRIMER'}
                  style={{
                    padding: '10px 18px', borderRadius: 9, border: 'none',
                    background: deleteConfirm === 'SUPPRIMER' ? '#DC2626' : '#E2E8F0',
                    color: deleteConfirm === 'SUPPRIMER' ? 'white' : '#94A3B8',
                    fontSize: 13, fontWeight: 700,
                    cursor: deleteConfirm === 'SUPPRIMER' ? 'pointer' : 'default',
                  }}>
                  Confirmer la suppression
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Bouton bas de page */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Link href="/dashboard" style={{
            padding: '11px 22px', borderRadius: 10,
            border: '1.5px solid #E2E8F0', color: '#64748B',
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>
            Retour au dashboard
          </Link>
          <button onClick={handleSave} disabled={saving || weightsSum !== 100}
            style={{
              padding: '11px 28px', borderRadius: 10, border: 'none',
              background: saving || weightsSum !== 100
                ? '#E2E8F0'
                : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: saving || weightsSum !== 100 ? '#94A3B8' : 'white',
              fontSize: 14, fontWeight: 700,
              cursor: saving || weightsSum !== 100 ? 'default' : 'pointer',
            }}>
            {saving ? 'Enregistrement…' : saved ? '✓ Sauvegardé !' : 'Sauvegarder le profil'}
          </button>
        </div>

      </main>

      {/* Feedback flottant */}
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

    </div>
  )
}
