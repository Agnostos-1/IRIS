// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'

export default async function AProposPage() {
  // Récupération de l'utilisateur pour la Navbar dynamique
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      <div>
        {/* Barre de navigation unifiée */}
        <Navbar user={user} />

        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-20 px-6 bg-gradient-to-b from-purple-50/50 via-white to-slate-50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
            <div className="absolute top-12 left-10 w-72 h-72 bg-purple-300 rounded-full blur-3xl" />
            <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-200 rounded-full blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100/80 px-3 py-1 rounded-full mb-4">
              À propos d'IRIS
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight mb-6 leading-tight">
              Donner un nouveau souffle à la{' '}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                décision collective
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-slate-600">
              IRIS est un démonstrateur public indépendant conçu pour explorer, modéliser et simplifier l'application des mathématiques sociales dans les choix du quotidien.
            </p>
          </div>
        </section>

        {/* SECTION NOTRE MISSION */}
        <section className="py-16 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
                Pourquoi IRIS ?
              </h2>
              <div className="space-y-4 text-slate-600 text-base leading-relaxed">
                <p>
                  Qu'il s'agisse de départager des orientations stratégiques en entreprise, de prioriser des budgets au sein d'une collectivité, ou simplement de choisir un projet en groupe, le vote classique (majoritaire à un tour) montre vite ses limites. Il polarise, engendre de la frustration et échoue souvent à refléter le réel consensus.
                </p>
                <p>
                  <strong>IRIS</strong> (<em>Inclusive Rational Interaction System</em>) est né d'une conviction simple : les algorithmes et la théorie du choix social apportent des réponses concrètes à ces blocages. En permettant d'exprimer des nuances et des préférences ordonnées, IRIS transforme les confrontations en choix partagés et rationnels.
                </p>
              </div>
            </div>
            
            {/* Box d'illustration conceptuelle en pur CSS */}
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-600/20 rounded-full blur-2xl group-hover:bg-purple-600/30 transition duration-500" />
              <div className="text-xs uppercase font-bold tracking-widest text-purple-400 mb-2">Notre crédo</div>
              <div className="text-xl font-bold mb-4 leading-snug">« Sortir du paradigme de la majorité absolue pour concevoir l’équité de groupe. »</div>
              <div className="h-px bg-white/10 my-4" />
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  Inclusivité des opinions minoritaires
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  Rationalité mathématique documentée et assumée
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  Choix de conception explicites plutôt que dissimulés
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION LES TROIS PILIERS */}
        <section className="bg-slate-100 py-20 px-6 border-y border-slate-200">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                Les valeurs du projet
              </h2>
              <p className="text-slate-500 text-sm md:text-base">
                IRIS se développe autour de trois piliers fondamentaux garantissant l'éthique de la plateforme.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pilier 1 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-6 text-lg">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Science ouverte</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Aucun algorithme caché. Les méthodes d'agrégation qu'IRIS implémente (Condorcet, Borda) sont{' '}
                  <Link href="/science" className="text-purple-700 font-semibold hover:underline">
                    documentées en détail sur la page Science
                  </Link>
                  , avec leurs fondements comme leurs limites reconnues.
                </p>
              </div>

              {/* Pilier 2 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-6 text-lg">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Démonstrateur Public</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  IRIS n'est pas une plateforme commerciale de sondage. C'est un espace d'expérimentation gratuit, neutre et accessible à tous pour faire avancer la culture de la décision numérique.
                </p>
              </div>

              {/* Pilier 3 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-6 text-lg">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Confidentialité native</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Le respect des opinions commence par le respect des données. IRIS minimise la collecte de données personnelles et s'engage à la transparence du traitement de vos scrutins.
                </p>
              </div>
            </div>
          </div>
        </section>

		{/* SECTION FOOTNOTE / CONTACT (Mise à jour avec Tally inclus) */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Vous souhaitez contribuer ou échanger ?
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto mb-8 text-sm md:text-base leading-relaxed">
            Le projet est en développement actif (version bêta). Si vous êtes chercheur, développeur ou simplement curieux d'intégrer IRIS dans votre organisation, partagez vos idées ou contactez-nous directement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/roadmap"
              className="inline-flex items-center text-sm font-semibold bg-white border border-slate-200 hover:border-purple-200 text-slate-700 hover:text-purple-700 px-5 py-2.5 rounded-xl shadow-sm transition duration-200 no-underline"
            >
              Consulter la Feuille de Route
            </Link>
            {/* Rappel du lien Tally fixe ici */}
            <a
              href="https://tally.so/r/Y5qxz0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 px-5 py-2.5 rounded-xl shadow-sm border border-purple-100 transition duration-200 no-underline"
            >
              Soumettre une idée
            </a>
          </div>
        </section>
      </div>

      {/* Footer unifié */}
      <Footer />

      {/* ========================================================
          LES COMPOSANTS FLOTTANTS DE BAS DE PAGE
         ======================================================== */}

      {/* À gauche : Bouton de retour en haut de page dynamique */}
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
    </div>
  )
}
