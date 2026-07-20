// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'

export default async function RoadmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Le tableau des données qui manquait à l'appel !
  const horizons = [
    {
      title: "Horizon 1 : En cours",
      description: "Optimisations algorithmiques fondamentales, stabilisation de l'infrastructure et intégration des premiers retours utilisateurs.",
      items: [
        { name: "Ajustement de la mémoire historique", desc: "Passer d'une fenêtre fixe de 3 événements à une moyenne pondérée exponentielle décroissante pour lisser la compensation.", tag: "Algorithme", difficulty: "Moyen" },
        { name: "Assouplissement des filtres de contraintes", desc: "Conditionner l'activation du filtre dur à un seuil minimal de probabilité de présence de l'utilisateur.", tag: "Algorithme", difficulty: "Moyen" },
        { name: "Pré-filtrage topologique et budgétaire", desc: "Intégrer des filtres géographiques et financiers en amont de la phase de combinaison pour éviter l'asphyxie algorithmique.", tag: "Performance", difficulty: "Avancé" },
        { name: "Système de notifications & Emails", desc: "Mise en place des alertes de création et de clôture des scrutins (en attente de configuration de domaine).", tag: "Infra", difficulty: "Facile" },
        { name: "Intégration continue des suggestions", desc: "Traitement et priorisation des retours formulés par les bêta-testeurs via le module de feedback.", tag: "UX/UI", difficulty: "Facile" },
      ]
    },
    {
      title: "Horizon 2 : Prochainement",
      description: "Amélioration de l'expérience utilisateur globale, connexions aux APIs du monde réel et enrichissement visuel.",
      items: [
        { name: "Question Engine (Swipe UI)", desc: "Système de questions scénarisées sous forme de cartes à swiper pour remplir dynamiquement le profil d'utilité des utilisateurs.", tag: "UX/UI", difficulty: "Avancé" },
        { name: "Import d'activités via Google API", desc: "Géolocalisation automatique et récupération des lieux (restaurants, cinémas) avec intégration des horaires réels.", tag: "API", difficulty: "Moyen" },
        { name: "Modélisation de la Variabilité Endogène", desc: "Introduction d'un facteur d'exploration contrôlé pour éviter l'enfermement des groupes dans des typologies d'activités redondantes.", tag: "Algorithme", difficulty: "Expert" },
        { name: "Refonte de la DA & Mascotte", desc: "Modernisation graphique globale et intégration d'une mascotte pour guider l'utilisateur à travers les concepts théoriques.", tag: "Design", difficulty: "Moyen" },
      ]
    },
    {
      title: "Horizon 3 : Vision à long terme",
      description: "Changement d'échelle, ouverture à de nouveaux cas d'usage complexes et déploiement multi-plateforme.",
      items: [
        { name: "Déploiement en Application Mobile", desc: "Création d'une déclinaison applicative native (iOS / Android) pour faciliter l'usage synchrone en groupe.", tag: "Mobile", difficulty: "Expert" },
        { name: "Agents IA Prédictifs (NLP)", desc: "Analyse automatisée des feedbacks textuels pour ajuster dynamiquement les profils d'utilité abstraits.", tag: "IA / NLP", difficulty: "Expert" },
        { name: "Synchronisation des calendriers", desc: "Connexion aux APIs Google Calendar pour pré-générer les fenêtres de disponibilités des groupes.", tag: "API", difficulty: "Moyen" },
        { name: "Gestion des séjours multi-jours", desc: "Extension de l'algorithme pour gérer l'équité temporelle et l'organisation d'activités étalées sur plusieurs jours.", tag: "Algorithme", difficulty: "Avancé" },
        { name: "Délégation automatique de profil", desc: "Permettre à un participant de confier entièrement sa décision — disponibilités comprises — au calcul du système, une fois la confiance dans la fidélité du profil suffisamment établie.", tag: "Algorithme", difficulty: "Avancé" },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      <div>
        <Navbar user={user} />

        {/* HERO SECTION */}
        <section className="py-20 px-6 bg-gradient-to-b from-purple-50/40 via-white to-slate-50 text-center relative overflow-hidden">
          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
              Développement
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight mb-6">
              Feuille de route du projet
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
              Découvrez les chantiers techniques, scientifiques et ergonomiques qui rythment l'évolution du démonstrateur IRIS.
            </p>
          </div>
        </section>

   {/* ROADMAP CONTENT  */}
        <section className="py-12 px-4 md:px-6 max-w-5xl mx-auto w-full overflow-hidden">
          {/* Conteneur principal sans la grande barre globale */}
          <div className="space-y-24 relative">
            
            {horizons.map((horizon, hIdx) => (
              <div key={hIdx} className="relative">
                
                {/* En-tête de l'horizon : Complètement libéré de toute ligne verticale */}
                <div className="pl-8 md:pl-0 md:text-center mb-12 relative z-10">
                  <h2 className="text-xl font-bold text-slate-900">
                    {horizon.title}
                  </h2>
                  <p className="text-slate-500 text-sm max-w-xl md:mx-auto mt-2">
                    {horizon.description}
                  </p>
                </div>

                {/* Grille : La ligne verticale (before:) est maintenant injectée ICI, localement sur les cartes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-20 pl-8 md:pl-0 relative before:absolute before:inset-0 before:left-2 md:before:left-1/2 before:w-0.5 before:bg-slate-200 before:h-full">
                  {horizon.items.map((item, itemIdx) => {
                    const isEven = itemIdx % 2 === 0;

                    return (
                      <div 
                        key={itemIdx} 
                        className={`relative bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between
                          ${isEven ? 'md:col-start-1' : 'md:col-start-2'}
                        `}
                      >
                        {/* Point sur la ligne calé dynamiquement */}
                        <div className={`absolute top-8 w-4 h-4 rounded-full bg-purple-600 border-4 border-white shadow-sm z-20 transition duration-200 hover:scale-125
                          -left-[31px] 
                          ${isEven ? 'md:-right-[49px] md:left-auto' : 'md:-left-[49px]'}
                        `} />

                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                              {item.tag}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              item.difficulty === 'Facile' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' :
                              item.difficulty === 'Moyen' ? 'bg-amber-50 text-amber-700 border border-amber-200/40' :
                              item.difficulty === 'Avancé' ? 'bg-purple-50 text-purple-700 border border-purple-200/40' :
                              'bg-rose-50 text-rose-700 border border-rose-200/40'
                            }`}>
                              {item.difficulty}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mb-2">{item.name}</h3>
                          <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}

          </div>
        </section>

        {/* SECTION INVITATION FEEDBACK */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center border-t border-slate-200/60 mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Une idée ? Une priorité différente ?</h2>
          <p className="text-slate-600 max-w-md mx-auto text-sm md:text-base leading-relaxed mb-6">
            En tant que démonstrateur ouvert, IRIS évolue aussi en fonction des besoins de ses utilisateurs. Donnez votre avis sur les fonctionnalités prioritaires.
          </p>
          <a
            href="https://tally.so/r/Y5qxz0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-bold bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-md transition duration-200 no-underline"
          >
            Voter ou suggérer une évolution
          </a>
        </section>
      </div>

      <Footer />

      {/* COMPOSANTS FLOTTANTS */}
      <ScrollToTop />
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
