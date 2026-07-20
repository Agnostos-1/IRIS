// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

"use client";

import { useEffect, useRef, useState } from "react";
import {
  DISCIPLINES,
  CONNECTIONS,
  IRIS_CONNECTIONS
} from "./ScientificData";

// 1. DICTIONNAIRE D'ICÔNES PREMIUM HIGH DEFINITION (Fidélité maximale et complexité)
const DISCIPLINE_ICONS: Record<string, React.ReactNode> = {
  'social-choice': (
    // Choix social : Urne complexe tridimensionnelle, bulletin bicolore et fente nette
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M4 10h16v10H4z" rx="1.5" />
      <path d="M6 13h12v4H6z" fill="currentColor" fillOpacity="0.1" stroke="none" />
      {/* Enveloppe de vote avec cachet */}
      <path d="M9 10V4h6v6" strokeWidth="2.1" />
      <path d="M9 4l3 2.5 3-2.5" />
      <circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    </g>
  ),
  welfare: (
    // Bien-être social : Cœur bicolore vibrant avec des ondes d'impact
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 21c-4.418 0-8-3.582-8-8 0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.418-3.582 8-8 8z" fill="currentColor" fillOpacity="0.12" stroke="none" />
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.501 5.501 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      {/* Ondes d'impact du bien-être */}
      <path d="M16 11a4 4 0 0 1-8 0" opacity="0.6" />
      <path d="M12 7a8 8 0 0 1 0 8" opacity="0.4" />
    </g>
  ),
  decision: (
    // Théorie de la décision : Cible de décision complexe, réticule bicolore et vecteur de choix optimal renforcé
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      {/* Réticule de visée */}
      <line x1="12" y1="2" x2="12" y2="6" strokeWidth="1.3" />
      <line x1="12" y1="18" x2="12" y2="22" strokeWidth="1.3" />
      <line x1="2" y1="12" x2="6" y2="12" strokeWidth="1.3" />
      <line x1="18" y1="12" x2="22" y2="12" strokeWidth="1.3" />
      {/* Vecteur de choix optimal traversant la cible */}
      <path d="M3 3l6.5 6.5" strokeWidth="2.3" />
      <path d="M9.5 6.5v3H6.5" />
    </g>
  ),
  'collective-intelligence': (
    // Intelligence collective : Réseau de neurones distribué complexe (N=12 nœuds satellites convergeant vers le centre)
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Cœur de convergence haute opacité */}
      <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.3" stroke="none" />
      {/* Nœuds satellites colorés pleins (N=6 principaux visibles dans le set filaire) */}
      <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="21" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="21" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="3" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="3" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Maillage complet des liens convergents (Style bicolore complexe) */}
      <path d="M12 3v9M12 12l9-4.5M12 12l9 4.5M12 21v-9M12 12L3 16.5M12 12L3 7.5" strokeOpacity="0.4" />
      <path d="M12 3l9 4.5 0 9 -9 4.5 -9 -4.5 0 -9 9 -4.5z" strokeOpacity="0.15" />
    </g>
  ),
  fairness: (
	// Équité algorithmique : Une vraie balance géométrique, épurée, équilibrée et sans kanji impromptu !
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Socle et pilier central */}
      <line x1="12" y1="4" x2="12" y2="19" strokeWidth="2" />
      <line x1="8" y1="19" x2="16" y2="19" strokeWidth="1.8" />
      {/* Fléau principal horizontal */}
      <line x1="4" y1="7" x2="20" y2="7" strokeWidth="2" />
      {/* Plateau Gauche */}
      <path d="M4 7l-2 6h4z" fill="currentColor" fillOpacity="0.15" />
      {/* Plateau Droit */}
      <path d="M20 7l-2 6h4z" fill="currentColor" fillOpacity="0.15" />
    </g>
  )
};

