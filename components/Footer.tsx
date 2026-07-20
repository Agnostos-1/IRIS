// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 px-6 pt-20 pb-10">
      <div className="max-w-6xl mx-auto">
        
        {/* GRILLE PRINCIPALE (1 colonne sur mobile, 2 sur tablette, 4 sur desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          
          {/* Section 1 : Présentation */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
			  <Link href="/" className="flex items-center gap-2 group no-underline">
				  <Image
					src="/iris-logo_transparent.png"
					alt="IRIS"
					width={48}
					height={48}
				  />
			  </Link>
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  IRIS
                </h2>
                <p className="text-sm text-slate-400 font-medium">
                  Organiser, comparer, décider ensemble.
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Démonstrateur public consacré à l'exploration des méthodes de décision collective, 
              du vote par préférences et de l'équité dans les choix de groupe.
            </p>
          </div>

          {/* Section 2 : Projet */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">
              Projet
            </h3>
            <div className="flex flex-col gap-3">
              <Link href="/methode" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                Méthode
              </Link>
              <Link href="/science" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                Fondements scientifiques
              </Link>
              <Link href="/roadmap" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                Feuille de route
              </Link>
              <Link href="/a-propos" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                À propos
              </Link>
            </div>
          </div>

          {/* Section 3 : Démonstration */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">
              Démonstration
            </h3>
            <div className="flex flex-col gap-3">
              <Link href="/auth/login" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                Tester la démo
              </Link>
              <Link href="/auth/login" className="text-slate-400 text-sm hover:text-purple-400 transition duration-200 no-underline">
                Se connecter
              </Link>
            </div>
          </div>

          {/* Section 4 : État du projet */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">
              État du projet
            </h3>
            <div className="flex flex-col gap-3 text-slate-400 text-sm leading-relaxed font-medium">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Démonstrateur public
              </span>
              <span>Développement actif</span>
              <span>Version évolutive</span>
            </div>
          </div>

        </div>

        {/* SÉPARATEUR */}
        <div className="h-px bg-white/5 mb-8" />

        {/* BAS DE FOOTER */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 text-xs md:text-sm">
        <div>
		  © {new Date().getFullYear()} IRIS · <Link href="https://github.com/Agnostos-1/IRIS" style={{ color: 'inherit', textDecoration: 'underline' }}>Code source (AGPLv3)</Link>
		</div>
          <div className="font-mono text-[11px] tracking-wider uppercase opacity-80">
            Inclusive Rational Interaction System
          </div>
        </div>

      </div>
    </footer>
  )
}