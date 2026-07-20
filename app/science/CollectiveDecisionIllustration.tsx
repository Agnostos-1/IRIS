// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React from 'react';

export default function CollectiveDecisionIllustration() {
  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center">
      
      {/* Conteneur du SVG responsive */}
      <div className="w-full max-w-3xl aspect-[16/10]">
        <svg 
          viewBox="0 0 800 480" 
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Définition des flèches et filtres */}
          <defs>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3B82F6" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
            </marker>
            <filter id="blur-gate" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          {/* ========================================================
              1. LE CADRE DES CONTRAINTES DURES
             ======================================================== */}
          <rect 
            x="60" y="40" width="680" height="380" rx="24" 
            fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 6" 
          />
          <text x="80" y="65" fill="#94A3B8" fontSize="12" fontWeight="700" letterSpacing="0.05em">
            C : ESPACE DES CONTRAINTES (DISPONIBILITÉS ∩ BUDGETS COERCITIFS)
          </text>

          {/* ========================================================
              2. LES AGENTS ET LEURS LIGNES DE TENSION
             ======================================================== */}
          
          {/* Agent 1 (Haut Gauche) */}
          <g transform="translate(130, 110)">
            <circle cx="0" cy="0" r="16" fill="#F3E8FF" stroke="#A78BFA" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill="#6D28D9" fontSize="11" fontWeight="bold">A₁</text>
            <text x="24" y="-4" fill="#475569" fontSize="11" fontWeight="bold">Alice</text>
            <text x="24" y="10" fill="#64748B" fontSize="10">Budget &lt; 20€</text>
            <line x1="16" y1="16" x2="230" y2="120" stroke="#C084FC" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>

          {/* Agent 2 (Bas Gauche) */}
          <g transform="translate(130, 350)">
            <circle cx="0" cy="0" r="16" fill="#F3E8FF" stroke="#A78BFA" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill="#6D28D9" fontSize="11" fontWeight="bold">A₂</text>
            <text x="24" y="-4" fill="#475569" fontSize="11" fontWeight="bold">Bob</text>
            <text x="24" y="10" fill="#64748B" fontSize="10">Dispo Dimanche unique</text>
            <line x1="16" y1="-16" x2="230" y2="-120" stroke="#C084FC" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>

          {/* Agent 3 (Haut Droite) */}
          <g transform="translate(650, 110)">
            <circle cx="0" cy="0" r="16" fill="#F3E8FF" stroke="#A78BFA" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill="#6D28D9" fontSize="11" fontWeight="bold">A₃</text>
            <text x="-75" y="-4" fill="#475569" fontSize="11" fontWeight="bold">Claire</text>
            <text x="-105" y="10" fill="#64748B" fontSize="10">Exigence : Culturel</text>
            <line x1="-16" y1="16" x2="-250" y2="120" stroke="#C084FC" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>

          {/* ========================================================
              3. LES GRANDS VECTEURS DE THÉORIES ÉCONOMIQUES
             ======================================================== */}
          
          {/* Vecteur Utilitariste Pur (Maximiser la Somme) */}
          <path 
            d="M 380 230 L 540 140" 
            fill="none" stroke="#3B82F6" strokeWidth="3" markerEnd="url(#arrow-blue)" 
          />
          <g transform="translate(555, 120)">
            <rect x="0" y="10" width="165" height="42" rx="8" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
            <text x="12" y="28" fill="#1E40AF" fontSize="10" fontWeight="bold">APPROCHE UTILITARISTE</text>
            <text x="12" y="42" fill="#2563EB" fontSize="11" fontWeight="600">Max ∑ Uᵢ (Tyrannie du 51%)</text>
          </g>

          {/* Vecteur Égalitariste / Rawlsien Extrême (Maximin) */}
          <path 
            d="M 380 230 L 270 160" 
            fill="none" stroke="#F59E0B" strokeWidth="3" markerEnd="url(#arrow-amber)" 
          />
          <g transform="translate(90, 155)">
            <rect x="0" y="0" width="165" height="42" rx="8" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1" />
            <text x="12" y="18" fill="#92400E" fontSize="10" fontWeight="bold">APPROCHE RAWLSIENNE</text>
            <text x="12" y="32" fill="#D97706" fontSize="11" fontWeight="600">Max min Uᵢ (Paralysie Veto)</text>
          </g>

          {/* ========================================================
              4. LE NŒUD DE FRUSTATION CENTRAL (L'impasse)
             ======================================================== */}
          
          {/* Zone de brouillard au centre */}
          <circle cx="380" cy="230" r="55" fill="#EF4444" fillOpacity="0.08" filter="url(#blur-gate)" />
          
          {/* Lignes de friction au centre */}
          <path d="M 350 210 Q 380 250 410 210 T 430 240" fill="none" stroke="#EF4444" strokeWidth="2" strokeOpacity="0.35" />
          <path d="M 345 240 Q 385 200 405 250" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.35" />

          {/* Le Point Mort du Consensus */}
          <circle cx="380" cy="230" r="7" fill="#EF4444" />
          
          {/* Bulle descriptive du Biais du juste milieu */}
          <g transform="translate(280, 260)">
            <rect x="0" y="0" width="200" height="56" rx="12" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="1.5" />
            <text x="14" y="20" fill="#991B1B" fontSize="11" fontWeight="bold">ZONE D'IMPASSE DU CONSENSUS</text>
            <text x="14" y="34" fill="#DC2626" fontSize="10" fontWeight="600">• Biais du juste milieu (Compromis mou)</text>
            <text x="14" y="46" fill="#DC2626" fontSize="10" fontWeight="600">• Effondrement de l'utilité globale</text>
          </g>

          {/* Sous-titre interne explicatif */}
          <text x="380" y="445" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="500" fontStyle="italic">
            Modélisation vectorielle : tiraillement des utilités individuelles Uᵢ.
          </text>

        </svg>
      </div>

      {/* Légende descriptive sous le SVG */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6 max-w-3xl w-full text-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Utilitarisme (∑ Uᵢ)</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Favorise la masse globale mais peut créer des minorités totalement sacrifiées ou frustrées.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Rawlsien (min Uᵢ)</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            S'aligne exclusivement sur le membre le plus insatisfait, menant souvent à l'immobilisme ou au veto.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Juste Milieu</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Choix tiède adopté par dépit. Personne ne proteste mais l'utilité réelle et l'enthousiasme sont proches de zéro.
          </p>
        </div>
      </div>

    </div>
  );
}