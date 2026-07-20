// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Vérification session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')


  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
	    <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={32} height={32}/>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#4C1D95', letterSpacing: '-0.02em' }}>
            IRIS
          </span>

        </div>
	    </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>{user.email}</span>
          <Link href="/profile" style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid #E2E8F0', background: 'white',
            color: '#4C1D95', fontSize: 13, fontWeight: 500,
            textDecoration: 'none',
          }}>
            Mon profil
          </Link>
          <form action="/auth/signout" method="POST">
            <button type="submit" style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: 'white',
              color: '#64748B',
              fontSize: 13,
              cursor: 'pointer',
            }}>
              Déconnexion
            </button>
          </form>
        </div>
      </nav>
	  
    <main>
      <h1 style={{ fontSize: 13, color: '#64748B' }}>En cours de rédaction</h1>
    </main>
      
    </div>
  )
}
