// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

export default function CopyInviteLink({ code }: { code: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/join/group/${code}`)
  }

  return (
    <div style={{
      marginTop: 12, padding: '12px 14px', borderRadius: 10,
      background: '#F5F3FF', border: '1px solid #DDD6FE',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#4C1D95', marginBottom: 6 }}>
        🔗 Lien d'invitation au groupe
      </div>
      <div style={{
        fontSize: 11, fontFamily: 'monospace', color: '#374151',
        background: 'white', padding: '6px 10px', borderRadius: 7,
        border: '1px solid #E2E8F0', wordBreak: 'break-all', marginBottom: 8,
      }}>
        /join/group/{code}
      </div>
      <button onClick={handleCopy} style={{
        padding: '5px 12px', borderRadius: 7, border: 'none',
        background: '#4C1D95', color: 'white', fontSize: 11,
        fontWeight: 600, cursor: 'pointer',
      }}>
        Copier le lien
      </button>
    </div>
  )
}
