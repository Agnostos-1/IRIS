// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

"use client" // Obligatoire pour utiliser usePathname()

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface NavbarProps {
  user: any // Objet user récupéré côté serveur et passé au composant
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-purple-500/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
      
      {/* BLOC GAUCHE : Logo + Liens alignés à gauche */}
      <div className="flex items-center gap-10 md:gap-12">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group no-underline">
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28} className="transition group-hover:scale-105" />
          <span className="text-xl md:text-2xl font-black text-purple-900 tracking-tight">IRIS</span>
          <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-bold">bêta</span>
        </Link>
        
        {/* NAVIGATION CENTRALE (Désormais à gauche à côté du logo) */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* LIEN MÉTHODE */}
          <Link 
            href="/methode" 
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition duration-200 no-underline ${
              pathname === '/methode'
                ? 'text-purple-600 bg-purple-50 pointer-events-none' // Style Actif (Désactive le clic)
                : 'text-slate-600 hover:text-purple-700 hover:bg-slate-50' // Style Inactif
            }`}
          >
            Méthode
          </Link>
          
          {/* LIEN SCIENCE */}
          <Link 
            href="/science" 
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition duration-200 no-underline ${
              pathname === '/science'
                ? 'text-purple-600 bg-purple-50 pointer-events-none' // Style Actif (Désactive le clic)
                : 'text-slate-600 hover:text-purple-700 hover:bg-slate-50' // Style Inactif
            }`}
          >
            Science
          </Link>

        </div>
      </div>

      {/* CTA DROITE */}
      <div>
        {user ? (
          <Link href="/dashboard" className="inline-flex items-center text-sm font-bold bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white px-5 py-2 rounded-xl shadow-sm hover:shadow-md transition duration-200 no-underline">
            Mon dashboard →
          </Link>
        ) : (
          <Link href="/auth/login" className="inline-flex items-center text-sm font-semibold bg-white border-2 border-purple-100 hover:border-purple-200 text-purple-900 px-5 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition duration-200 no-underline">
            Se connecter
          </Link>
        )}
      </div>

    </nav>
  )
}