// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinCodeForm() {
  const [code, setCode] = useState('')
  const router = useRouter()

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean) router.push(`/join/${clean}`)
  }

  return (
    <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Ex : IRIS-4K7X"
        maxLength={9}
        autoCapitalize="characters"
        style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1.5px solid #DDD6FE',
          fontSize: 15,
          fontFamily: 'inherit',
          letterSpacing: '0.08em',
          outline: 'none',
          background: 'white',
          color: '#1E293B',
        }}
      />
      <button
        type="submit"
        disabled={code.trim().length < 4}
        style={{
          padding: '10px 20px',
          borderRadius: 10,
          background: code.trim().length >= 4 ? '#4C1D95' : '#E2E8F0',
          color: code.trim().length >= 4 ? 'white' : '#94A3B8',
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
          cursor: code.trim().length >= 4 ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        Rejoindre
      </button>
    </form>
  )
}
