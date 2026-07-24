// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NominatimResult {
  place_id:     number
  display_name: string
  lat:          string
  lon:          string
}

interface AddressAutocompleteProps {
  value:     string
  onChange:  (address: string, lat: number | null, lng: number | null) => void
}

export default function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue,   setInputValue]   = useState(value)
  const [suggestions,  setSuggestions]  = useState<NominatimResult[]>([])
  const [open,         setOpen]         = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [confirmed,    setConfirmed]    = useState(!!value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)
  // Dernière valeur émise PAR ce composant (saisie ou sélection) — permet de distinguer
  // un changement de `value` venant du parent (ex. arrivée tardive d'un fetch async, à
  // resynchroniser) d'un changement provoqué par ce composant lui-même (déjà à jour, ne
  // pas re-synchroniser sous peine d'écraser `confirmed` pendant la frappe).
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setInputValue(value)
      setConfirmed(!!value)
    }
  }, [value])

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
    lastEmitted.current = val
    setInputValue(val)
    setConfirmed(false)
    onChange(val, null, null) // reset coords until confirmed
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  function handleSelect(result: NominatimResult) {
    const label = result.display_name
    lastEmitted.current = label
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