export default function ScientificNodeMap() {  
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 520 });
    
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      setDims({ w: rect.width || 900, h: rect.height || 520 });
    });
    if (svgRef.current?.parentElement) {
      observer.observe(svgRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  const getPosition = (xPct: number, yPct: number) => ({
    x: (xPct / 100) * dims.w,
    y: (yPct / 100) * dims.h
  });

  const getDiscipline = (id: string) => {
    const found = DISCIPLINES.find((d) => d.id === id);
    return found || { id, title: "", shortTitle: "", x: 0, y: 0, color: "#7c3aed", bg: "#f5f3ff", description: "", foundations: [], irisContributions: [], limitations: [] };
  };
    
  const centerX = dims.w / 2;
  const centerY = dims.h / 2;
  
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
      
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-violet-700">Carte interactive</div>
            <h3 className="text-xl font-bold text-slate-900">Les fondements scientifiques d’IRIS</h3>
            <p className="text-sm text-slate-500 mt-1">Survolez chaque discipline pour découvrir sa contribution au modèle.</p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
            <span>● Discipline</span>
            <span>— Contribution IRIS</span>
            <span>⋯ Relation interdisciplinaire</span>
          </div>
        </div>

        <div className="p-8 relative" style={{ height: 750 }}>
          <div className="relative rounded-3xl border border-slate-200 bg-white overflow-hidden min-h-[700px]">
            <svg ref={svgRef} className="absolute inset-0 h-full w-full">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#C4B5FD" />
                </marker>
              </defs>
              
              {/* 1. RELATIONS INTERDISCIPLINAIRES */}
              {CONNECTIONS.map((conn, idx) => {
                const from = getDiscipline(conn.from);
                const to = getDiscipline(conn.to);
                const fp = getPosition(from.x, from.y);
                const tp = getPosition(to.x, to.y);
                const isActive = hovered === conn.from || hovered === conn.to;

                return (
                  <g key={`conn-${idx}`}>
                    <line
                      x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                      stroke={isActive ? "#7c3aed" : "#d4cdf4"}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={isActive ? "none" : "5 4"}
                      opacity={isActive ? 1 : 0.75}
                    />
                    
                    {isActive && conn.label && (() => {
                      const midX = (fp.x + tp.x) / 2;
                      const midY = (fp.y + tp.y) / 2;
                      const oX = (conn as any).offsetX || 0;
                      const oY = (conn as any).offsetY || 0;

                      let textX = midX + oX;
                      let textY = midY + oY;

                      if (oX === 0 && oY === 0) {
                        if (conn.to === "decision" || conn.to === "central") {
                          textX = fp.x + (tp.x - fp.x) * 0.38;
                          textY = fp.y + (tp.y - fp.y) * 0.38;
                        } else if (conn.from === "decision" || conn.from === "central") {
                          textX = fp.x + (tp.x - fp.x) * 0.62;
                          textY = fp.y + (tp.y - fp.y) * 0.62;
                        }
                      }

                      const lines = conn.label.split('\n');
                      const maxLineLength = Math.max(...lines.map(l => l.length));
                      const rectWidth = maxLineLength * 6 + 16;
                      const rectHeight = lines.length * 13 + 10;

                      return (
                        <g style={{ cursor: 'pointer' }}>
                          <rect
                            x={textX - rectWidth / 2} y={textY - rectHeight / 2}
                            width={rectWidth} height={rectHeight} rx={8} ry={8}
                            fill="#ffffff" stroke="#7c3aed" strokeWidth="1"
                            style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.05))" }}
                          />
                          <text x={textX} y={textY} textAnchor="middle" dominantBaseline="central" fill="#7c3aed" style={{ fontSize: "10px", fontWeight: 600 }}>
                            {lines.map((line: string, index: number) => (
                              <tspan key={index} x={textX} dy={index === 0 ? -((lines.length - 1) * 13) / 2 : 13}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
              
              {/* 2. LIENS VERS LE CENTRE IRIS */}
              {DISCIPLINES.map((discipline) => {
                const pos = getPosition(discipline.x, discipline.y);
                const contributionX = (pos.x + centerX) / 2;
                const contributionY = (pos.y + centerY) / 2;
                const active = hovered === discipline.id;

                return (
                  <g key={`iris-link-${discipline.id}`}>
                    <line
                      x1={pos.x} y1={pos.y} x2={centerX} y2={centerY}
                      stroke={active ? discipline.color : "#E9D5FF"}
                      strokeWidth={active ? 2 : 1}
                      style={{ transition: "all .3s ease" }}
                    />
                    {active && (() => {
                      const conn = IRIS_CONNECTIONS.find(c => c.discipline === discipline.id)
                      return conn && (
                        <text x={contributionX} y={contributionY - 6} textAnchor="middle" fill="#6d28d9" style={{ fontSize: "10px", fontWeight: 600 }}>
                          {conn.label}
                        </text>
                      )
                    })()}
                  </g>
                );
              })}

              {/* 3. LE NOEUD CENTRAL IRIS */}
              <g
			  style={{ cursor: "pointer" }}
			  onClick={() => {
				window.dispatchEvent(
				  new CustomEvent("scientific-node-click", {
					detail: { id: "iris-core" } // Identifiant spécifique pour le cœur d'IRIS
				  })
				);
			  }}
			  >
                <circle cx={centerX} cy={centerY} r={75} fill="#fdfaff" />
                <circle cx={centerX} cy={centerY} r={75} fill="none" stroke="#6d28d9" strokeWidth="2.5" />
                <image href="/iris-logo_transparent.png" x={centerX - 24} y={centerY - 65} width="48" height="48" />
                <text x={centerX} y={centerY - 2} textAnchor="middle" fill="#6d28d9" style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.5px" }}>
                  Plateforme de Décision
                </text>
                <line x1={centerX - 25} y1={centerY + 5} x2={centerX + 25} y2={centerY + 5} stroke="#e9d5ff" strokeWidth="1" />
                <text x={centerX} y={centerY + 22} textAnchor="middle" fill="#4c1d95" style={{ fontSize: "10px", fontWeight: 600, opacity: 0.9 }}>
                  <tspan x={centerX} dy="0">Agrège • Évalue</tspan>
                  <tspan x={centerX} dy="15">Équilibre • Apprend</tspan>
                  <tspan x={centerX} dy="15">Décide</tspan>
                </text>
              </g>

			{/* 4. LES BULLES DES DISCIPLINES AVEC LES NOUVELLES ICÔNES HIGH DEFINITION */}
			{DISCIPLINES.map((discipline) => {
			  const pos = getPosition(discipline.x, discipline.y);
			  const active = hovered === discipline.id;
			  const iconRender = DISCIPLINE_ICONS[discipline.id];

			  return (
				<g
				  key={discipline.id}
				  style={{ cursor: "pointer" }}
				  onMouseEnter={() => setHovered(discipline.id)}
				  onMouseLeave={() => setHovered(null)}
				  // L'attribut onClick se place obligatoirement ICI, sur la balise ouvrante du groupe <g>
				  onClick={() => {
					window.dispatchEvent(
					  new CustomEvent("scientific-node-click", {
						detail: { id: discipline.id } // syntaxe objet corrigée ({ id: '...' })
					  })
					);
				  }}
				>
				  <circle
					cx={pos.x}
					cy={pos.y}
					r={active ? 55 : 48}
					fill={discipline.bg}
					stroke={discipline.color}
					strokeWidth={active ? 3 : 2}
					style={{ transition: "all .25s ease" }}
				  />

				  {/* Injection de l'icône premium bicolore HD */}
				  {iconRender && (
					<g
					  transform={`translate(${pos.x - 12}, ${pos.y - (active ? 34 : 30)})`}
					  style={{ color: discipline.color }}
					>
					  <svg viewBox="0 0 24 24" width="24" height="24">
						{iconRender}
					  </svg>
					</g>
				  )}

				  {/* Positionnement intelligent des textes sous l'icône */}
				  {discipline.shortTitle ? (
					discipline.shortTitle.split("\n").map((line, i, arr) => (
					  <text
						key={i}
						x={pos.x}
						y={pos.y + i * 12 + (active ? 12 : 10)}
						textAnchor="middle"
						fill={discipline.color}
						fontSize="10"
						fontWeight="700"
					  >
						{line}
					  </text>
					))
				  ) : (
					<text
					  x={pos.x}
					  y={pos.y + (active ? 14 : 12)}
					  textAnchor="middle"
					  fill={discipline.color}
					  fontSize="10"
					  fontWeight="700"
					>
					  {discipline.title}
					</text>
				  )}
				</g>
			  );
			})}
            </svg>
          </div>  
        </div>
      </div>
    
      {/* 5. PANNEAU DE DESCRIPTION DYNAMIQUE AVEC L'ICÔNE ACCENTUÉE */} 
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sticky top-8 min-h-[420px]">
        {hovered ? (
          (() => {
            const discipline = getDiscipline(hovered);
            const iconRender = DISCIPLINE_ICONS[discipline.id];

            return (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {iconRender && (
                    <div 
                      className="p-2.5 rounded-xl flex items-center justify-center w-11 h-11 shadow-sm border border-slate-100 transition-all"
                      style={{ background: discipline.bg, color: discipline.color }}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6">
                        {iconRender}
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: discipline.color }}>
                      Discipline scientifique
                    </div>
                    <h3 className="text-xl font-extrabold leading-tight" style={{ color: discipline.color }}>
                      {discipline.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {discipline.description}
                </p>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: discipline.color }}>
                    Fondements scientifiques
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discipline.foundations.map((item) => (
                      <span key={item} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: discipline.bg, color: discipline.color }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: discipline.color }}>
                    Contribution à IRIS
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discipline.irisContributions?.map((item) => (
                      <span key={item} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: discipline.bg, color: discipline.color }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: discipline.color }}>
                    Limites connues
                  </div>
                  <ul className="space-y-2">
                    {discipline.limitations?.map((item) => (
                      <li key={item} className="text-sm text-slate-600 flex items-start gap-1.5">
                        <span style={{ color: discipline.color }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            );
          })()
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Explorer le modèle</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Survolez une discipline du diagramme pour découvrir ses fondements scientifiques, ses limites et la façon dont elle contribue à l'algorithme IRIS.
              </p>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}