// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  id:               string
  name:             string
  type:             string
  type_parent:      string | null
  address:          string | null
  address_lat:      number | null
  address_lng:      number | null
  duration_minutes: number | null
  cost_per_person:  number | null
  suggested_by:     string
  opening_hours:    Record<string, { open: string; close: string; break_start?: string; break_end?: string }> | null
  created_at:       string
  social_level:     number
  no_stairs:        boolean
  is_intense:       boolean
  is_high_altitude: boolean
  is_aquatic:       boolean
  is_loud:          boolean
  has_strobe:       boolean
  smoke_free:       boolean
  has_pets:         boolean
  gluten_ok:        boolean
  seafood_ok:       boolean
  halal_ok:         boolean
  alcohol_free:     boolean
  pregnancy_ok:     boolean
  pets_allowed:     boolean
  kid_ok:           boolean
  vegan_ok:         boolean
  nut_ok:           boolean
  diab_ok:          boolean
}

interface UserProfile {
  display_name:     string | null
  activity_prefs:   Record<string, number>
  hard_constraints: Record<string, boolean>
  home_lat:         number | null
  home_lng:         number | null
  onboarding_done:  boolean
}

interface GroupTopType { type: string; avg: number; count: number }

interface PageData {
  event:              { id: string; name: string; phase: number; proposed_dates: string[]; created_by: string; budget_global: number | null }
  activities:         Activity[]
  userProfile:        UserProfile | null
  groupTopTypes:      GroupTopType[]
  groupConstraintsByActivity: Record<string, Record<string, number>>
  userAvailabilities: { date: string; slot_start: string | null; slot_end: string | null; status: string; constraint_overrides?: Record<string, Record<string, boolean>>; pref_overrides?: Record<string, number> }[]
  participantCount:   number
  currentUserId:      string
  knownSubtypeNames:  string[]
}

interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string
}

const DAYS    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_KEYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
const MAX_ACTIVITIES_DEMO = 10

// Types treated as meal-dependent — the "break" between opening hours represents
// the gap between lunch and dinner service, not a generic pause
const MEAL_TYPES = ['Restaurant', 'Gastronomie', 'Brunch', 'Petit-déjeuner']
function isMealType(type: string): boolean {
  return MEAL_TYPES.some(t => type?.toLowerCase().includes(t.toLowerCase()))
}

// ─── Constraint map: profil key → activity field ──────────────────────────────
// failWhen: true  → conflit si la colonne activité vaut true
// failWhen: false → conflit si la colonne activité vaut false
const CONSTRAINT_MAP: Record<string, { activityField: keyof Activity; failWhen: boolean }> = {
  stair:        { activityField: 'no_stairs',        failWhen: false },
  PMR:          { activityField: 'no_stairs',        failWhen: false },
  cardio:       { activityField: 'is_intense',       failWhen: true  },
  vertigo:      { activityField: 'is_high_altitude', failWhen: true  },
  aquatic:      { activityField: 'is_aquatic',       failWhen: true  },
  noise:        { activityField: 'is_loud',          failWhen: true  },
  epilepsy:     { activityField: 'has_strobe',       failWhen: true  },
  smoke:        { activityField: 'smoke_free',       failWhen: false },
  allergy_pets: { activityField: 'has_pets',         failWhen: true  },
  gluten:       { activityField: 'gluten_ok',        failWhen: false },
  seafood:      { activityField: 'seafood_ok',       failWhen: false },
  halal_kosher: { activityField: 'halal_ok',         failWhen: false },
  alcohol:      { activityField: 'alcohol_free',     failWhen: false },
  pregnancy:    { activityField: 'pregnancy_ok',     failWhen: false },
  pets:         { activityField: 'pets_allowed',     failWhen: false },
  kids:         { activityField: 'kid_ok',           failWhen: false },
  vegan:        { activityField: 'vegan_ok',         failWhen: false },
  nuts:         { activityField: 'nut_ok',           failWhen: false },
  diet:         { activityField: 'diab_ok',          failWhen: false },
}

// Étiquettes françaises — reprises telles quelles du profil, pour ne jamais
// afficher une clé technique brute ("stair", "PMR"...) à l'écran.
const CONSTRAINT_LABELS: Record<string, { label: string; desc: string }> = {
  PMR:          { label: '♿ PMR',                         desc: 'Accessibilité fauteuil roulant requise' },
  stair:        { label: '🚶 Pas d\'escaliers',            desc: 'Difficultés à marcher, poussettes, cannes (ascenseur obligatoire)' },
  cardio:       { label: '🫀 Condition cardio',            desc: 'Exclut les efforts physiques intenses (cardiaques, asthme sévère)' },
  vertigo:      { label: '🧗 Vertige / Acrophobie',        desc: 'Exclut les activités en hauteur (accrobranche, rooftop, via ferrata)' },
  aquatic:      { label: '🏊 Aquaphobie / Non-nageur',     desc: 'Ne sait pas nager ou refuse les activités aquatiques' },
  nuts:         { label: '🥜 Allergie noix',               desc: 'Exclut les lieux servant des noix' },
  diet:         { label: '🏥 Régime médical',              desc: 'Contrainte alimentaire / diabète' },
  vegan:        { label: '🌱 Vegan',                       desc: 'Uniquement des options véganes' },
  gluten:       { label: '🌾 Sans gluten',                 desc: 'Intolérance ou maladie cœliaque (options certifiées requises)' },
  seafood:      { label: '🦞 Allergie fruits de mer',      desc: 'Exclut les restaurants poissons/crustacés' },
  halal_kosher: { label: '🥩 Viande confessionnelle',      desc: 'Nécessite des options Halal ou Casher' },
  alcohol:      { label: '🚫 Sans alcool',                 desc: 'Exclut les lieux centrés sur l\'alcool (bars spécifiques, dégustations)' },
  pregnancy:    { label: '🤰 Grossesse',                   desc: 'Exclut aliments interdits (cru) et activités physiques intenses' },
  noise:        { label: '🔇 Hyperacousie / Calme',        desc: 'Exclut les lieux très bruyants (boîtes, bars bondés, concerts)' },
  epilepsy:     { label: '⚡ Épilepsie / Photosensibilité', desc: 'Exclut les jeux de lumière stroboscopiques' },
  smoke:        { label: '🚬 Zone non-fumeur',             desc: 'Exclut les espaces autorisant le tabac/vapotage' },
  allergy_pets: { label: '🐱 Allergie animaux',            desc: 'Exclut les lieux accueillant des animaux (bars à chats, etc.)' },
  kids:         { label: '👶 Enfants',                     desc: 'Activités adaptées aux enfants' },
  pets:         { label: '🐾 Animal d\'assistance',        desc: 'Le participant doit pouvoir venir avec son animal' },
}

// Constraints the user can override per-activity (situational, not physical)
const OVERRIDABLE_CONSTRAINTS: Record<string, string> = {
  kids:         '👶 Mes enfants seront gardés ce jour-là',
  pets:         '🐾 Mon animal restera à la maison',
  allergy_pets: '🐱 Je gère mon allergie (antihistaminiques)',
  noise:        '🔇 Je m équiperai d un casque antibruit',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeTypeName(name: string): string {
  return name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%', background: '#EDE9FE',
          color: '#7C3AED', fontSize: 10, fontWeight: 700, cursor: 'help', marginLeft: 5,
        }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: '#1E293B', color: 'white', fontSize: 11, lineHeight: 1.5,
          padding: '7px 10px', borderRadius: 8, width: 220, zIndex: 50,
          whiteSpace: 'normal', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>{text}</span>
      )}
    </span>
  )
}

// ─── AddressAutocomplete ──────────────────────────────────────────────────────

interface AddressProps {
  value:     string
  lat:       number | null
  lng:       number | null
  onChange:  (address: string, lat: number | null, lng: number | null) => void
  required?: boolean
}

