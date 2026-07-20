// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import Link from 'next/link'
import Image from 'next/image';
import { ScienceClientView } from './ScienceClientView';
import ScientificNodeMap from "./ScientificNodeMap";
import CollectiveDecisionIllustration from "./CollectiveDecisionIllustration";
import IrisScientificArchitecture from "./IrisScientificArchitecture"; 

export default async function SciencePage() {
  const dataMock = {}; // Transmis au composant client pour initialiser l'état si besoin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Barre de Navigation */}
       <Navbar user={user} />
      
      <main>
        
        {/* ========================================================
            SECTION 1 : INTRO & ABSTRACT (Le contexte académique)
           ======================================================== */}
        <section className="bg-gradient-to-br from-violet-50 via-white to-violet-50 py-24 px-6">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
              Axiomatique & Modèles
            </div>
            <h1 className="mb-8 text-5xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
              Les Fondements Scientifiques d'IRIS
            </h1>
            <p className="mx-auto max-w-4xl text-xl leading-relaxed text-slate-600">
              IRIS opère à l'intersection de la microéconomie cardinale, de la théorie du choix social et de l'optimisation algorithmique. Découvrez le modèle rigoureux qui sous-tend nos arbitrages collectifs.
            </p>
          </div>
        </section>
        
        <section className="bg-white pb-12 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 md:p-14">
              <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
                Résumé Exécutif
              </div>
              <h2 className="mb-8 text-4xl font-extrabold text-slate-900">
                Abstract
              </h2>
              <div className="space-y-6 text-lg leading-relaxed text-slate-700">
                <p>
                  Les décisions collectives partagées — qu'il s'agisse de la planification d'activités, de choix budgétaires ou d'allocations de ressources — exigent d'arbitrer entre des fonctions d'utilité individuelles hétérogènes, des contraintes dures et des impératifs redistributifs. Les processus empiriques (négociation libre, consensus) ou les scrutins traditionnels uninominaux échouent à capturer l'intensité des préférences et ignorent l'historique des frustrations passées du groupe.
                </p>
                <p>
                  Le protocole IRIS formule ce défi comme un problème d'économie algorithmique distribuée. En s'appuyant sur des profils d'utilité multi-attributs, la plateforme génère un espace combinatoire de scénarios, évalue leur équité géométrique ex-ante par le prisme du <strong>Nash Social Welfare (NSW)</strong>, puis soumet les meilleurs candidats à un scrutin de décision robuste via un <strong>scrutin de Condorcet</strong>.
                </p>
                <p>
                  Les sections qui suivent détaillent successivement les limites des approches classiques, les fondements théoriques mobilisés et leurs propres limites, l'architecture algorithmique qui en résulte, ainsi qu'une analyse comparative de ses apports et de ses compromis face aux méthodes établies.
                </p>
              </div>
            </div>
          </div>
        </section>
        
		{/* ========================================================
			SECTION 2 : L'ILLUSTRATION DU PROBLÈME (Statique)
		   ======================================================== */}
		<section className="bg-white pb-24 px-6">
		  <div className="mx-auto max-w-5xl text-center mb-8">
			<h3 className="text-2xl font-extrabold text-slate-900 mb-2">
			  Visualisation systémique de l'impasse décisionnelle
			</h3>
			<p className="text-slate-600 text-sm max-w-3xl mx-auto leading-relaxed">
			  Figure 1.1 : Modélisation des forces antagonistes en économie de groupe. Sans arbitrage axiomatique, la décision oscille naturellement entre la tyrannie de la majorité (<strong>∑ Uᵢ</strong>), la paralysie du veto (<strong>min Uᵢ</strong>) ou l'effondrement de l'utilité réelle par le biais du juste milieu.
			</p>
		  </div>
		  <div className="mx-auto max-w-5xl">
			<CollectiveDecisionIllustration />
		  </div>
		</section>
        
        {/* ========================================================
            SECTION 3 : ÉTAT DE L'ART ET LIMITES TRADITIONNELLES
           ======================================================== */}
        <section className="bg-gradient-to-br from-violet-50 via-white to-violet-50 py-24 px-6 border-t border-slate-100">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 text-center">
              <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
                Limites Théoriques
              </div>
              <h2 className="mb-6 text-5xl font-extrabold text-slate-900">
                Pourquoi les dynamiques classiques ne suffisent pas
              </h2>
              <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600">
                L'architecture d'IRIS naît de l'identification des failles formelles inhérentes aux méthodes organiques ou mathématiques non couplées.
              </p>
            </div>
            
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Discussion */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">Modèle Organique</div>
                <h3 className="mb-4 text-2xl font-bold text-slate-900">Discussion libre</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  Efficace en micro-comités via l'ajustement mutuel, mais soumise à de forts biais d'asymétrie sociale.
                </p>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 text-green-700">Partage d'informations contextuelles</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">Prime systématique aux profils dominants</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">Explosion de la charge cognitive si N &gt; 5</div>
                </div>
              </div>
              
			{/* Consensus */}
			<div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
			  <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">Modèle Unanime</div>
			  <h3 className="mb-4 text-2xl font-bold text-slate-900">Recherche de Consensus</h3>
			  <p className="mb-6 text-sm leading-relaxed text-slate-600">
				Vise l'absence d'objection plutôt que l'alignement et l'optimisation des utilités positives.
			  </p>
			  <div className="space-y-2 text-xs font-semibold">
				<div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 text-green-700">
				  Forte adhésion et légitimité perçue de l'état final
				</div>
				<div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">
				  Risque élevé de veto bloquant et de paralysie
				</div>
				<div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">
				  Biais du juste milieu : produit des compromis mous et sous-optimaux pour plaire à tout le monde
				</div>
			  </div>
			</div>
              
              {/* Vote majoritaire */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">Modèle Ordinal Pur</div>
                <h3 className="mb-4 text-2xl font-bold text-slate-900">Vote Majoritaire Standard</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  Scrutin efficace à grande échelle mais mathématiquement réducteur pour les choix multi-critères alternatifs.
                </p>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 text-green-700">Complexité algorithmique minimale (O(N))</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">Tyrannie de la majorité absolue (effet 51%)</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-amber-700">Incapable de mesurer ou valoriser l'intensité du bien-être</div>
                </div>
              </div>
            </div>
            
            <div className="mx-auto max-w-7xl w-full mt-16 rounded-3xl border border-violet-100 bg-violet-50/50 p-12">
              <h3 className="mb-4 text-3xl font-extrabold text-slate-900">
                La synthèse axiomatique d'IRIS
              </h3>
              <p className="text-lg leading-relaxed text-slate-700">
                Face à ces écueils, IRIS ne choisit pas entre la démocratie ordinale (le vote) et l'optimisation mathématique quantitative (le calcul de score). Le protocole s'inspire de la <strong>théorie des jeux coopératifs</strong> pour la structuration des compromis mathématiques (au sens de Nash), et de la théorie du choix social pour l'arbitrage final : l'algorithme sous-jacent génère des structures de compromis efficaces au sens de Nash, puis le mécanisme de vote (Condorcet) tranche pour rechercher la stabilité et l'acceptation politique du choix — sans qu'aucun des deux ne garantisse formellement une absence totale d'envie entre participants, seulement une réduction mesurable de l'écart.
              </p>
            </div>
          </div>
        </section>
        
        {/* ========================================================
            SECTION 4 : L'INDEX INTERACTIF ET LE NAVIGATEUR DE THÈSES
            (Le nœud central et les disciplines cliquables)
           ======================================================== */}
        <section className="mx-auto max-w-7xl w-full bg-white py-20 border-t border-b border-slate-100">
          <div className="mx-auto max-w-7xl text-center px-6">
            <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
              Table des Matières Interactive
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">
              Explorez les inspirations d'IRIS
            </h2>
            <p className="text-slate-500 mb-12 max-w-2xl mx-auto text-base">
              Cliquez sur les disciplines phares ou sur les relations vectorielles du graphe ci-dessous pour faire défiler et charger instantanément les justifications scientifiques, théorèmes appliqués et limites associées.
            </p>
            
            {/* Notre superbe carte SVG optimisée */}
            <div className="mx-auto max-w-7xl w-full bg-slate-50 rounded-3xl p-6 border border-slate-200/60 shadow-sm">
              <ScientificNodeMap />
            </div>
          </div>
        </section>
        
        {/* ========================================================
            SECTION 5 : AFFICHAGE DYNAMIQUE DES CONTENUS
            (Mis à jour au clic sur le SVG via le State global)
           ======================================================== */}
        <div className="w-full bg-slate-50">
          <ScienceClientView initialData={dataMock} />
        </div>
		
		{/* ========================================================
            SECTIONS 6 À 10 : ARCHITECTURE, COMPARATIF & RÉFÉRENCES 
           ======================================================== */}
        <IrisScientificArchitecture />
		
		{/* Footer */}
		<Footer />
		
		<ScrollToTop />
		
		{/* À droite : Bouton feedback flottant Tally (Traduit en Tailwind) */}
		  <a 
			href="https://tally.so/r/Y5qxz0" 
			target="_blank" 
			rel="noopener noreferrer"
			className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-purple-700 text-xs md:text-sm font-semibold border border-purple-100 shadow-[0_4px_20px_rgba(76,29,149,0.12)] hover:bg-purple-50 hover:scale-105 hover:shadow-[0_4px_20px_rgba(76,29,149,0.2)] transition-all duration-200 no-underline"
		  >
			Suggestion
		  </a>
        
      </main>
    </div>
  )
}