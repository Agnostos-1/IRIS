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
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'

export default async function MethodePage() {
	
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <Navbar user={user} />
	  
    <main>
 
    {/* Hero */}
	<section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-violet-100 py-32 px-6">
	  <div className="mx-auto max-w-5xl text-center">

		<div className="mb-6 inline-flex rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700">
		  Méthode
		</div>

		<h1 className="mb-8 text-5xl font-extrabold tracking-tight text-slate-900 md:text-7xl">
		  La méthode IRIS
		</h1>

		<p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-600">
		  Comprendre comment des préférences individuelles,
		  des contraintes parfois contradictoires et des objectifs
		  collectifs peuvent être progressivement transformés
		  en une décision commune.
		</p>

		<div className="mt-12 flex flex-wrap justify-center gap-4">

		  <Link
			href="/auth/login"
			className="rounded-xl bg-violet-700 px-8 py-4 font-semibold text-white transition hover:bg-violet-800"
		  >
			Tester la démo
		  </Link>

		  <Link
			href="/science"
			className="rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 transition hover:bg-slate-50"
		  >
			Fondements scientifiques
		  </Link>

		</div>
	  </div>
	</section>
	
	{/* Pourquoi une méthode */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">
	  <div className="mx-auto max-w-6xl">

		{/* En-tête de section */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Introduction
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Pourquoi une méthode ?
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Lorsqu'un groupe doit prendre une décision, les préférences individuelles, les contraintes pratiques et les compromis possibles sont rarement visibles au même moment.
		  </p>
		</div>

		{/* Grille de 3 cartes comparatives */}
		<div className="grid gap-8 md:grid-cols-3">

		  {/* Carte 1 : Problème 1 */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>

			  <h3 className="mb-3 text-xl font-bold text-slate-900">
				Discussions dispersées
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Les informations sont souvent éparpillées entre messages, appels, sondages informels et conversations de couloir, rendant la synthèse difficile.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Perte d'information
			</div>
		  </div>

		  {/* Carte 2 : Problème 2 */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>

			  <h3 className="mb-3 text-xl font-bold text-slate-900">
				Vote immédiat
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Une décision hâtive basée sur une majorité simple ne signifie pas qu'elle est optimale ni acceptée par l'ensemble des participants.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Faux consensus
			</div>
		  </div>

		  {/* Carte 3 : La Réponse IRIS (Mise en avant) */}
		  <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 rounded-3xl border border-purple-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden">
			<div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
			  L'Approche IRIS
			</div>

			<div>

			  <h3 className="mb-3 text-xl font-bold text-slate-900">
				Processus structuré
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				IRIS regroupe et clarifie les contraintes afin de permettre au groupe d'explorer sereinement plusieurs alternatives avant d'arbitrer.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-purple-100 text-xs font-bold text-purple-700 flex items-center gap-1.5">
			  <span className="w-2 h-2 rounded-full bg-purple-600" />
			  Décision éclairée & collective
			</div>
		  </div>

		</div>

	  </div>
	</section>
	
	{/* Les sept phases */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

	  <div className="mx-auto max-w-7xl">

		{/* En-tête de section */}
		<div className="mb-20 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Processus
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Les sept phases de la méthode
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Chaque étape prépare la suivante. Le vote n'intervient qu'à la toute fin d'un parcours structuré.
		  </p>
		</div>

		{/* Grille des 7 étapes */}
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		  {[
			[
			  "01",
			  "Création",
			  "Définition du cadre général, de la thématique et des objectifs de l'événement."
			],
			[
			  "02",
			  "Disponibilités",
			  "Collecte et harmonisation des contraintes temporelles des participants."
			],
			[
			  "03",
			  "Activités",
			  "Recueil et centralisation des propositions d'activités individuelles."
			],
			[
			  "04",
			  "Scénarios",
			  "Génération combinatoire automatique des assemblages d'activités crédibles."
			],
			[
			  "05",
			  "Équité",
			  "Évaluation des impacts individuels et prise en compte de l'historique du groupe."
			],
			[
			  "06",
			  "Sélection",
			  "Filtrage intelligent pour ne conserver que les compromis les plus pertinents."
			],
			[
			  "07",
			  "Condorcet",
			  "Arbitrage et décision finale du groupe par comparaison par paires."
			]
		  ].map(([number, title, text]) => {
			const isFinalStep = number === "07";

			return (
			  <div
				key={number}
				className={`rounded-3xl p-8 transition duration-200 flex flex-col justify-between ${
				  isFinalStep
					? "bg-gradient-to-br from-purple-700 to-indigo-700 text-white border border-purple-800 shadow-md md:col-span-2 lg:col-span-1"
					: "bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-200"
				}`}
			  >
				<div>
				  <div className="flex items-center justify-between mb-6">
					<span className={`text-xs font-black tracking-wider px-3 py-1 rounded-full ${
					  isFinalStep
						? "bg-white/20 text-white"
						: "bg-purple-50 text-purple-700 border border-purple-100"
					}`}>
					  ÉTAPE {number}
					</span>

					{isFinalStep && (
					  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-400 text-slate-950 px-2 py-0.5 rounded">
						Décision
					  </span>
					)}
				  </div>

				  <h3 className={`text-xl font-bold mb-3 ${isFinalStep ? "text-white" : "text-slate-900"}`}>
					{title}
				  </h3>

				  <p className={`text-sm leading-relaxed ${isFinalStep ? "text-purple-100" : "text-slate-600"}`}>
					{text}
				  </p>
				</div>

				<div className={`mt-6 pt-4 text-[11px] font-semibold ${
				  isFinalStep ? "border-t border-white/20 text-purple-200" : "border-t border-slate-100 text-slate-400"
				}`}>
				  {isFinalStep ? "Phase d'aboutissement" : "Phase de préparation"}
				</div>
			  </div>
			);
		  })}
		</div>

	  </div>

	</section>
	
	{/* De la préférence individuelle à l'analyse collective */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

	  <div className="mx-auto max-w-7xl">

		{/* Header */}
		<div className="mb-20 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Profil de Préférences
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Chaque participant construit son propre profil de décision
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			IRIS ne demande pas uniquement quelles activités vous aimez. Le système cherche à comprendre les critères qui influencent réellement vos choix afin de comparer des scénarios très différents sur une base commune.
		  </p>
		</div>

		{/* Contenu principal (Image + 3 Piliers) */}
		<div className="max-w-3xl mx-auto">

		  {/* Liste des 3 piliers du profil */}
		  <div className="space-y-8">

			{/* Pilier 1 */}
			<div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs hover:border-purple-200 transition duration-200">
			  <div className="flex items-center gap-3 mb-2">
				<span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
				<h3 className="text-xl font-bold text-slate-900">
				  Activités préférées
				</h3>
			  </div>
			  <p className="text-slate-600 text-sm md:text-base leading-relaxed pl-5">
				Chaque type d'activité est évalué individuellement. Un participant peut apprécier les sorties culturelles, privilégier le sport ou rechercher des temps de détente plus informels.
			  </p>
			</div>

			{/* Pilier 2 */}
			<div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs hover:border-purple-200 transition duration-200">
			  <div className="flex items-center gap-3 mb-2">
				<span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
				<h3 className="text-xl font-bold text-slate-900">
				  Contraintes et contexte
				</h3>
			  </div>
			  <p className="text-slate-600 text-sm md:text-base leading-relaxed pl-5">
				Budget, mobilité, horaires d'impératif, accessibilité ou logistique familiale : ces paramètres sont pris en compte dès le départ pour écarter les options incompatibles.
			  </p>
			</div>

			{/* Pilier 3 */}
			<div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs hover:border-purple-200 transition duration-200">
			  <div className="flex items-center gap-3 mb-2">
				<span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
				<h3 className="text-xl font-bold text-slate-900">
				  Priorités individuelles
				</h3>
			  </div>
			  <p className="text-slate-600 text-sm md:text-base leading-relaxed pl-5">
				Chaque participant définit la pondération qu'il accorde à ses critères (activités, coût, trajets, ambiance). Deux personnes peuvent aimer la même activité pour des raisons totalement différentes.
			  </p>
			</div>

		  </div>

		</div>

	  </div>

	</section>
	
	{/* Dimensions analysées */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

	  <div className="mx-auto max-w-6xl">

		{/* En-tête de section */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Multi-critères
		  </span>

		  <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Une préférence n'est jamais un seul nombre
		  </h3>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Lorsqu'un scénario est évalué, plusieurs dimensions distinctes sont croisées et analysées simultanément.
		  </p>
		</div>

		{/* Grille des 5 dimensions */}
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

		  {[
			{
			  title: "Activités",
			  tag: "Intérêt",
			  text: "Ce que la personne apprécie réellement faire."
			},
			{
			  title: "Horaires",
			  tag: "Temps",
			  text: "Compatibilité directe avec ses créneaux de disponibilité."
			},
			{
			  title: "Distance",
			  tag: "Mobilité",
			  text: "Temps de trajet ou effort logistique requis pour participer."
			},
			{
			  title: "Budget",
			  tag: "Finance",
			  text: "Coût financier acceptable pour l'ensemble de l'événement."
			},
			{
			  title: "Social",
			  tag: "Ambiance",
			  text: "Préférence pour un cadre intimiste, calme ou très animé."
			}
		  ].map((item) => (
			<div
			  key={item.title}
			  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-purple-200 transition duration-200 flex flex-col justify-between"
			>
			  <div>
				<div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md inline-block mb-4">
				  {item.tag}
				</div>

				<h4 className="mb-2 text-lg font-bold text-slate-900">
				  {item.title}
				</h4>

				<p className="text-xs md:text-sm leading-relaxed text-slate-600">
				  {item.text}
				</p>
			  </div>

			  <div className="mt-6 pt-3 border-t border-slate-100 w-full" />
			</div>
		  ))}

		</div>

	  </div>

	</section>
	
	{/* Comment IRIS évalue un scénario */}
<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

  <div className="mx-auto max-w-7xl">

    {/* En-tête de section */}
    <div className="mb-20 text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
        Évaluation
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
        Comment IRIS évalue un scénario
      </h2>

      <p className="text-slate-600 text-base md:text-lg leading-relaxed">
        Une activité appréciée ne fait pas à elle seule un bon scénario. Un scénario doit également être réalisable, accessible et parfaitement cohérent avec les contraintes du groupe.
      </p>
    </div>

    {/* Grille des 4 composants d'évaluation */}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

      {/* Composant 1 : Activités */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              FACTOR 01
            </span>
          </div>

          <h3 className="mb-3 text-xl font-bold text-slate-900">
            Activités
          </h3>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Correspondance directe entre la nature des activités proposées et les préférences exprimées par l'utilisateur.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
          • Évaluation des souhaits
        </div>
      </div>

      {/* Composant 2 : Contraintes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              FACTOR 02
            </span>
          </div>

          <h3 className="mb-3 text-xl font-bold text-slate-900">
            Contraintes
          </h3>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Compatibilité stricte avec les créneaux horaires, le respect du budget global et la logistique individuelle.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
          • Filtre de faisabilité
        </div>
      </div>

      {/* Composant 3 : Pondérations */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              FACTOR 03
            </span>
          </div>

          <h3 className="mb-3 text-xl font-bold text-slate-900">
            Pondérations
          </h3>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Poids d'importance relatif accordé par chaque participant aux différents critères de décision.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
          • Priorisation personnelle
        </div>
      </div>

      {/* Composant 4 : Utilité (Résultat) */}
      <div className="bg-gradient-to-br from-purple-700 to-indigo-700 text-white rounded-3xl border border-purple-800 p-8 shadow-md transition duration-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black tracking-wider bg-white/20 text-white px-3 py-1 rounded-full">
              RÉSULTAT
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-400 text-slate-950 px-2 py-0.5 rounded">
              Synthèse
            </span>
          </div>

          <h3 className="mb-3 text-xl font-bold text-white">
            Utilité Individuelle
          </h3>

          <p className="text-purple-100 text-sm md:text-base leading-relaxed">
            Estimation globale synthétique de l'intérêt réel et de la viabilité du scénario pour chaque personne.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-white/20 text-[11px] font-semibold text-purple-200">
          • Valeur transmise à l'agrégateur
        </div>
      </div>

    </div>

  </div>

</section>
	
	{/* De l'activité au scénario */}
	<section className="bg-slate-50 py-28 px-6">

	  <div className="mx-auto max-w-6xl">

		<div className="max-w-2xl mx-auto">

		  <div>

			<h3 className="mb-6 text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
			  Un scénario est plus qu'une activité
			</h3>

			<p className="mb-6 leading-relaxed text-slate-600">
			  Une activité appréciée peut devenir peu attractive
			  si elle implique un déplacement important,
			  un coût excessif ou un horaire difficile.
			</p>

			<p className="mb-6 leading-relaxed text-slate-600">
			  À l'inverse, une activité moins populaire
			  peut s'intégrer dans un scénario globalement
			  plus satisfaisant pour l'ensemble du groupe.
			</p>

			<p className="leading-relaxed text-slate-600">
			  IRIS cherche donc à évaluer des expériences complètes
			  plutôt que des éléments isolés.
			</p>

		  </div>

		</div>

	  </div>

	</section>
	
	{/* Évaluation individuelle */}
	<section className="bg-slate-50/70 py-28 px-6 border-y border-slate-200/60">

	  <div className="mx-auto max-w-5xl text-center">
		<span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
		  Analyse Multi-Critères
		</span>

		<h3 className="mb-6 text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
		  Chaque scénario est évalué pour chaque participant
		</h3>

		<p className="mx-auto max-w-3xl text-base md:text-lg leading-relaxed text-slate-600">
		  Deux personnes peuvent observer exactement le même scénario et lui attribuer une valeur très différente.
		  L'objectif n'est pas de produire un score unique, mais de comprendre comment chaque participant perçoit les alternatives.
		</p>
	  </div>

	  <div className="mx-auto mt-16 max-w-6xl">

		<div className="grid gap-6 md:grid-cols-3">

		  {/* Participant A */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-purple-200 transition duration-200 flex flex-col justify-between">
			<div>
			  <div className="flex items-center gap-4 mb-6">
				<div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-lg">
				  A
				</div>
				<div>
				  <h4 className="text-lg font-bold text-slate-900">
					Participant A
				  </h4>
				  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
					Profil Pragmatique
				  </span>
				</div>
			  </div>

			  <p className="text-slate-600 text-sm leading-relaxed mb-6">
				Privilégie avant tout le budget global et la proximité géographique pour limiter les contraintes.
			  </p>
			</div>

			{/* Mini jauge indicative pour le schéma */}
			<div className="pt-4 border-t border-slate-100 space-y-2 text-xs font-medium text-slate-500">
			  <div className="flex justify-between">
				<span>Priorité Budget / Distance</span>
				<span className="font-bold text-purple-600">85%</span>
			  </div>
			  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
				<div className="bg-purple-600 h-full w-[85%]" />
			  </div>
			</div>
		  </div>

		  {/* Participant B */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-indigo-200 transition duration-200 flex flex-col justify-between">
			<div>
			  <div className="flex items-center gap-4 mb-6">
				<div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-lg">
				  B
				</div>
				<div>
				  <h4 className="text-lg font-bold text-slate-900">
					Participant B
				  </h4>
				  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
					Profil Passionné
				  </span>
				</div>
			  </div>

			  <p className="text-slate-600 text-sm leading-relaxed mb-6">
				Recherche avant tout la qualité intrinsèque de l'activité elle-même, peu importe la distance.
			  </p>
			</div>

			{/* Mini jauge indicative */}
			<div className="pt-4 border-t border-slate-100 space-y-2 text-xs font-medium text-slate-500">
			  <div className="flex justify-between">
				<span>Priorité Qualité de l'activité</span>
				<span className="font-bold text-indigo-600">90%</span>
			  </div>
			  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
				<div className="bg-indigo-600 h-full w-[90%]" />
			  </div>
			</div>
		  </div>

		  {/* Participant C */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-emerald-200 transition duration-200 flex flex-col justify-between">
			<div>
			  <div className="flex items-center gap-4 mb-6">
				<div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
				  C
				</div>
				<div>
				  <h4 className="text-lg font-bold text-slate-900">
					Participant C
				  </h4>
				  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
					Profil Social
				  </span>
				</div>
			  </div>

			  <p className="text-slate-600 text-sm leading-relaxed mb-6">
				Accorde davantage d'importance à l'ambiance sociale, au confort global et à la convivialité du groupe.
			  </p>
			</div>

			{/* Mini jauge indicative */}
			<div className="pt-4 border-t border-slate-100 space-y-2 text-xs font-medium text-slate-500">
			  <div className="flex justify-between">
				<span>Priorité Convivialité</span>
				<span className="font-bold text-emerald-600">95%</span>
			  </div>
			  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
				<div className="bg-emerald-600 h-full w-[95%]" />
			  </div>
			</div>
		  </div>

		</div>

	  </div>

	</section>
	
	{/* L'équité dans le temps */}
	<section className="bg-gradient-to-br from-violet-50 via-white to-violet-100 py-32 px-6">

	  <div className="mx-auto max-w-7xl">

		<div className="mb-20 text-center">

		  <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
			Équité
		  </div>

		  <h2 className="mb-6 text-5xl font-extrabold text-slate-900">
			L'équité ne se mesure pas sur une seule décision
		  </h2>

		  <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600">
			Une décision peut sembler équilibrée aujourd'hui
			tout en produisant progressivement un déséquilibre.
			IRIS cherche à prendre en compte non seulement
			la satisfaction immédiate mais également
			l'historique des compromis réalisés au fil du temps.
		  </p>

		</div>
		
		    <div className="grid items-center gap-20 lg:grid-cols-2">

		  <div>
			<div className="w-full rounded-3xl border border-slate-200/80 shadow-sm p-8 bg-white">
			  <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
				Écart de satisfaction, avant et après compensation
			  </div>
			  <svg viewBox="0 0 340 220" width="100%" height="auto" role="img" aria-label="Trois événements successifs montrant l'écart de satisfaction d'un même participant se resserrer grâce au coefficient Rᵢ">
				{[
				  { x: 20,  label: 'Événement 1', brut: 40, compense: 55 },
				  { x: 130, label: 'Événement 2', brut: 45, compense: 62 },
				  { x: 240, label: 'Événement 3', brut: 48, compense: 70 },
				].map((e) => (
				  <g key={e.label}>
					<rect x={e.x} y={170 - e.brut} width={26} height={e.brut} rx={4} fill="#E2E8F0" />
					<rect x={e.x + 32} y={170 - e.compense} width={26} height={e.compense} rx={4} fill="#7C3AED" />
					<text x={e.x + 29} y={190} textAnchor="middle" fontSize="10" fill="#64748B">{e.label}</text>
				  </g>
				))}
				<line x1="10" y1="170" x2="330" y2="170" stroke="#E2E8F0" strokeWidth="1" />
				<g transform="translate(20, 205)">
				  <rect width={10} height={10} rx={2} fill="#E2E8F0" />
				  <text x={16} y={9} fontSize="10" fill="#94A3B8">Satisfaction brute</text>
				  <rect x={140} width={10} height={10} rx={2} fill="#7C3AED" />
				  <text x={156} y={9} fontSize="10" fill="#4C1D95">Avec compensation Rᵢ</text>
				</g>
			  </svg>
			</div>
		  </div>

		  <div className="space-y-8">

			<div>

			  <h3 className="mb-4 text-2xl font-bold text-slate-900">
				Un compromis acceptable peut devenir injuste
			  </h3>

			  <p className="leading-relaxed text-slate-600">
				Lors d'un événement isolé, il est normal que certains
				participants obtiennent un résultat légèrement moins favorable
				que d'autres.
			  </p>

			</div>

			<div>

			  <p className="leading-relaxed text-slate-600">
				Le problème apparaît lorsque les mêmes personnes
				réalisent systématiquement les compromis nécessaires
				au fonctionnement du groupe.
			  </p>

			</div>

			<div>

			  <p className="leading-relaxed text-slate-600">
				Une suite de décisions localement acceptables
				peut ainsi produire un déséquilibre durable
				qui devient invisible si chaque événement
				est analysé séparément.
			  </p>

			</div>

		  </div>

		</div>
		
		<div className="mt-28 max-w-6xl mx-auto px-4">

	  {/* En-tête de section */}
	  <div className="mb-14 text-center max-w-3xl mx-auto">
		<span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
		  Régulation Temporelle
		</span>
		<h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
		  Deux niveaux d'équité complémentaire
		</h3>
		<p className="text-slate-600 text-base md:text-lg">
		  Comment IRIS ajuste la compensation des compromis à l'échelle d'un groupe ou de la vie de l'utilisateur.
		</p>
	  </div>

	  {/* Grille comparative (2 Colonnes) */}
	  <div className="grid gap-8 lg:grid-cols-2">
		
		{/* Carte : Historique local */}
		<div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-10 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
		  <div className="absolute top-0 left-0 w-2 h-full bg-slate-400" />
		  <div>
			<div className="flex items-center justify-between mb-6">
			  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg">
				G
			  </div>
			  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
				Échelle Groupe
			  </span>
			</div>

			<h4 className="mb-4 text-2xl font-bold text-slate-900">
			  Historique local
			</h4>

			<p className="leading-relaxed text-slate-600 text-sm md:text-base mb-6">
			  Les compromis passés au sein d&apos;un groupe donné pèsent le plus dans son propre calcul. Ce que vous avez cédé dans un cercle d&apos;amis reste d&apos;abord une affaire de ce cercle-là.
			</p>
		  </div>

		  <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center gap-2">
			<span className="w-2 h-2 rounded-full bg-slate-400" />
			Poids principal : l&apos;historique partagé avec ce groupe précis
		  </div>
		</div>

		{/* Carte : Historique global */}
		<div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 p-8 md:p-10 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
		  <div className="absolute top-0 left-0 w-2 h-full bg-purple-600" />
		  <div>
			<div className="flex items-center justify-between mb-6">
			  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
				U
			  </div>
			  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
				Échelle Utilisateur
			  </span>
			</div>

			<h4 className="mb-4 text-2xl font-bold text-slate-900">
			  Historique global
			</h4>

			<p className="leading-relaxed text-slate-600 text-sm md:text-base mb-6">
			  IRIS peut prendre en compte l&apos;ensemble de vos participations. Une personne qui fait de nombreux compromis transversaux voit cet effort lissé et valorisé au fil du temps.

			</p>
		  </div>

		  <div className="pt-4 border-t border-purple-100/60 text-xs font-semibold text-purple-700 flex items-center gap-2">
			<span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
			Poids complémentaire : votre historique sur tous vos groupes
		  </div>
		</div>

	  </div>

	  <p className="mt-8 text-center text-sm text-slate-500 max-w-2xl mx-auto">
		Ces deux échelles ne sont pas cloisonnées : IRIS calcule un coefficient unique, qui
		mélange les deux dans une proportion qui dépend de la part d&apos;historique
		effectivement partagée avec ce groupe précis.
	  </p>

	  {/* Formule visuelle (Équation visuelle) */}
	  <div className="mt-12 rounded-3xl border border-slate-200/80 bg-white p-8 md:p-10 shadow-sm">
		<div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
		  L&apos;Équation du lissage
		</div>

		<div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center">

		  <div className="w-full md:w-auto rounded-2xl bg-slate-50 border border-slate-200/60 px-6 py-4 font-bold text-slate-800 text-sm md:text-base">
			Historique local
		  </div>

		  <div className="text-purple-600 text-2xl font-extrabold">
			+
		  </div>

		  <div className="w-full md:w-auto rounded-2xl bg-purple-50/80 border border-purple-100 px-6 py-4 font-bold text-purple-900 text-sm md:text-base">
			Historique global
		  </div>

		  <div className="text-purple-600 text-2xl font-extrabold">
			=
		  </div>

		  <div className="w-full md:w-auto rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-600 px-8 py-4 font-extrabold text-white text-sm md:text-base shadow-sm">
			Équité Temporelle
		  </div>

		</div>
	  </div>

	  {/* Conclusion / Note théorique */}
	  <div className="mt-16 mx-auto max-w-3xl text-center">
		<p className="text-lg md:text-xl font-medium leading-relaxed text-slate-600 bg-slate-100/60 p-6 rounded-2xl border border-slate-200/50 italic">
		  « L'objectif n'est pas d'obtenir une égalité parfaite à chaque vote, mais d'éviter l'accumulation systématique de déséquilibres au fil des décisions collectives. »
		</p>
	  </div>

	</div>

	  </div>

	</section>
	
	{/* Comparaison des scénarios */}
	<section className="bg-slate-50/50 py-28 px-6 border-t border-slate-200/60">

	  <div className="mx-auto max-w-6xl">

		{/* Header */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Agrégation & Arbitrage
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Comment IRIS compare les scénarios
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Une fois les préférences analysées et les compensations historiques appliquées, chaque scénario dispose d'une utilité estimée pour chaque participant. IRIS détermine alors quels scénarios offrent le meilleur compromis collectif.
		  </p>
		</div>

		{/* Schéma de base : De l'individuel au collectif */}
		<div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 shadow-sm mb-24">
		  <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
			1. Évaluation individuelle d'un scénario donné
		  </div>

		  <div className="grid gap-6 md:grid-cols-3">
			{/* Alice */}
			<div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-6 text-center">
			  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Participant 1</div>
			  <div className="font-bold text-slate-900 mb-3">Alice</div>
			  <div className="text-3xl font-extrabold text-purple-700">0.92</div>
			  <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
				<div className="bg-purple-600 h-full w-[92%]" />
			  </div>
			</div>

			{/* Bob */}
			<div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-6 text-center">
			  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Participant 2</div>
			  <div className="font-bold text-slate-900 mb-3">Bob</div>
			  <div className="text-3xl font-extrabold text-purple-700">0.88</div>
			  <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
				<div className="bg-purple-600 h-full w-[88%]" />
			  </div>
			</div>

			{/* Charlie */}
			<div className="rounded-2xl bg-rose-50/50 border border-rose-200/60 p-6 text-center">
			  <div className="text-xs font-bold text-rose-500 uppercase mb-1">Participant 3</div>
			  <div className="font-bold text-slate-900 mb-3">Charlie</div>
			  <div className="text-3xl font-extrabold text-rose-600">0.35</div>
			  <div className="mt-3 w-full bg-rose-200 h-1.5 rounded-full overflow-hidden">
				<div className="bg-rose-500 h-full w-[35%]" />
			  </div>
			</div>
		  </div>

		  {/* Flèche d'agrégation */}
		  <div className="my-8 flex items-center justify-center">
			<div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl shadow-inner">
			  ↓
			</div>
		  </div>

		  <div className="rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-600 p-6 text-center text-white font-bold text-lg shadow-sm">
			Score Collectif du Scénario
		  </div>
		</div>

		{/* Section : Pourquoi la moyenne échoue */}
		<div className="mb-20">
		  <div className="mb-12 text-center max-w-3xl mx-auto">
			<h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
			  Tous les compromis ne se valent pas
			</h3>
			<p className="text-slate-600 text-base md:text-lg">
			  Deux scénarios peuvent produire une satisfaction moyenne similaire tout en ayant des conséquences dramatiquement différentes pour certains participants.
			</p>
		  </div>

		  <div className="grid gap-8 lg:grid-cols-2">

			{/* Scénario A (Déséquilibré) */}
			<div className="rounded-3xl border border-rose-200/80 bg-white p-8 md:p-10 shadow-sm relative overflow-hidden">
			  <div className="flex items-center justify-between mb-6">
				<h4 className="text-xl font-extrabold text-slate-900">Scénario A</h4>
				<span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
				  Moyenne simple 66% · géométrique (IRIS) 50%
				</span>
			  </div>

			  <div className="space-y-4 mb-6">
				<div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
				  <span className="font-semibold text-slate-800">Alice</span>
				  <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">95%</span>
				</div>

				<div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
				  <span className="font-semibold text-slate-800">Bob</span>
				  <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">90%</span>
				</div>

				<div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-100">
				  <span className="font-semibold text-rose-900">Charlie (Exclu)</span>
				  <span className="font-bold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-lg">15%</span>
				</div>
			  </div>

			  <p className="text-xs md:text-sm leading-relaxed text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
				« Deux participants obtiennent un résultat idéal, mais le troisième subit un sacrifice majeur. Une moyenne classique masquerait cette injustice. »
			  </p>
			</div>

			{/* Scénario B (Équilibré) */}
			<div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-purple-50/20 p-8 md:p-10 shadow-sm relative overflow-hidden">
			  <div className="flex items-center justify-between mb-6">
				<h4 className="text-xl font-extrabold text-slate-900">Scénario B</h4>
				<span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
				  Moyenne simple 71% · géométrique (IRIS) 72%
				</span>
			  </div>

			  <div className="space-y-4 mb-6">
				<div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
				  <span className="font-semibold text-slate-800">Alice</span>
				  <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">75%</span>
				</div>

				<div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
				  <span className="font-semibold text-slate-800">Bob</span>
				  <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">72%</span>
				</div>

				<div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
				  <span className="font-semibold text-slate-800">Charlie</span>
				  <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">68%</span>
				</div>
			  </div>

			  <p className="text-xs md:text-sm leading-relaxed text-slate-600 italic bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
				« Personne n'obtient un résultat parfait, mais chacun bénéficie d'une option très satisfaisante. Le groupe reste soudé. »
			  </p>
			</div>

		  </div>
		</div>

		{/* Explication Nash Social Welfare */}
		<div className="mx-auto max-w-3xl text-center mb-16">
		  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
			Favoriser les compromis réellement collectifs
		  </h3>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-6">
			Pour comparer les alternatives, IRIS s'inspire du principe de <strong>Nash Social Welfare</strong>. Sans entrer dans des équations complexes, cette méthode tend naturellement à maximiser le produit des satisfactions plutôt que leur simple somme.
		  </p>

		  <p className="text-slate-600 text-sm md:text-base leading-relaxed bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
			<strong>À retenir :</strong> Multiplier les utilités donne un poids pénalisant gigantesque aux scores proches de zéro. Un scénario qui &quot;sacrifie&quot; un membre voit son score global s&apos;effondrer immédiatement.
		  </p>
		</div>

		{/* Formule de synthèse finale */}
		<div className="rounded-3xl border border-purple-200/80 bg-white p-8 md:p-10 shadow-sm">
		  <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
			Synthèse du calcul d'arbitrage
		  </div>

		  <div className="flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-4 text-center">

			<div className="w-full lg:w-auto rounded-2xl bg-slate-50 border border-slate-200/60 px-5 py-3.5 font-bold text-slate-800 text-xs md:text-sm">
			  Utilité individuelle
			</div>

			<div className="text-purple-600 text-xl font-extrabold">×</div>

			<div className="w-full lg:w-auto rounded-2xl bg-purple-50 border border-purple-100 px-5 py-3.5 font-bold text-purple-900 text-xs md:text-sm">
			  Compensation Rᵢ
			</div>

			<div className="text-purple-600 text-xl font-extrabold">→</div>

			<div className="w-full lg:w-auto rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-3.5 font-bold text-indigo-900 text-xs md:text-sm">
			  Agrégation géométrique entre participants
			</div>

			<div className="text-purple-600 text-xl font-extrabold">=</div>

			<div className="w-full lg:w-auto rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-600 px-6 py-3.5 font-extrabold text-white text-xs md:text-sm shadow-sm">
			  Score final IRIS
			</div>

		  </div>

		  <p className="mt-6 text-center text-xs text-slate-400 max-w-xl mx-auto">
			Schéma simplifié : la compensation ajuste d&apos;abord l&apos;utilité de chaque
			personne individuellement. Les utilités de tous les participants sont ensuite
			combinées entre elles par moyenne géométrique — pas par simple somme — pour
			obtenir le score du scénario.
		  </p>

		</div>

	  </div>

	</section>
	
	{/* Filtrage des scénarios */}
	<section className="bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 py-28 px-6 border-t border-slate-200/60">

	  <div className="mx-auto max-w-6xl">

		{/* Header */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Sélection & Ergonomie
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Pourquoi tous les scénarios ne sont pas retenus
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Le moteur peut générer plusieurs dizaines, voire plusieurs centaines de scénarios combinatoires. Pourtant, seuls 3 à 5 choix optimaux sont présentés aux participants.
		  </p>
		</div>

		{/* Le paradoxe du choix */}
		<div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 shadow-sm mb-20 max-w-2xl mx-auto text-center">
		  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-4">
			Le paradoxe du choix
		  </span>
		  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
			Trop d'options paralyse la décision
		  </h3>
		  <p className="text-slate-600 leading-relaxed text-sm md:text-base">
			Générer davantage de scénarios permet d'explorer exhaustivement le champ des possibles. Cependant, présenter des dizaines de combinaisons similaires aux utilisateurs crée de la fatigue décisionnelle et obscurcit les vrais arbitrages.
		  </p>
		</div>

		{/* Section Réduire sans appauvrir */}
		<div className="mb-20">
		  <div className="text-center mb-16">
			<h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
			  Réduire sans appauvrir
			</h3>
			<p className="text-slate-500 text-sm md:text-base mt-2">
			  Un processus de filtrage en deux étapes pour ne garder que le meilleur.
			</p>
		  </div>

		  <div className="space-y-12">

			{/* ÉTAPE 1 : Éliminer les scénarios redondants */}
			<div className="grid gap-8 lg:grid-cols-2 items-center">

			  {/* Carte Texte */}
			  <div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-10 shadow-sm relative overflow-hidden">
				<div className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full inline-block">
				  Étape 1
				</div>

				<h4 className="mb-4 text-2xl font-bold text-slate-900">
				  Éliminer les scénarios dominés
				</h4>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
				  Certains scénarios n'apportent aucune alternative réelle : ils sont strictement moins bons pour tout le monde qu'une autre option disponible.
				</p>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed">
				  Ces sous-options sont retirées automatiquement pour éliminer le « bruit » et ne conserver que les arbitrages efficients.
				</p>
			  </div>

			  {/* Diagramme Visuel Étape 1 */}
			  <div className="rounded-3xl border border-slate-200/60 bg-slate-100/60 p-8 flex items-center justify-center">
				<div className="space-y-3 w-full max-w-sm">
				  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-center justify-between text-xs font-semibold text-rose-700 opacity-60 line-through">
					<span>Scénario X (Moins bon partout)</span>
					<span className="text-rose-500 font-bold">Éliminé</span>
				  </div>

				  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-center justify-between text-xs font-semibold text-rose-700 opacity-60 line-through">
					<span>Scénario Y (Doublon inférieur)</span>
					<span className="text-rose-500 font-bold">Éliminé</span>
				  </div>

				  <div className="rounded-xl bg-white border-2 border-purple-500 p-4 flex items-center justify-between text-sm font-bold text-slate-900 shadow-md">
					<div className="flex items-center gap-2">
					  <span className="w-2 h-2 rounded-full bg-purple-600" />
					  <span>Scénario Optima Pareto</span>
					</div>
					<span className="text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-md text-xs">Conservé</span>
				  </div>
				</div>
			  </div>

			</div>

			{/* ÉTAPE 2 : Conserver un choix lisible et diversifié */}
			<div className="grid gap-8 lg:grid-cols-2 items-center">

			  {/* Diagramme Visuel Étape 2 (Placé à gauche sur desktop) */}
			  <div className="order-2 lg:order-1 rounded-3xl border border-purple-100 bg-purple-50/50 p-8 flex items-center justify-center">
				<div className="grid grid-cols-1 gap-3 w-full max-w-sm">
				  
				  <div className="rounded-xl bg-white border border-purple-200/80 p-3.5 flex items-center justify-between shadow-2xs">
					<div>
					  <span className="font-bold text-slate-900 text-xs md:text-sm block">Option A : « Restaurant & Cinéma »</span>
					  <span className="text-[11px] text-slate-500">Focus Proximité</span>
					</div>
					<span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">Choix 1</span>
				  </div>

				  <div className="rounded-xl bg-white border border-purple-200/80 p-3.5 flex items-center justify-between shadow-2xs">
					<div>
					  <span className="font-bold text-slate-900 text-xs md:text-sm block">Option B : « Parc & Pique-Nique »</span>
					  <span className="text-[11px] text-slate-500">Focus Budget / Nature</span>
					</div>
					<span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">Choix 2</span>
				  </div>

				  <div className="rounded-xl bg-white border border-purple-200/80 p-3.5 flex items-center justify-between shadow-2xs">
					<div>
					  <span className="font-bold text-slate-900 text-xs md:text-sm block">Option C : « Bowling & Verre »</span>
					  <span className="text-[11px] text-slate-500">Focus Ambiance / Soirée</span>
					</div>
					<span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">Choix 3</span>
				  </div>

				</div>
			  </div>

			  {/* Carte Texte Étape 2 */}
			  <div className="order-1 lg:order-2 rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/30 via-white to-indigo-50/30 p-8 md:p-10 shadow-sm">
				<div className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
				  Étape 2
				</div>

				<h4 className="mb-4 text-2xl font-bold text-slate-900">
				  Garantir la diversité des choix
				</h4>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
				  Même après élimination des doublons, plusieurs scénarios très proches peuvent subsister (ex: le même restaurant à 50 mètres près).
				</p>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed">
				  IRIS sélectionne un panel restreint mais fortement <strong>diversifié</strong>, offrant au groupe de véritables alternatives d'expérience.
				</p>
			  </div>

			</div>

		  </div>
		</div>

		{/* Conclusion : Préparer le choix, pas le remplacer */}
		<div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 text-center shadow-sm max-w-4xl mx-auto">


		  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
			Préparer le choix, pas le remplacer
		  </h3>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-6">
			À ce stade, les scénarios ont été analysés, pondérés et filtrés par l'algorithme. Pourtant, <strong>aucune décision automatique n'est imposée</strong>.
		  </p>

		  <div className="inline-block bg-slate-50 border border-slate-200/80 px-6 py-3 rounded-2xl text-slate-800 font-bold text-sm md:text-base">
			La décision finale appartient toujours souverainement au groupe.
		  </div>
		</div>

	  </div>

	</section>
	
	
	{/* Décision finale */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

	  <div className="mx-auto max-w-7xl">

		{/* En-tête de section */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Gouvernance Humaine
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Le groupe garde le dernier mot
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			IRIS ne choisit jamais à la place des participants. Son rôle est d'explorer les possibilités, d'évaluer leurs conséquences et de préparer un sous-ensemble de scénarios pertinents.
		  </p>
		</div>

		{/* Blocs d'explications : Aide à la décision vs Pourquoi voter */}
		<div className="grid gap-8 lg:grid-cols-2 items-stretch mb-16">

		  <div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-10 shadow-sm flex flex-col justify-between">
			<div>
			  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full inline-block mb-4">
				Philosophie
			  </span>

			  <h3 className="mb-4 text-2xl font-bold text-slate-900">
				Aide à la décision, pas automatisation
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
				Contrairement aux algorithmes de recommandation classiques, IRIS ne cherche pas à imposer une réponse unique ou dogmatique.
			  </p>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Plusieurs alternatives sont volontairement conservées afin d'offrir un espace d'échange, de négociation et de prise en compte des imprévus de dernière minute.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Respect de la souveraineté du groupe
			</div>
		  </div>

		  <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/40 p-8 md:p-10 shadow-sm flex flex-col justify-between">
			<div>
			  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full inline-block mb-4">
				Processus
			  </span>

			  <h3 className="mb-4 text-2xl font-bold text-slate-900">
				Pourquoi voter à la fin ?
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
				Les meilleurs scénarios représentent souvent des compromis différents mais parfaitement équivalents sur le plan mathématique.
			  </p>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Le vote final permet au groupe de départager ces alternatives de manière totalement transparente, démocratique et sereine.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-purple-100 text-xs font-bold text-purple-700">
			  • Validation collective explicite
			</div>
		  </div>

		</div>

		{/* Section Condorcet / Comparaison par paires */}
		<div className="mt-16 text-center max-w-3xl mx-auto mb-10">
		  <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full inline-block mb-3">
			Méthode de Condorcet
		  </span>
		  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
			Un scrutin pensé pour révéler le vrai consensus
		  </h3>
		</div>

		<div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">

		  {/* Carte Principe */}
		  <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm hover:border-purple-200 transition duration-200 flex flex-col justify-between">
			<div>
			  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full inline-block">
				Principe
			  </div>

			  <h4 className="mb-3 text-xl font-bold text-slate-900">
				Comparer plutôt que compter
			  </h4>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Plutôt que d'additionner uniquement les premières positions, IRIS opère une comparaison duel par duel (deux à deux) pour identifier l'option qui surpasse toutes les autres.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Élimination des votes tactiques
			</div>
		  </div>

		  {/* Carte Résultat */}
		  <div className="rounded-3xl border border-purple-200/80 bg-purple-50/60 p-8 shadow-sm hover:border-purple-300 transition duration-200 flex flex-col justify-between">
			<div>
			  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full inline-block">
				Résultat
			  </div>

			  <h4 className="mb-3 text-xl font-bold text-slate-900">
				Une option résiliente
			  </h4>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Cette méthode distingue très nettement une option véritablement fédératrice pour l'ensemble du groupe d'un scénario soutenu avec véhémence par un sous-groupe minoritaire.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-purple-100 text-xs font-bold text-purple-700">
			  • Recherche du consensus le plus large
			</div>
		  </div>

		</div>

		<p className="mt-8 text-center text-sm text-slate-500 max-w-2xl mx-auto">
		  Il arrive qu&apos;aucune option ne surpasse toutes les autres deux à deux (un cas
		  d&apos;égalité, ou cycle). IRIS départage alors selon la méthode de Borda,
		  directement dérivée des bulletins déposés par le groupe — jamais en revenant au
		  score de l&apos;algorithme, pour laisser le dernier mot au jugement humain.
		</p>

	  </div>

	</section>
	
	{/* Apprentissage et feedback */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">
	  <div className="mx-auto max-w-7xl">

		{/* En-tête de section */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Amélioration continue
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Apprendre des décisions passées
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Une préférence exprimée avant un événement reste une estimation. Ce n'est qu'après avoir réellement vécu une expérience qu'il devient possible de mesurer l'écart avec les attentes.
		  </p>
		</div>

		{/* La boucle d'amélioration en 3 étapes */}
		<div className="mb-20">
		  <div className="text-center mb-12">
			<h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
			  Une boucle d'amélioration simple
			</h3>
			<p className="text-slate-500 text-sm md:text-base mt-2">
			  Un cycle structuré pour adapter l'outil à la réalité des usages.
			</p>
		  </div>

		  <div className="grid gap-8 lg:grid-cols-3">

			{/* Étape 1 */}
			<div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			  <div>
				<span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full inline-block mb-6">
				  ÉTAPE 01
				</span>

				<h4 className="mb-3 text-xl font-bold text-slate-900">
				  Retour d'expérience
				</h4>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed">
				  Après l'événement, chaque participant peut évaluer son niveau de satisfaction global ainsi que les activités réellement réalisées.
				</p>
			  </div>

			  <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
				• Recueil post-événement
			  </div>
			</div>

			{/* Étape 2 */}
			<div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			  <div>
				<span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full inline-block mb-6">
				  ÉTAPE 02
				</span>

				<h4 className="mb-3 text-xl font-bold text-slate-900">
				  Comparer prévision et réalité
				</h4>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed">
				  IRIS compare l'utilité théorique calculée lors de la préparation avec le niveau de satisfaction réellement ressenti par chacun.
				</p>
			  </div>

			  <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
				• Analyse des écarts
			  </div>
			</div>

			{/* Étape 3 */}
			<div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 rounded-3xl border border-purple-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			  <div>
				<span className="text-xs font-black tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block mb-6">
				  ÉTAPE 03
				</span>

				<h4 className="mb-3 text-xl font-bold text-slate-900">
				  Ajustements proposés
				</h4>

				<p className="text-slate-600 text-sm md:text-base leading-relaxed">
				  À partir de ces retours, IRIS peut suggérer des ajustements du profil individuel afin de mieux refléter les goûts observés au fil du temps.
				</p>
			  </div>

			  <div className="mt-6 pt-4 border-t border-purple-100 text-xs font-bold text-purple-700">
				• Modèle prédictif affiné
			  </div>
			</div>

		  </div>
		</div>

		{/* Section Évolution Prévue / Piliers techniques */}
		<div className="mt-20 w-full max-w-5xl mx-auto">
		  <div className="rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 shadow-sm relative overflow-hidden">

			<div className="grid gap-10 lg:grid-cols-3 items-start">

			  {/* Intro de l'évolution */}
			  <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-100 pb-8 lg:pb-0 lg:pr-8">
				<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-100">
				  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
				  Évolution prévue
				</span>

				<h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
				  Une amélioration progressive
				</h3>

				<p className="text-sm md:text-base leading-relaxed text-slate-600">
				  Les retours d'expérience ne servent pas uniquement à mesurer la réussite d'un événement, ils permettent également d'affiner la précision des décisions futures.
				</p>
			  </div>

			  {/* Deux Piliers Techniques */}
			  <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">

				{/* Bloc Profils */}
				<div className="rounded-2xl p-6 bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 hover:bg-purple-50/30 transition duration-200 flex flex-col justify-between">
				  <div>
					<div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-200/80 text-purple-700 mb-4">
					  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					  </svg>
					</div>

					<h4 className="mb-2 text-base font-bold text-slate-900">
					  Profils de préférences
					</h4>

					<p className="text-xs md:text-sm leading-relaxed text-slate-600">
					  Lorsqu'un écart apparaît entre la satisfaction attendue et la satisfaction constatée, IRIS adapte dynamiquement la pondération des critères.
					</p>
				  </div>
				</div>

				{/* Bloc Recommandations */}
				<div className="rounded-2xl p-6 bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 hover:bg-purple-50/30 transition duration-200 flex flex-col justify-between">
				  <div>
					<div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-200/80 text-purple-700 mb-4">
					  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					  </svg>
					</div>

					<h4 className="mb-2 text-base font-bold text-slate-900">
					  Qualité des recommandations
					</h4>

					<p className="text-xs md:text-sm leading-relaxed text-slate-600">
					  Les retours collectifs contribuent à qualifier précisément les activités et à mieux estimer la satisfaction future des prochains groupes.
					</p>
				  </div>
				</div>

			  </div>

			</div>

		  </div>
		</div>

	  </div>
	</section>

	{/* Transparence algorithmique */}
	<section className="bg-slate-50/50 py-28 px-6 border-b border-slate-200/60">

	  <div className="mx-auto max-w-7xl">

		{/* En-tête */}
		<div className="mb-16 text-center max-w-3xl mx-auto">
		  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-4">
			Transparence
		  </span>

		  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
			Comprendre les décisions
		  </h2>

		  <p className="text-slate-600 text-base md:text-lg leading-relaxed">
			Une décision collective n'a pas besoin d'être opaque pour être complexe. Chaque scénario proposé par IRIS peut être expliqué, retracé et librement discuté.
		  </p>
		</div>

		{/* Les 4 principes */}
		<div className="grid gap-8 lg:grid-cols-2 mb-20">

		  {/* Carte 1 */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>
			  <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full inline-block mb-6">
				PRINCIPE 01
			  </span>

			  <h3 className="mb-3 text-xl md:text-2xl font-bold text-slate-900">
				Préférences visibles
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Chaque participant peut consulter à tout moment les informations utilisées pour représenter ses choix et ajuster ses critères librement.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Contrôle total des données
			</div>
		  </div>

		  {/* Carte 2 */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>
			  <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full inline-block mb-6">
				PRINCIPE 02
			  </span>

			  <h3 className="mb-3 text-xl md:text-2xl font-bold text-slate-900">
				Calculs explicables
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Les mécanismes d'équité, de compensation historique et d'évaluation reposent sur des règles déterministes, ouvertes et documentées.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Algorithme auditable
			</div>
		  </div>

		  {/* Carte 3 */}
		  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>
			  <span className="text-xs font-black tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full inline-block mb-6">
				PRINCIPE 03
			  </span>

			  <h3 className="mb-3 text-xl md:text-2xl font-bold text-slate-900">
				Scénarios justifiés
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Chaque proposition peut être décomposée pour faire apparaître clairement les activités, contraintes et préférences qui ont mené à sa création.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
			  • Traçabilité des combinaisons
			</div>
		  </div>

		  {/* Carte 4 */}
		  <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 rounded-3xl border border-purple-200/80 p-8 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
			<div>
			  <span className="text-xs font-black tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block mb-6">
				PRINCIPE 04
			  </span>

			  <h3 className="mb-3 text-xl md:text-2xl font-bold text-slate-900">
				Décision humaine
			  </h3>

			  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
				Aucun arbitrage n'est imposé par la machine. Les membres du groupe demeurent les seuls décisionnaires du choix final.
			  </p>
			</div>

			<div className="mt-6 pt-4 border-t border-purple-100 text-xs font-bold text-purple-700">
			  • Souveraineté du groupe
			</div>
		  </div>

		</div>

		{/* Ce que les participants peuvent consulter */}
		<div className="mt-16 rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 shadow-sm max-w-5xl mx-auto">
		  <h3 className="mb-10 text-center text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
			Ce que les participants peuvent consulter
		  </h3>

		  <div className="grid gap-6 sm:grid-cols-2">

			<div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 transition duration-200">
			  <h4 className="font-bold text-slate-900 text-base mb-1">
				Profil de préférences
			  </h4>
			  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
				Les paramètres et coefficients utilisés pour estimer la satisfaction individuelle.
			  </p>
			</div>

			<div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 transition duration-200">
			  <h4 className="font-bold text-slate-900 text-base mb-1">
				Scores des scénarios
			  </h4>
			  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
				Les évaluations multi-critères détaillées produites par le moteur d'optimisation.
			  </p>
			</div>

			<div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 transition duration-200">
			  <h4 className="font-bold text-slate-900 text-base mb-1">
				Compensation historique
			  </h4>
			  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
				L'influence directe des compromis passés sur l'équité des événements actuels.
			  </p>
			</div>

			<div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/60 hover:border-purple-200 transition duration-200">
			  <h4 className="font-bold text-slate-900 text-base mb-1">
				Résultats du vote
			  </h4>
			  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
				La matrice des comparaisons par paires ayant permis de faire émerger le gagnant de Condorcet.
			  </p>
			</div>

		  </div>
		</div>

		{/* Bloc philosophie */}
		<div className="mt-20 mx-auto max-w-5xl">
		  <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 p-8 md:p-12 text-center shadow-sm">
			<h3 className="mb-4 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
			  La transparence fait partie intégrante de la méthode
			</h3>

			<p className="mx-auto max-w-3xl text-sm md:text-base leading-relaxed text-slate-600 mb-4">
			  L'objectif d'IRIS n'est pas uniquement de calculer de meilleurs compromis, mais de rendre intelligibles les mécanismes qui y conduisent.
			</p>

			<p className="mx-auto max-w-3xl text-sm md:text-base font-medium leading-relaxed text-purple-900">
			  Une décision collective est infiniment plus facile à accepter lorsque chacun en comprend le cheminement.
			</p>
		  </div>
		</div>

		{/* Transition finale vers la section Science */}
		<div className="mt-24 text-center max-w-3xl mx-auto">
		  <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3 py-1 rounded-full inline-block mb-4">
			Pour aller plus loin
		  </span>

		  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
			Cette page présente les principes généraux de la méthode IRIS. Les fondements théoriques, les choix méthodologiques et les modèles mathématiques sont détaillés dans la section{" "}
			<Link 
			  href="/science" 
			  className="text-sm font-semibold py-1.5 rounded-lg transition duration-200 no-underline text-slate-600 hover:text-purple-700 hover:bg-slate-50"
			>
			Science
			</Link>
			.
		  </p>
		</div>

	  </div>

	</section>
	
	{/* CTA de fin */}
	<section className="bg-slate-900 py-32 px-6">

	  <div className="mx-auto max-w-5xl text-center">

		<div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-400">
		  Explorer davantage
		</div>

		<h2 className="mb-8 text-5xl font-extrabold text-white">
		  La méthode n'est qu'une partie de l'histoire
		</h2>

		<p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-slate-300">
		  IRIS repose sur plusieurs concepts issus de la théorie du choix collectif,
		  de l'économie du bien-être et de la prise de décision collaborative.
		  Cette page présente leur mise en œuvre pratique.
		</p>

		<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">

		  <Link
			href="/science"
			className="rounded-xl bg-violet-600 px-8 py-4 font-semibold text-white transition hover:bg-violet-700"
		  >
			Explorer les fondements scientifiques
		  </Link>

		  <Link
			href="/auth/login"
			className="rounded-xl border border-slate-600 px-8 py-4 font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
		  >
			Tester la démonstration
		  </Link>

		</div>

	  </div>

	</section>
	
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