function AddressAutocomplete({ value, lat, lng, onChange, required }: AddressProps) {
  const [inputValue,  setInputValue]  = useState(value)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  // confirmed = true si lat/lng sont renseignés (sélection effective)
  const confirmed  = lat !== null && lng !== null
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)

  // Sync si value change de l'extérieur (ex : retour step 1)
  useEffect(() => { setInputValue(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data: NominatimResult[] = await res.json()
      setSuggestions(data); setOpen(data.length > 0)
    } catch { setSuggestions([]) }
    finally { setLoading(false) }
  }, [])

  function handleInput(val: string) {
    setInputValue(val)
    onChange(val, null, null)  // reset coords
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  function handleSelect(r: NominatimResult) {
    setInputValue(r.display_name); setOpen(false); setSuggestions([])
    onChange(r.display_name, parseFloat(r.lat), parseFloat(r.lon))
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input type="text" value={inputValue} onChange={e => handleInput(e.target.value)}
          placeholder="Ex : 12 rue de la Paix, Paris 75002…"
          style={{
            width: '100%', padding: '9px 36px 9px 12px', borderRadius: 9,
            border: `1.5px solid ${confirmed ? '#A78BFA' : required && !inputValue ? '#FCA5A5' : '#E2E8F0'}`,
            fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1E293B',
            boxSizing: 'border-box', background: confirmed ? '#F5F3FF' : 'white',
          }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>
          {loading ? '⏳' : confirmed ? '✓' : '📍'}
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'white', border: '1.5px solid #DDD6FE', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(76,29,149,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map(r => (
            <div key={r.place_id} onMouseDown={() => handleSelect(r)}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 12, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >📍 {r.display_name}</div>
          ))}
        </div>
      )}
      {confirmed && (
        <p style={{ fontSize: 11, color: '#166534', marginTop: 3 }}>✓ Adresse géolocalisée.</p>
      )}
      {!confirmed && inputValue.length >= 3 && !loading && !open && (
        <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 3 }}>
          Sélectionnez dans la liste pour géolocaliser, ou reformulez.
        </p>
      )}
      {required && !confirmed && (
        <p style={{ fontSize: 11, color: '#991B1B', marginTop: 3 }}>
          ⚠️ L'adresse est obligatoire et doit être sélectionnée dans la liste.
        </p>
      )}
    </div>
  )
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity, userProfile, currentUserId, userAvailabilities, onEdit, onPrefChange, onOverrideChange, constraintOverrides, onDelete, canDelete, myPrefOverrides, groupConstraints, isOrganizer,
}: {
  activity:             Activity
  userProfile:          UserProfile | null
  currentUserId:        string
  userAvailabilities:   PageData['userAvailabilities']
  myPrefOverrides:      Record<string, number>
  groupConstraints:     Record<string, number>
  isOrganizer:          boolean
  onEdit:               (a: Activity) => void
  onPrefChange:         (type: string, val: number) => void
  onOverrideChange:     (key: string, val: boolean) => void
  constraintOverrides:  Record<string, boolean>
  onDelete:             (id: string) => void
  canDelete:            boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const globalPref = myPrefOverrides[activity.type] ?? userProfile?.activity_prefs?.[activity.type] ?? null
  // Pour les types non présents dans le profil, on démarre à 50
  const initialPref = globalPref ?? 50
  const [localPref, setLocalPref] = useState<number>(initialPref)
  const typeInProfile = globalPref !== null
  const prefChanged   = localPref !== initialPref

  useEffect(() => { setLocalPref(globalPref ?? 50) }, [globalPref])

  // Distance
  let distanceKm: number | null = null
  if (userProfile?.home_lat != null && userProfile?.home_lng != null
    && activity.address_lat != null && activity.address_lng != null) {
    distanceKm = haversineKm(
      userProfile.home_lat!, userProfile.home_lng!,
      activity.address_lat!, activity.address_lng!
    )
  }

  // Conflicts — skip if user overrode this constraint for this event
  const myConstraints = userProfile?.hard_constraints ?? {}
  const conflicts: string[] = []
  for (const [key, mapping] of Object.entries(CONSTRAINT_MAP)) {
    if (myConstraints[key] && !constraintOverrides[key]) {
      const actVal = activity[mapping.activityField] as boolean
      if (mapping.failWhen ? actVal === true : actVal === false) conflicts.push(key)
    }
  }
  const isCompatible = conflicts.length === 0
  const isMine       = activity.suggested_by === currentUserId

  // Conflits au niveau du groupe — combien de participants (peu importe qui) ont une
  // contrainte active qui exclut cette activité. Réservé à l'organisateur : un
  // affichage en temps réel visible par tous créerait une boucle où le proposant
  // pourrait ajuster ses cases jusqu'à faire disparaître le conflit avant de
  // soumettre, sans que personne ne le sache (les activités restent anonymes).
  // L'organisateur, lui, est identifiable et responsable de la clôture — la
  // sanction sociale reste possible s'il ferme les yeux sciemment.
  const groupConflicts: { key: string; count: number }[] = []
  if (isOrganizer) {
    for (const [key, mapping] of Object.entries(CONSTRAINT_MAP)) {
      const count = groupConstraints[key] ?? 0
      if (count === 0) continue
      const actVal = activity[mapping.activityField] as boolean
      if (mapping.failWhen ? actVal === true : actVal === false) {
        groupConflicts.push({ key, count })
      }
    }
  }

  // Availability check
  const openingHours = activity.opening_hours ?? {}
  const availableDays = userAvailabilities.filter(a => a.status === 'ok' || a.status === 'cond').filter(av => {
    if (Object.keys(openingHours).length === 0) return true
    const d = new Date(av.date)
    const dayKey = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
    const h = openingHours[dayKey]
    if (!h) return false
    if (av.slot_start && av.slot_end) return av.slot_start < h.close && av.slot_end > h.open
    return true
  })

  const inputStyle: React.CSSProperties = {
    fontSize: 13, fontFamily: 'inherit', color: '#4C1D95',
  }

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: `1.5px solid ${isCompatible ? '#E2E8F0' : '#FCA5A5'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Ligne titre */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>{activity.name}</h3>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#EDE9FE', color: '#4C1D95', fontWeight: 600 }}>
                {activity.type}
              </span>
              {isMine && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: '#F0FDF4', color: '#166534', fontWeight: 600 }}>
                  Ma suggestion
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
              {activity.address && (
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  📍 {activity.address.length > 45 ? activity.address.slice(0, 45) + '…' : activity.address}
                </span>
              )}
              {distanceKm !== null && (
                <span style={{ fontSize: 12, fontWeight: 600, color: distanceKm < 5 ? '#166534' : distanceKm < 15 ? '#713F12' : '#991B1B' }}>
                  🗺️ {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                </span>
              )}
              {activity.duration_minutes && (
                <span style={{ fontSize: 12, color: '#64748B' }}>⏱️ {activity.duration_minutes} min</span>
              )}
              {activity.cost_per_person != null && (
                <span style={{ fontSize: 12, color: '#64748B' }}>💶 {activity.cost_per_person}€/pers.</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
            {isCompatible
              ? <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>✓ Compatible</span>
              : <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}>⚠️ {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}</span>
            }
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setExpanded(e => !e)} style={{
                background: 'none', border: '1px solid #E2E8F0', borderRadius: 6,
                cursor: 'pointer', color: '#64748B', fontSize: 11,
                padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {expanded ? '▲ Réduire' : '▼ Détails'}
              </button>
              {isMine && canDelete && (
                <>
                  <button onClick={() => onEdit(activity)} style={{
                    background: '#EDE9FE', border: 'none', borderRadius: 6,
                    cursor: 'pointer', color: '#4C1D95', fontSize: 11,
                    padding: '3px 8px', fontWeight: 600,
                  }}>✏️ Modifier</button>
                  <button onClick={() => onDelete(activity.id)} style={{
                    background: '#FEE2E2', border: 'none', borderRadius: 6,
                    cursor: 'pointer', color: '#991B1B', fontSize: 11,
                    padding: '3px 8px', fontWeight: 600,
                  }}>🗑️</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Appréciation — toujours visible */}
        {userProfile && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center' }}>
                Mon appréciation — {activity.type}
                {!typeInProfile && (
                  <span style={{ fontSize: 10, background: '#FEF9C3', color: '#92400E', padding: '1px 6px', borderRadius: 5, marginLeft: 6, fontWeight: 600 }}>
                    type non dans profil
                  </span>
                )}
                <Tooltip text={typeInProfile
                  ? "Valeur issue de votre profil. Modifiez-la ici pour cet événement — vous pourrez mettre à jour votre profil à la fin de la phase."
                  : "Ce type n'est pas dans votre profil. Indiquez votre appréciation — elle sera proposée à l'ajout dans votre profil."
                } />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {prefChanged && (
                  <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
                    modifiée{typeInProfile ? ` (profil : ${globalPref}%)` : ''}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', background: '#EDE9FE', padding: '2px 10px', borderRadius: 8 }}>
                  {localPref}%
                </span>
              </div>
            </div>
            <input type="range" min={0} max={100} step={5} value={localPref}
              onChange={e => {
                const v = Number(e.target.value)
                setLocalPref(v)
                onPrefChange(activity.type, v)
              }}
              style={{ width: '100%', accentColor: '#7C3AED', ...inputStyle }}
            />
          </div>
        )}

        {/* Overrides contraintes situationnelles */}
        {userProfile && (() => {
          const myConstraints = userProfile.hard_constraints ?? {}
          const overridableConflicts = Object.entries(OVERRIDABLE_CONSTRAINTS).filter(([key]) => {
            const mapping = CONSTRAINT_MAP[key]
            if (!myConstraints[key] || !mapping) return false
            const actVal = activity[mapping.activityField] as boolean
            return mapping.failWhen ? actVal === true : actVal === false
          })
          if (overridableConflicts.length === 0) return null
          return (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 7 }}>
                ⚠️ Contraintes situationnelles — vous pouvez les désactiver pour cette activité :
              </div>
              <div style={{ display: 'grid', gap: 5 }}>
                {overridableConflicts.map(([key, label]) => {
                  const isOverridden = !!constraintOverrides[key]
                  return (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: isOverridden ? '#F0FDF4' : '#FFF7ED',
                      border: `1px solid ${isOverridden ? '#BBF7D0' : '#FED7AA'}`,
                    }}>
                      <input type="checkbox" checked={isOverridden}
                        onChange={e => onOverrideChange(key, e.target.checked)}
                        style={{ accentColor: '#16A34A', width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: isOverridden ? '#166534' : '#92400E', lineHeight: 1.3 }}>
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Dispo */}
        {userAvailabilities.length > 0 && availableDays.length > 0 && (
          <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 12, color: '#166534' }}>
            ✓ Disponible : {availableDays.map(a => new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}
          </div>
        )}
        {userAvailabilities.length > 0 && availableDays.length === 0 && Object.keys(openingHours).length > 0 && (
          <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: 12, color: '#92400E' }}>
            ⚠️ Aucun de vos créneaux ne correspond aux horaires de cette activité.
          </div>
        )}
      </div>

      {/* Conflits de groupe — organisateur uniquement, toujours visible (pas replié) */}
      {isOrganizer && groupConflicts.length > 0 && (
        <div style={{
          margin: '0 16px 12px', padding: '9px 12px', borderRadius: 9,
          background: '#FEF2F2', border: '1.5px solid #FCA5A5',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 3 }}>
            🔒 Vue organisateur — conflit(s) de contrainte détecté(s)
          </div>
          <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6 }}>
            {groupConflicts.map(gc => (
              <div key={gc.key}>
                {CONSTRAINT_LABELS[gc.key]?.label ?? gc.key} — {gc.count} participant{gc.count > 1 ? 's' : ''} concerné{gc.count > 1 ? 's' : ''} (anonymisé)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Détails étendus */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '12px 16px' }}>
          {conflicts.length > 0 && (
            <div style={{ marginBottom: 10, padding: '7px 12px', borderRadius: 8, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
              <strong>Conflits :</strong> {conflicts.map(k => CONSTRAINT_LABELS[k]?.label ?? k).join(' · ')}
            </div>
          )}
          {Object.keys(openingHours).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Horaires</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {DAY_KEYS.map((key, i) => {
                  const h = openingHours[key]
                  const bs = (h as { break_start?: string })?.break_start
                  const be = (h as { break_end?: string })?.break_end
                  return (
                    <div key={key} style={{
                      fontSize: 11, padding: '4px 8px', borderRadius: 7,
                      background: h ? '#F0FDF4' : '#F8FAFC',
                      border: `1px solid ${h ? '#BBF7D0' : '#E2E8F0'}`,
                      color: h ? '#166534' : '#94A3B8',
                    }}>
                      <span style={{ fontWeight: 600 }}>{DAYS[i]}</span>
                      {h ? ` ${h.open}–${h.close}${bs ? ` (pause ${bs}–${be})` : ''}` : ' Fermé'}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {Object.keys(openingHours).length === 0 && (
            <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
              Aucun horaire renseigné — activité considérée disponible toute la journée.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulaire d'ajout / édition ─────────────────────────────────────────────

const makeEmptyForm = () => ({
  name:             '',
  activity_type:    '',
  custom_type:      '',
  subtype_query:    '',   // texte tapé dans l'autocomplete de sous-type
  subtype_selected: '',   // nom du sous-type confirmé (vide = pas de sous-type, type racine seul)
  address:          '',
  address_lat:      null as number | null,
  address_lng:      null as number | null,
  cost_per_person:  '' as string,
  duration_minutes: '' as string,
  social_level:     3,
  opening_hours:    {} as Record<string, { open: string; close: string; break_start?: string; break_end?: string }>,
  // Contraintes — toutes à false par défaut
  no_stairs:        false,
  pets_allowed:     false,
  is_intense:       false,
  is_high_altitude: false,
  is_aquatic:       false,
  is_loud:          false,
  has_strobe:       false,
  smoke_free:       false,
  has_pets:         false,
  gluten_ok:        false,
  seafood_ok:       false,
  halal_ok:         false,
  alcohol_free:     false,
  pregnancy_ok:     false,
  vegan_ok:         false,
  nut_ok:           false,
  diab_ok:          false,
  kid_ok:           false,
})

type FormState = ReturnType<typeof makeEmptyForm>

function activityToForm(a: Activity): FormState {
  return {
    name:             a.name,
    activity_type:    a.type_parent ?? a.type,
    custom_type:      '',
    subtype_query:    a.type_parent ? a.type : '',
    subtype_selected: a.type_parent ? a.type : '',
    address:          a.address ?? '',
    address_lat:      a.address_lat,
    address_lng:      a.address_lng,
    cost_per_person:  a.cost_per_person != null ? String(a.cost_per_person) : '',
    duration_minutes: a.duration_minutes != null ? String(a.duration_minutes) : '',
    social_level:     a.social_level ?? 3,
    opening_hours:    (a.opening_hours as FormState['opening_hours']) ?? {},
    no_stairs:        !a.no_stairs,        // invert: cochée = il y a des escaliers
    pets_allowed:     !a.pets_allowed,     // invert: cochée = animaux non admis
    is_intense:       a.is_intense,
    is_high_altitude: a.is_high_altitude,
    is_aquatic:       a.is_aquatic,
    is_loud:          a.is_loud,
    has_strobe:       a.has_strobe,
    smoke_free:       !a.smoke_free,       // invert: cochée = tabac toléré
    has_pets:         a.has_pets,
    gluten_ok:        !a.gluten_ok,        // invert: cochée = pas d'option sans gluten
    seafood_ok:       !a.seafood_ok,
    halal_ok:         !a.halal_ok,
    alcohol_free:     !a.alcohol_free,
    pregnancy_ok:     !a.pregnancy_ok,
    vegan_ok:         !a.vegan_ok,
    nut_ok:           !a.nut_ok,
    diab_ok:          !a.diab_ok,
    kid_ok:           !a.kid_ok,
  }
}

function formToBody(form: FormState, resolvedType: string, resolvedTypeParent: string | null) {
  return {
    name:             form.name.trim(),
    type:             resolvedType,
    type_parent:      resolvedTypeParent,
    address:          form.address || null,
    address_lat:      form.address_lat,
    address_lng:      form.address_lng,
    cost_per_person:  form.cost_per_person !== '' ? Number(form.cost_per_person) : 0,
    duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
    opening_hours:    Object.keys(form.opening_hours).length > 0 ? form.opening_hours : null,
    social_level:     form.social_level,
    // Invert back for DB
    no_stairs:        !form.no_stairs,
    pets_allowed:     !form.pets_allowed,
    is_intense:       form.is_intense,
    is_high_altitude: form.is_high_altitude,
    is_aquatic:       form.is_aquatic,
    is_loud:          form.is_loud,
    has_strobe:       form.has_strobe,
    smoke_free:       !form.smoke_free,
    has_pets:         form.has_pets,
    gluten_ok:        !form.gluten_ok,
    seafood_ok:       !form.seafood_ok,
    halal_ok:         !form.halal_ok,
    alcohol_free:     !form.alcohol_free,
    pregnancy_ok:     !form.pregnancy_ok,
    vegan_ok:         !form.vegan_ok,
    nut_ok:           !form.nut_ok,
    diab_ok:          !form.diab_ok,
    kid_ok:           !form.kid_ok,
  }
}

function ActivityForm({
  userProfile, onSubmit, onCancel, eventId, editActivity, knownSubtypeNames,
}: {
  userProfile:   UserProfile | null
  onSubmit:      (activity: Activity) => void
  onCancel:      () => void
  eventId:       string
  editActivity?: Activity
  knownSubtypeNames: string[]
}) {
  const isEdit = !!editActivity
  const [form,   setForm]   = useState<FormState>(editActivity ? activityToForm(editActivity) : makeEmptyForm())
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [step,   setStep]   = useState<1 | 2>(1)

  // Le menu propose toujours au moins le catalogue par défaut (16 types), complété par
  // les types personnalisés/custom déjà présents dans le profil de l'utilisateur (ex. un
  // sous-type qu'il a créé lui-même). Évite qu'un profil incomplet (ex. import, compte
  // ancien) réduise artificiellement les options disponibles à la création.
  const DEFAULT_TYPE_CATALOG = [
    'Escape Game', 'Musée', 'Restaurant', 'Sport', 'Détente', 'Spectacle', 'Jeux',
    'Cinéma', 'Karaoké', 'Gastronomie', 'Randonnée', 'Visite', 'Atelier', 'Pique-nique', 'Soirée', 'Shopping',
  ]
  const profileTypes = Object.keys(userProfile?.activity_prefs ?? {})
    .filter(t => !knownSubtypeNames.includes(t))
  const allTypes = [...new Set([...DEFAULT_TYPE_CATALOG, ...profileTypes])]

  // ── Autocomplete de sous-type — scopée au type parent choisi ────────────────
  const [subtypeSuggestions, setSubtypeSuggestions] = useState<{ id: string; name: string; isLocal: boolean }[]>([])
  const [subtypeLoading,     setSubtypeLoading]     = useState(false)
  const [subtypeOpen,        setSubtypeOpen]        = useState(false)

  useEffect(() => {
    const parent = form.activity_type
    const q      = form.subtype_query.trim()
    if (!parent || parent === '__custom__' || !subtypeOpen) { setSubtypeSuggestions([]); return }
    const handle = setTimeout(async () => {
      setSubtypeLoading(true)
      try {
        const res  = await fetch(`/api/activity-subtypes?parent=${encodeURIComponent(parent)}&q=${encodeURIComponent(q)}`)
        const json = await res.json()
        setSubtypeSuggestions(json.subtypes ?? [])
      } catch {
        setSubtypeSuggestions([])
      } finally {
        setSubtypeLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [form.activity_type, form.subtype_query, subtypeOpen])

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleDay(dayKey: string, checked: boolean) {
    setForm(f => {
      const hours = { ...f.opening_hours }
      const resolvedTypeNow = f.activity_type === '__custom__' ? normalizeTypeName(f.custom_type) : f.activity_type
      if (checked) {
        hours[dayKey] = isMealType(resolvedTypeNow)
          ? { open: '12:00', close: '23:00' } // full span; refine with "2e service" below
          : { open: '09:00', close: '20:00' }
      } else {
        delete hours[dayKey]
      }
      return { ...f, opening_hours: hours }
    })
  }

  function updateHour(dayKey: string, field: 'open' | 'close', val: string) {
    setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [dayKey]: { ...f.opening_hours[dayKey], [field]: val } } }))
  }

  function toggleBreak(dayKey: string, checked: boolean) {
    setForm(f => {
      const h = { ...f.opening_hours[dayKey] }
      const resolvedTypeNow = f.activity_type === '__custom__' ? normalizeTypeName(f.custom_type) : f.activity_type
      if (checked) {
        if (isMealType(resolvedTypeNow)) {
          // Restaurant: open=lunch start, break_start=lunch end, break_end=dinner start, close=dinner end
          h.open  = h.open  ?? '12:00'
          h.break_start = '14:30'
          h.break_end   = '19:00'
          h.close = h.close ?? '23:00'
        } else {
          h.break_start = '12:00'
          h.break_end   = '14:00'
        }
      } else {
        delete h.break_start; delete h.break_end
      }
      return { ...f, opening_hours: { ...f.opening_hours, [dayKey]: h } }
    })
  }

  function updateBreak(dayKey: string, field: 'break_start' | 'break_end', val: string) {
    setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [dayKey]: { ...f.opening_hours[dayKey], [field]: val } } }))
  }

  async function handleSubmit() {
    const type = form.activity_type === '__custom__'
      ? normalizeTypeName(form.custom_type)
      : form.subtype_selected
      ? form.subtype_selected
      : form.activity_type
    const typeParent = (form.activity_type !== '__custom__' && form.subtype_selected)
      ? form.activity_type
      : null

    // Validation
    if (!form.name.trim())         { setError('Le nom est requis.'); return }
    if (!type)                     { setError('Le type est requis.'); return }
    if (!form.address.trim())      { setError("L'adresse est requise."); return }
    if (form.address_lat === null) { setError("Sélectionnez l'adresse dans la liste pour la géolocaliser."); return }
    if (!form.duration_minutes)    { setError('La durée est requise.'); return }

    setSaving(true); setError(null)

    try {
      const url = isEdit
        ? `/api/events/${eventId}/activities/${editActivity!.id}`
        : `/api/events/${eventId}/activities`

      const res = await fetch(url, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formToBody(form, type, typeParent)),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erreur lors de l\'enregistrement.')
        setSaving(false)
        return
      }
      onSubmit(json.activity)
    } catch (e) {
      setError('Erreur réseau. Vérifiez votre connexion.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: '1.5px solid #E2E8F0', fontSize: 13,
    fontFamily: 'inherit', outline: 'none', color: '#1E293B', background: 'white', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  function ConstraintToggle({ field, label, desc }: { field: keyof FormState; label: string; desc?: string }) {
    const val = form[field] as boolean
    return (
      <div onClick={() => setField(field, !val as FormState[typeof field])}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
          border: `1.5px solid ${val ? '#7C3AED' : '#E2E8F0'}`,
          background: val ? '#F5F3FF' : 'white', cursor: 'pointer',
        }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: val ? '#4C1D95' : '#374151' }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: '#94A3B8' }}>{desc}</div>}
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${val ? '#7C3AED' : '#CBD5E1'}`,
          background: val ? '#7C3AED' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {val && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
        </div>
      </div>
    )
  }

  const resolvedType = form.activity_type === '__custom__'
    ? normalizeTypeName(form.custom_type)
    : form.activity_type
  const isMeal = isMealType(resolvedType)

  const canProceed = form.name.trim()
    && (form.activity_type && form.activity_type !== '__custom__' || (form.activity_type === '__custom__' && form.custom_type.trim()))
    && form.address.trim()
    && form.address_lat !== null
    && form.duration_minutes !== ''

  return (
    <div style={{
      background: 'white', borderRadius: 16, border: '2px solid #DDD6FE',
      padding: '22px 24px', boxShadow: '0 8px 32px rgba(76,29,149,0.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95', margin: 0 }}>
          {isEdit ? 'Modifier l\'activité' : 'Proposer une activité'}
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {([1, 2] as const).map(s => (
            <button key={s} onClick={() => setStep(s)} style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: step === s ? '#4C1D95' : '#EDE9FE',
              color: step === s ? 'white' : '#4C1D95',
            }}>
              {s === 1 ? '① Infos' : '② Contraintes & Horaires'}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom de l'activité *</label>
            <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
              placeholder="Ex : Laser Game Nation, Chez Marie…" maxLength={100} style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Type d'activité *</label>
            <select value={form.activity_type} onChange={e => { setField('activity_type', e.target.value); setField('subtype_query', ''); setField('subtype_selected', '') }}
              style={{ ...inputStyle, background: 'white' }}>
              <option value="">-- Choisissez un type --</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Un type totalement nouveau (rare) se crée depuis votre page Profil, pas ici — pour garder le catalogue cohérent entre tous les participants.
            </p>

            {/* Sous-type — optionnel, précise le type choisi */}
            {form.activity_type && (
              <div style={{ marginTop: 10 }}>
                {!subtypeOpen && !form.subtype_selected && (
                  <button type="button" onClick={() => setSubtypeOpen(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#7C3AED', fontWeight: 600, padding: 0,
                  }}>
                    + Préciser un sous-type (optionnel — ex. "{form.activity_type === 'Restaurant' ? 'Japonais' : 'Karting'}")
                  </button>
                )}

                {form.subtype_selected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#EDE9FE' }}>
                    <span style={{ fontSize: 12, color: '#4C1D95' }}>
                      Sous-type : <strong>{form.subtype_selected}</strong> (de {form.activity_type})
                    </span>
                    <button type="button" onClick={() => { setField('subtype_selected', ''); setField('subtype_query', ''); setSubtypeOpen(false) }}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontSize: 12 }}>
                      ✕
                    </button>
                  </div>
                )}

                {subtypeOpen && !form.subtype_selected && (
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={form.subtype_query}
                      onChange={e => setField('subtype_query', e.target.value)}
                      placeholder={`Rechercher ou créer un sous-type de ${form.activity_type}…`}
                      maxLength={40} autoFocus
                      style={{ ...inputStyle, marginTop: 4 }}
                    />
                    <div style={{
                      marginTop: 4, borderRadius: 10, border: '1px solid #E2E8F0', background: 'white',
                      maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}>
                      {subtypeLoading && (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>Recherche…</div>
                      )}
                      {!subtypeLoading && subtypeSuggestions.map(s => (
                        <button key={s.id} type="button"
                          onClick={() => { setField('subtype_selected', s.name); setSubtypeOpen(false) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                            padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                            borderBottom: '1px solid #F1F5F9',
                          }}>
                          {s.name}
                          {s.isLocal && <span style={{ fontSize: 10, color: '#7C3AED', background: '#EDE9FE', padding: '1px 6px', borderRadius: 6 }}>déjà dans votre profil</span>}
                        </button>
                      ))}
                      {!subtypeLoading && form.subtype_query.trim().length > 0 &&
                        !subtypeSuggestions.some(s => s.name.toLowerCase() === normalizeTypeName(form.subtype_query).toLowerCase()) && (
                        <button type="button"
                          onClick={() => { setField('subtype_selected', normalizeTypeName(form.subtype_query)); setSubtypeOpen(false) }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#166534', fontWeight: 600,
                          }}>
                          + Créer "{normalizeTypeName(form.subtype_query)}" comme nouveau sous-type de {form.activity_type}
                        </button>
                      )}
                      {!subtypeLoading && subtypeSuggestions.length === 0 && form.subtype_query.trim().length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>Tapez pour rechercher un sous-type existant, ou en créer un nouveau.</div>
                      )}
                    </div>
                    <button type="button" onClick={() => { setSubtypeOpen(false); setField('subtype_query', '') }} style={{
                      marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94A3B8',
                    }}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
              Adresse *
              <Tooltip text="Obligatoire — sélectionnez dans la liste pour obtenir les coordonnées GPS, nécessaires au calcul de distance." />
            </label>
            <AddressAutocomplete
              value={form.address} lat={form.address_lat} lng={form.address_lng} required
              onChange={(addr, lat, lng) => { setField('address', addr); setField('address_lat', lat); setField('address_lng', lng) }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Prix par personne (€)</label>
              <input type="number" value={form.cost_per_person} min={0} step={1}
                onChange={e => setField('cost_per_person', e.target.value)}
                placeholder="Ex : 25 (0 = gratuit)" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Durée estimée (min) *</label>
              <input type="number" value={form.duration_minutes} min={15} step={15}
                onChange={e => setField('duration_minutes', e.target.value)}
                placeholder="Ex : 90"
                style={{ ...inputStyle, borderColor: !form.duration_minutes ? '#FCA5A5' : '#E2E8F0' }}
              />
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
              Niveau d'ambiance sociale
              <Tooltip text="1 = calme / intime, 5 = festif / animé" />
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { v: 1, l: '😌 Calme'    },
                { v: 2, l: '🙂 Cosy'     },
                { v: 3, l: '😊 Équilibré'},
                { v: 4, l: '😄 Vivant'   },
                { v: 5, l: '🎉 Festif'   },
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setField('social_level', opt.v)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: form.social_level === opt.v ? '#4C1D95' : '#EDE9FE',
                    color: form.social_level === opt.v ? 'white' : '#4C1D95',
                  }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {/* Horaires */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {isMeal ? 'Horaires de service' : "Horaires d'ouverture"}
              <Tooltip text={isMeal
                ? "Renseignez le service principal. Cochez '2e service' si l'établissement fait aussi le service du soir (ou du midi) séparément."
                : "Facultatif — si non renseigné, l'activité sera considérée disponible toute la journée. Cochez 'Pause' pour ajouter une coupure."
              } />
            </div>
            {isMeal && (
              <p style={{ fontSize: 11, color: '#7C3AED', background: '#F5F3FF', padding: '6px 10px', borderRadius: 7, margin: '0 0 10px' }}>
                🍽️ Mode restaurant — les créneaux représentent les services (ex : midi 12h-14h30, soir 19h-23h).
              </p>
            )}
            {Object.keys(form.opening_hours).length === 0 && (
              <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', margin: '0 0 8px' }}>
                Aucun horaire → disponible toute la journée (pique-nique, randonnée…)
              </p>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {DAY_KEYS.map((key, i) => {
                const h = form.opening_hours[key]
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 44 }}>
                        <input type="checkbox" checked={!!h} onChange={e => toggleDay(key, e.target.checked)}
                          style={{ accentColor: '#7C3AED', width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: h ? '#4C1D95' : '#94A3B8' }}>{DAYS[i]}</span>
                      </label>
                      {h ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                          {isMeal && (
                            <span style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
                              {h.break_start ? '1er service' : 'Service'}
                            </span>
                          )}
                          <input type="time" value={h.open} onChange={e => updateHour(key, 'open', e.target.value)}
                            style={{ fontSize: 13, fontWeight: 600, padding: '5px 8px', borderRadius: 7, border: '1.5px solid #DDD6FE', fontFamily: 'inherit', color: '#4C1D95', background: '#F5F3FF' }}
                          />
                          <span style={{ color: '#94A3B8', fontSize: 12 }}>→</span>
                          <input type="time" value={h.close} onChange={e => updateHour(key, 'close', e.target.value)}
                            style={{ fontSize: 13, fontWeight: 600, padding: '5px 8px', borderRadius: 7, border: '1.5px solid #DDD6FE', fontFamily: 'inherit', color: '#4C1D95', background: '#F5F3FF' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!h.break_start}
                              onChange={e => toggleBreak(key, e.target.checked)}
                              style={{ accentColor: '#F59E0B' }}
                            />
                            <span style={{ fontSize: 11, color: '#64748B' }}>
                              {isMeal ? '2e service' : 'Pause'}
                            </span>
                          </label>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' }}>Fermé</span>
                      )}
                    </div>
                    {h?.break_start && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, marginLeft: 54 }}>
                        <span style={{ fontSize: 11, color: '#92400E' }}>
                          {isMeal ? '2e service :' : 'Fermé de'}
                        </span>
                        <input type="time" value={h.break_start ?? '12:00'} onChange={e => updateBreak(key, 'break_start', e.target.value)}
                          style={{ fontSize: 13, fontWeight: 600, padding: '4px 7px', borderRadius: 7, border: '1.5px solid #FDE68A', fontFamily: 'inherit', color: '#92400E', background: '#FEF9C3' }}
                        />
                        <span style={{ fontSize: 11, color: '#92400E' }}>{isMeal ? '→' : 'à'}</span>
                        <input type="time" value={h.break_end ?? '14:00'} onChange={e => updateBreak(key, 'break_end', e.target.value)}
                          style={{ fontSize: 13, fontWeight: 600, padding: '4px 7px', borderRadius: 7, border: '1.5px solid #FDE68A', fontFamily: 'inherit', color: '#92400E', background: '#FEF9C3' }}
                        />
                        {isMeal && (
                          <span style={{ fontSize: 10, color: '#B45309', fontStyle: 'italic', marginLeft: 4 }}>
                            (fermé entre les deux services)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Contraintes */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Contraintes de l'activité
            <Tooltip text="Cochez uniquement ce qui s'applique. Rien coché = activité sans contrainte particulière." />
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 10px' }}>
            Cochez ce qui POSE un problème — rien par défaut.
          </p>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Mobilité</div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
            <ConstraintToggle field="no_stairs"        label="🪜 Comporte des escaliers / non accessible PMR"  desc="L'accès nécessite des escaliers ou l'accessibilité PMR n'est pas garantie" />
            <ConstraintToggle field="is_intense"        label="🫀 Effort physique intense requis"               desc="Activité physiquement exigeante (cardio, sport intense)" />
            <ConstraintToggle field="is_high_altitude"  label="🧗 En hauteur / risque de vertige"              desc="Accrobranche, escalade, rooftop…" />
            <ConstraintToggle field="is_aquatic"        label="🏊 Activité aquatique"                          desc="Implique de nager ou d'être dans l'eau" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Accompagnement</div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
            <ConstraintToggle field="pets_allowed"      label="🐾 Animaux d'assistance non admis"              desc="Les animaux de service ne sont pas autorisés" />
            <ConstraintToggle field="has_pets"          label="🐱 Animaux présents sur place"                  desc="Bar à chats, ferme pédagogique…" />
            <ConstraintToggle field="kid_ok"            label="👶 Non adapté aux enfants"                      desc="Activité déconseillée ou interdite aux enfants" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Alimentaire</div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
            <ConstraintToggle field="gluten_ok"         label="🌾 Pas d'option sans gluten"                   desc="Aucun menu certifié sans gluten disponible" />
            <ConstraintToggle field="seafood_ok"        label="🦞 Fruits de mer / poissons inévitables"       desc="Pas d'alternative sans crustacés" />
            <ConstraintToggle field="halal_ok"          label="🥩 Pas de viande Halal/Casher"                 desc="Aucune option confessionnelle disponible" />
            <ConstraintToggle field="alcohol_free"      label="🍺 Alcool servi / ambiance bar"                desc="Lieu centré sur l'alcool" />
            <ConstraintToggle field="pregnancy_ok"      label="🤰 Déconseillé grossesse"                      desc="Contre-indications pour femmes enceintes" />
            <ConstraintToggle field="vegan_ok"          label="🌱 Pas d'option vegan"                         desc="Aucune option végane disponible" />
            <ConstraintToggle field="nut_ok"            label="🥜 Présence de noix / allergènes"              desc="Noix servies ou risque de contamination croisée" />
            <ConstraintToggle field="diab_ok"           label="🏥 Pas d'option régime médical"                desc="Aucune option adaptée aux régimes médicaux / diabète" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Environnement</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <ConstraintToggle field="is_loud"           label="🔊 Lieu bruyant / ambiance sonore forte"       desc="Concerts, boîtes, bars bondés…" />
            <ConstraintToggle field="has_strobe"        label="⚡ Effets stroboscopiques"                     desc="Jeux de lumières stroboscopiques" />
            <ConstraintToggle field="smoke_free"        label="🚬 Tabac / vapotage toléré sur place"          desc="Le lieu autorise de fumer à l'intérieur" />
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0',
          background: 'white', color: '#64748B', fontSize: 13, cursor: 'pointer',
        }}>Annuler</button>

        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!canProceed}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: canProceed ? '#4C1D95' : '#E2E8F0',
              color: canProceed ? 'white' : '#94A3B8',
              fontSize: 13, fontWeight: 700,
              cursor: canProceed ? 'pointer' : 'default',
            }}>
            Suivant →
          </button>
        ) : (
          <>
            <button onClick={() => setStep(1)} style={{
              padding: '9px 18px', borderRadius: 9, border: '1.5px solid #DDD6FE',
              background: 'white', color: '#4C1D95', fontSize: 13, cursor: 'pointer',
            }}>← Retour</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: saving ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: saving ? '#94A3B8' : 'white', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
              }}>
              {saving ? 'Enregistrement…' : isEdit ? '✓ Enregistrer les modifications' : "✓ Proposer l'activité"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Modal sync profil ─────────────────────────────────────────────────────────

interface PrefDiff {
  type:      string
  oldVal:    number | null   // null = type absent du profil
  newVal:    number
  isSubtype: boolean         // true si ce type est déjà lui-même un sous-type (pas de subdivision à 3 niveaux)
}

function SyncModal({
  diffs, onConfirm, onClose,
}: {
  diffs:     PrefDiff[]
  onConfirm: (decisions: Record<string, { action: 'update' | 'create_subtype' | 'skip'; subtype?: string }>) => void
  onClose:   () => void
}) {
  const [decisions, setDecisions] = useState<Record<string, { action: 'update' | 'create_subtype' | 'skip'; subtype: string }>>(() =>
    Object.fromEntries(diffs.map(d => [d.type, { action: (d.oldVal === null && !d.isSubtype) ? 'create_subtype' : 'update', subtype: '' }]))
  )

  function setAction(type: string, action: 'update' | 'create_subtype' | 'skip') {
    setDecisions(prev => ({ ...prev, [type]: { ...prev[type], action } }))
  }
  function setSubtype(type: string, val: string) {
    setDecisions(prev => ({ ...prev, [type]: { ...prev[type], subtype: val } }))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '24px 28px',
        maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#4C1D95', margin: '0 0 6px' }}>
          Mettre à jour votre profil ?
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
          Vous avez modifié votre appréciation pour {diffs.length} type{diffs.length > 1 ? 's' : ''}.
          Pour chacun, choisissez quoi faire :
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          {diffs.map(d => {
            const dec = decisions[d.type]
            const optionStyle = (selected: boolean): React.CSSProperties => ({
              display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
              padding: '10px 12px', borderRadius: 9,
              border: `1.5px solid ${selected ? '#7C3AED' : '#E2E8F0'}`,
              background: selected ? '#F5F3FF' : 'white',
            })
            return (
              <div key={d.type} style={{ padding: '14px 16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{d.type}</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {d.oldVal !== null ? `${d.oldVal}%` : '—'} → <strong style={{ color: '#4C1D95' }}>{d.newVal}%</strong>
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={optionStyle(dec.action === 'update')}>
                    <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'update'}
                      onChange={() => setAction(d.type, 'update')} style={{ marginTop: 3 }}
                    />
                    <span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                        {d.oldVal !== null ? `Mettre à jour "${d.type}" → ${d.newVal}%` : `Ajouter "${d.type}" à mon profil → ${d.newVal}%`}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        {d.oldVal !== null ? 'Écrase la valeur existante dans votre profil.' : 'Ajoute cette préférence à votre profil.'}
                      </div>
                    </span>
                  </label>
                  {!d.isSubtype && (
                    <label style={optionStyle(dec.action === 'create_subtype')}>
                      <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'create_subtype'}
                        onChange={() => setAction(d.type, 'create_subtype')} style={{ marginTop: 3 }}
                      />
                      <span style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                          {d.oldVal !== null ? `Créer comme sous-type de "${d.type}"` : `Ajouter au profil comme sous-type de "${d.type}"`}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {d.oldVal !== null
                            ? `Conserve "${d.type}" à ${d.oldVal}%, crée un sous-type distinct à ${d.newVal}%.`
                            : `Enregistré comme sous-type de "${d.type}" à ${d.newVal}%, partagé avec les autres participants.`}
                        </div>
                        {dec.action === 'create_subtype' && (
                          <input type="text"
                            value={dec.subtype}
                            onChange={e => setSubtype(d.type, e.target.value)}
                            placeholder={`Nom du sous-type de ${d.type}`}
                            style={{
                              display: 'block', marginTop: 8, width: '100%',
                              padding: '6px 10px', borderRadius: 8, border: '1.5px solid #DDD6FE',
                              fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#4C1D95',
                              background: 'white', boxSizing: 'border-box',
                            }}
                          />
                        )}
                      </span>
                    </label>
                  )}
                  <label style={optionStyle(dec.action === 'skip')}>
                    <input type="radio" name={`sync-${d.type}`} checked={dec.action === 'skip'}
                      onChange={() => setAction(d.type, 'skip')} style={{ marginTop: 3 }}
                    />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Ne rien changer pour "{d.type}"</div>
                  </label>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0',
            background: 'white', color: '#64748B', fontSize: 13, cursor: 'pointer',
          }}>Ignorer tout</button>
          <button onClick={() => onConfirm(decisions)} style={{
            padding: '9px 22px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>Appliquer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const eventId = params.id

  const [data,          setData]          = useState<PageData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editActivity,  setEditActivity]  = useState<Activity | undefined>(undefined)
  const [closing,       setClosing]       = useState(false)
  const [incompleteProfilesWarning, setIncompleteProfilesWarning] = useState<{ id: string; displayName: string }[] | null>(null)
  const [closeError,    setCloseError]    = useState<string | null>(null)
  const [profileBanner, setProfileBanner] = useState(false)
  const [syncModal,     setSyncModal]     = useState(false)
  const [syncDiffs,     setSyncDiffs]     = useState<PrefDiff[]>([])
  const [syncThenClose, setSyncThenClose] = useState(true)

  // Collect pref changes from all cards
  const localPrefsRef = useRef<Record<string, number>>({})
  const prefDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [prefChangeVersion, setPrefChangeVersion] = useState(0)
  const handlePrefChange = useCallback((type: string, val: number) => {
    localPrefsRef.current[type] = val
    setPrefChangeVersion(v => v + 1)
    // Persiste immédiatement (avec un léger debounce) — pour que CE participant
    // retrouve sa modification même s'il ne clôture jamais lui-même la phase
    // (seul l'organisateur a ce bouton). Sans ça, la modification se perdait
    // silencieusement dès qu'il quittait la page.
    clearTimeout(prefDebounceRef.current[type])
    prefDebounceRef.current[type] = setTimeout(() => {
      fetch(`/api/events/${eventId}/availability`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pref_override_type: type, pref_override_val: val }),
      }).catch(() => {})
    }, 600)
  }, [eventId])

  // Constraint overrides per activity (activityId → { constraintKey: boolean })
  const [allOverrides, setAllOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [myPrefOverrides, setMyPrefOverrides] = useState<Record<string, number>>({})

  const handleOverrideChange = useCallback(async (activityId: string, key: string, val: boolean) => {
    setAllOverrides(prev => ({
      ...prev,
      [activityId]: { ...(prev[activityId] ?? {}), [key]: val },
    }))
    // Persist to availabilities.constraint_overrides — scopé à CETTE activité précisément
    await fetch(`/api/events/${eventId}/availability`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ constraint_override_key: key, constraint_override_val: val, activity_id: activityId }),
    })
  }, [eventId])

  async function load() {
    setLoading(true)
    const res  = await fetch(`/api/events/${eventId}/activities`)
    const json = await res.json()
    if (!res.ok) { setLoading(false); return }
    setData(json as PageData)
    if (!json.userProfile?.onboarding_done && json.event.phase < 4) setProfileBanner(true)
    // Restore saved overrides from availabilities — désormais imbriqué par activité
    // ({ activityId: { constraintKey: bool } }), donc on peut directement l'utiliser
    // tel quel, sans l'étaler artificiellement sur toutes les activités.
    const merged: Record<string, Record<string, boolean>> = {}
    for (const av of (json.userAvailabilities ?? [])) {
      const perActivity = (av.constraint_overrides ?? {}) as Record<string, Record<string, boolean>>
      for (const [activityId, overridesForActivity] of Object.entries(perActivity)) {
        merged[activityId] = { ...(merged[activityId] ?? {}), ...overridesForActivity }
      }
    }
    if (Object.keys(merged).length > 0) setAllOverrides(merged)

    // Restaure les préférences déjà ajustées localement pour cet événement — sans ça,
    // l'ajustement est bien sauvegardé côté serveur mais l'affichage revient au profil
    // permanent au moindre rechargement, donnant l'illusion que rien n'a été retenu.
    const mergedPrefs: Record<string, number> = {}
    for (const av of (json.userAvailabilities ?? [])) {
      Object.assign(mergedPrefs, av.pref_overrides ?? {})
    }
    if (Object.keys(mergedPrefs).length > 0) setMyPrefOverrides(mergedPrefs)
    setLoading(false)
  }

  useEffect(() => { load() }, [eventId])

  function handleActivityUpserted(activity: Activity) {
    setData(d => {
      if (!d) return d
      const exists = d.activities.find(a => a.id === activity.id)
      return {
        ...d,
        activities: exists
          ? d.activities.map(a => a.id === activity.id ? activity : a)
          : [...d.activities, activity],
      }
    })
    setShowForm(false)
    setEditActivity(undefined)
  }

  async function handleDelete(activityId: string) {
    if (!window.confirm('Supprimer cette activité ? Cette action est irréversible.')) return
    const res = await fetch(`/api/events/${eventId}/activities/${activityId}`, { method: 'DELETE' })
    if (res.ok) {
      setData(d => d ? { ...d, activities: d.activities.filter(a => a.id !== activityId) } : d)
    } else {
      const { error } = await res.json()
      alert(error ?? 'Erreur lors de la suppression.')
    }
  }

  function openEdit(activity: Activity) {
    setEditActivity(activity)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openAdd() {
    setEditActivity(undefined)
    setShowForm(true)
  }

  function computePendingDiffs(): PrefDiff[] {
    if (!data) return []
    const profile = data.userProfile
    const diffs: PrefDiff[] = []
    const allPendingPrefs = { ...myPrefOverrides, ...localPrefsRef.current }
    for (const [type, newVal] of Object.entries(allPendingPrefs)) {
      const oldVal = profile?.activity_prefs?.[type] ?? null
      if (oldVal === newVal) continue
      const isSubtype = (data.activities ?? []).some(a => a.type === type && !!a.type_parent)
      diffs.push({ type, oldVal, newVal, isSubtype })
    }
    return diffs
  }

  // Bouton visible par TOUS les participants (pas seulement l'organisateur) — la
  // sauvegarde debouncée existe déjà en tâche de fond, mais un déclenchement explicite
  // évite toute course avec une navigation/rechargement trop rapide pour la laisser aboutir.
  function handleSaveMyPreferences() {
    const diffs = computePendingDiffs()
    if (diffs.length === 0) return
    setSyncDiffs(diffs)
    setSyncThenClose(false)
    setSyncModal(true)
  }

  async function handleClosePhase() {
    if (!data) return

    // Collect pref diffs before closing — fusionne les valeurs restaurées d'une session
    // précédente (myPrefOverrides) avec les éventuels ajustements faits pendant CETTE
    // session (localPrefsRef) ; sans ça, un changement jamais re-touché aujourd'hui
    // mais déjà en attente ne serait jamais proposé à la synchro.
    const diffs = computePendingDiffs()
    if (diffs.length > 0) {
      setSyncDiffs(diffs)
      setSyncThenClose(true)
      setSyncModal(true)
      return
    }
    await doClosePhase()
  }

  async function handleSyncConfirm(decisions: Record<string, { action: 'update' | 'create_subtype' | 'skip'; subtype?: string }>) {
    if (!data?.userProfile) { setSyncModal(false); if (syncThenClose) await doClosePhase(); return }

    const updatedPrefs = { ...data.userProfile.activity_prefs }
    // Seuls les types réellement résolus (update/create_subtype) doivent disparaître
    // des overrides locaux — un type "ignoré" reste une divergence bien réelle avec
    // le profil (déjà persistée côté serveur), pas quelque chose à oublier localement.
    const resolvedTypes = new Set<string>()
    for (const [type, dec] of Object.entries(decisions)) {
      const diff = syncDiffs.find(d => d.type === type)
      if (!diff) continue
      if (dec.action === 'update') {
        updatedPrefs[type] = diff.newVal
        resolvedTypes.add(type)
      } else if (dec.action === 'create_subtype') {
        const subtype = normalizeTypeName(dec.subtype || type)
        updatedPrefs[subtype] = diff.newVal
        // Enregistre réellement dans le catalogue global — le parent est sans
        // ambiguïté le type diffé lui-même (on n'offre pas cette option quand
        // ce type est déjà un sous-type, cf. isSubtype plus haut).
        fetch('/api/activity-subtypes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_type: type, name: subtype }),
        }).catch(() => {})
        resolvedTypes.add(type)
      }
      // 'skip' → rien à résoudre, l'override local reste en place
    }

    await fetch('/api/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data.userProfile, activity_prefs: updatedPrefs }),
    })

    // Reflète immédiatement le nouveau profil localement — sans ça, l'affichage
    // resterait périmé jusqu'au prochain rechargement complet de la page.
    setData(prev => prev ? { ...prev, userProfile: { ...prev.userProfile!, activity_prefs: updatedPrefs } } : prev)
    for (const type of resolvedTypes) delete localPrefsRef.current[type]
    setMyPrefOverrides(prev => {
      const next = { ...prev }
      for (const type of resolvedTypes) delete next[type]
      return next
    })

    setSyncModal(false)
    if (syncThenClose) await doClosePhase()
  }

  async function doClosePhase(force = false) {
    setClosing(true); setCloseError(null)
    const res = await fetch(`/api/events/${eventId}/activities`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_phase2', force }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.needsProfileConfirmation) {
      setIncompleteProfilesWarning(json.incompleteProfiles)
      setClosing(false)
      return
    }
    if (res.ok) {
      setIncompleteProfilesWarning(null)
      router.push(`/event/${eventId}/scenarios`)
    } else {
      setCloseError(json.error ?? 'Erreur lors de la clôture.')
    }
    setClosing(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #DDD6FE', borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14, color: '#64748B' }}>Chargement des activités…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui' }}>
        <p style={{ color: '#991B1B' }}>Événement introuvable ou accès non autorisé.</p>
      </div>
    )
  }

  const { event, activities, userProfile, groupTopTypes, groupConstraintsByActivity, userAvailabilities, participantCount, currentUserId } = data
  const isOrganizer = event.created_by === currentUserId
  const atLimit     = activities.length >= MAX_ACTIVITIES_DEMO
  const canAdd      = !atLimit && event.phase < 4 && !showForm

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
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
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>Activités</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
            background: event.phase >= 4 ? '#DCFCE7' : '#DDD6FE',
            color: event.phase >= 4 ? '#166534' : '#4C1D95',
          }}>
            {event.phase >= 4 ? '✓ Phase clôturée' : event.phase === 3 ? 'Phase 3 — activités ouvertes' : 'Phase 2 — accès anticipé (disponibilités en cours)'}
          </span>
          <button onClick={load} style={{
            padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
            background: 'white', color: '#64748B', fontSize: 12, cursor: 'pointer',
          }}>↻ Actualiser</button>
        </div>
      </nav>

      <main style={{ maxWidth: 740, margin: '0 auto', padding: '28px 20px 100px' }}>

        {/* Bannière profil */}
        {profileBanner && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: '#FEF9C3', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#713F12' }}>📋 Complétez votre profil</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Pour que IRIS prenne en compte vos préférences, remplissez votre profil — 2 minutes.</div>
            </div>
            <Link href="/profile" style={{ padding: '8px 16px', borderRadius: 9, background: '#713F12', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Remplir mon profil
            </Link>
          </div>
        )}

        {/* En-tête */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Activités proposées
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            {activities.length} activité{activities.length !== 1 ? 's' : ''}
            {participantCount > 0 && ` · ${participantCount} participant${participantCount > 1 ? 's' : ''} avec profil`}
            {atLimit && <span style={{ color: '#F59E0B', fontWeight: 600 }}> · Limite {MAX_ACTIVITIES_DEMO} atteinte</span>}
          </p>
        </div>

        {/* Préférences modifiées non encore enregistrées — visible pour tous, pas
            seulement l'organisateur. prefChangeVersion ne sert qu'à forcer le
            réaffichage : localPrefsRef est une ref, elle ne déclenche rien seule. */}
        {prefChangeVersion >= 0 && computePendingDiffs().length > 0 && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 12,
            background: '#FEF3C7', border: '1px solid #FDE68A',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, color: '#92400E' }}>
              💾 Vous avez modifié votre appréciation pour {computePendingDiffs().length} type{computePendingDiffs().length > 1 ? 's' : ''} — pas encore enregistré dans votre profil.
            </span>
            <button onClick={handleSaveMyPreferences} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#D97706', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              Enregistrer mes préférences
            </button>
          </div>
        )}

        {/* Top types groupe */}
        {groupTopTypes.length > 0 && (
          <div style={{ marginBottom: 24, padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              ✨ Types préférés du groupe
              <Tooltip text={`Basé sur les profils de ${participantCount} participant(s).`} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groupTopTypes.map((t, i) => (
                <div key={t.type} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
                  background: i === 0 ? '#4C1D95' : 'white',
                  border: `1.5px solid ${i === 0 ? '#4C1D95' : '#DDD6FE'}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#C4B5FD' : '#64748B' }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? 'white' : '#1E293B' }}>{t.type}</span>
                  <span style={{ fontSize: 11, color: i === 0 ? '#DDD6FE' : '#94A3B8' }}>{Math.round(t.avg)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div style={{ marginBottom: 20 }}>
            <ActivityForm
              userProfile={userProfile}
              eventId={eventId}
              editActivity={editActivity}
              onSubmit={handleActivityUpserted}
              onCancel={() => { setShowForm(false); setEditActivity(undefined) }}
              knownSubtypeNames={data.knownSubtypeNames ?? []}
            />
          </div>
        )}

        {/* Bouton ajouter */}
        {canAdd && (
          <button onClick={openAdd} style={{
            width: '100%', marginBottom: 20, padding: '14px',
            borderRadius: 14, border: '2px dashed #A78BFA', background: '#F5F3FF',
            color: '#4C1D95', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            + Proposer une activité
          </button>
        )}

        {atLimit && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEF9C3', border: '1px solid #FDE68A', fontSize: 12, color: '#713F12' }}>
            Limite de {MAX_ACTIVITIES_DEMO} activités atteinte. L'organisateur peut clôturer la phase.
          </div>
        )}

        {/* Liste */}
        {activities.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: 'white', borderRadius: 14, border: '1px dashed #E2E8F0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Aucune activité proposée pour l'instant</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Soyez le premier à suggérer une idée !</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {activities.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                userProfile={userProfile}
                currentUserId={currentUserId}
                userAvailabilities={userAvailabilities}
                myPrefOverrides={myPrefOverrides}
                groupConstraints={groupConstraintsByActivity[a.id] ?? {}}
                isOrganizer={isOrganizer}
                onEdit={openEdit}
                onPrefChange={handlePrefChange}
                constraintOverrides={allOverrides[a.id] ?? {}}
                onOverrideChange={(key, val) => handleOverrideChange(a.id, key, val)}
                onDelete={handleDelete}
                canDelete={event.phase < 4}
              />
            ))}
          </div>
        )}

        {/* Panel organisateur */}
        {isOrganizer && event.phase < 4 && (
          <div style={{ marginTop: 32, padding: '20px 22px', borderRadius: 14, background: 'white', border: '2px solid #DDD6FE' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95', margin: '0 0 6px' }}>Panel organisateur</h2>
            {event.phase === 2 ? (
              <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 9, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
                  ⏳ La phase Disponibilités doit d'abord être clôturée (page événement) avant de pouvoir clôturer les Activités.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
                Lorsque la liste vous semble complète, clôturez cette phase pour passer aux scénarios (Phase 4).
                Si des participants ont modifié leurs appréciations, une proposition de mise à jour de profil leur sera présentée.
              </p>
            )}
            {activities.length === 0 && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: 12, color: '#92400E' }}>
                ⚠️ Aucune activité proposée — le moteur n'aura rien à calculer.
              </div>
            )}
            {closeError && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
                {closeError}
              </div>
            )}
            {incompleteProfilesWarning && (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 8px', lineHeight: 1.6 }}>
                  ⚠️ {incompleteProfilesWarning.length} participant{incompleteProfilesWarning.length > 1 ? 's' : ''} n'{incompleteProfilesWarning.length > 1 ? 'ont' : 'a'} pas complété son profil ({incompleteProfilesWarning.map(u => u.displayName).join(', ')}) — ses préférences par défaut (neutres) seront utilisées pour le calcul.
                </p>
                <button onClick={() => doClosePhase(true)} disabled={closing} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: closing ? '#E2E8F0' : '#D97706',
                  color: closing ? '#94A3B8' : 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  Clôturer quand même →
                </button>
              </div>
            )}
            <button onClick={handleClosePhase} disabled={closing || event.phase === 2 || activities.length === 0} style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: (closing || event.phase === 2 || activities.length === 0) ? '#E2E8F0' : 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: (closing || event.phase === 2 || activities.length === 0) ? '#94A3B8' : 'white',
              fontSize: 14, fontWeight: 700, cursor: (closing || event.phase === 2 || activities.length === 0) ? 'not-allowed' : 'pointer',
            }}>
              {closing ? 'Clôture en cours…' : '✓ Clôturer la phase Activités → Phase 3'}
            </button>
          </div>
        )}

        {event.phase >= 4 && (
          <div style={{ marginTop: 24, padding: '16px 18px', borderRadius: 12, background: '#DCFCE7', border: '1px solid #BBF7D0', fontSize: 13, color: '#166534', fontWeight: 600 }}>
            ✓ Phase Activités clôturée.{' '}
            <Link href={`/event/${eventId}`} style={{ color: '#166534', textDecoration: 'underline' }}>Retour à l'événement</Link>
          </div>
        )}
      </main>

      {/* Sync modal */}
      {syncModal && (
        <SyncModal diffs={syncDiffs} onConfirm={handleSyncConfirm} onClose={() => { setSyncModal(false); if (syncThenClose) doClosePhase() }} />
      )}

      {/* Feedback */}
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
