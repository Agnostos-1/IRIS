// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

"use client";

import React from "react";

export default function IrisScientificArchitecture() {
  return (
    <section id="doc-section-architecture" className="bg-white py-24 px-6 border-t border-slate-100">
      <div className="mx-auto max-w-5xl">

        {/* En-tête principal */}
        <div className="mb-20 text-center">
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-700">
            Modélisation & Pipeline Technique
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            L'Architecture Algorithmique d'IRIS
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 mt-4">
            Du recueil des disponibilités jusqu'au choix démocratique, découvrez les 9 étapes du pipeline de calcul et le modèle de compensation hybride.
          </p>
        </div>

        {/* GRILLE DU PIPELINE DES 9 ÉTAPES */}
        <div className="space-y-10">
          <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-5 bg-violet-600 rounded-full inline-block"></span>
            Le Pipeline Algorithmique en 9 Étapes
          </h3>

          {/* ÉTAPE 1 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">1</span>
              <h4 className="text-lg font-bold text-slate-900">Disponibilités & Probabilité de Présence</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Pour chaque participant <em>u</em> et chaque date candidate <em>d</em>, le système enregistre un statut de disponibilité et, le cas échéant, une probabilité de présence réelle indépendante de ce statut :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              dispo(u, d) ∈ {`{ ok, cond, non }`} &nbsp;·&nbsp; p(u, d) ∈ [0, 1]
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Ce couple détermine le poids réel de <em>u</em> pour la date <em>d</em>, utilisé à chaque étape ultérieure d'agrégation :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              poids(u, d) = p(u,d)
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              p(u,d) vaut 1 pour une disponibilité certaine, et correspond à la valeur déclarée par l'utilisateur pour une disponibilité conditionnelle — 0,7 (70%) par défaut à l'écran, mais librement ajustable, et c'est bien cette valeur propre à chacun qui sert de poids, sans coefficient supplémentaire appliqué par-dessus. L'ensemble des participants actifs pour la date <em>d</em> est alors défini par actifs(d) = {`{ u | dispo(u,d) ∈ {ok, cond} }`}.
            </p>
          </div>

          {/* ÉTAPE 2 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">2</span>
              <h4 className="text-lg font-bold text-slate-900">Filtre des Contraintes Dures</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Soit <em>C</em> = {`{c₁, ..., c₁₉}`} l'ensemble des 19 clés de contrainte dure disponibles (accessibilité, régimes alimentaires, environnement sensoriel...). Chaque utilisateur active un sous-ensemble hard(u) ⊆ <em>C</em> dans son profil. Pour une activité <em>a</em>, chaque clé <em>c</em> est associée à un champ booléen indiquant si l'activité l'enfreint :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              enfreint(a, c) ∈ {`{0, 1}`}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Une dérogation ponctuelle, propre à un couple (utilisateur, activité) précis, peut neutraliser une clé au cas par cas — override(u, a, c) ∈ {`{0, 1}`}. L'exclusion effective en résulte :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              exclu(u, a) = 1 ⟺ ∃ c ∈ hard(u) : enfreint(a,c)=1 ∧ override(u,a,c)=0
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dès que exclu(u,a) = 1, l'utilité de <em>u</em> pour l'activité <em>a</em> est fixée à 0 et le reste s'annule mathématiquement — aucune pondération ultérieure ne peut compenser une contrainte dure violée.
            </p>
          </div>

          {/* ÉTAPE 3 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">3</span>
              <h4 className="text-lg font-bold text-slate-900">Génération Combinatoire des Scénarios</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Pour la date candidate <em>d</em>, la fenêtre horaire commune est l'intersection stricte des créneaux déclarés par tous les participants actifs :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              fenêtre(d) = [ max<sub>u∈actifs(d)</sub> début(u,d) , min<sub>u∈actifs(d)</sub> fin(u,d) ]
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Plutôt que de fixer un unique instant de départ, le moteur explore plusieurs horaires de démarrage candidats à l'intérieur de cette fenêtre, afin d'assembler différentes séquences d'activités compatibles. L'espace des scénarios réalisables pour la date <em>d</em> s'écrit :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              Ω(d) = {`{ S | durée(S) ⊆ fenêtre(d) ∧ coût(S) ≤ B ∧ trajet(S) ≤ D_max }`}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chaque candidat de <em>Ω(d)</em> est une séquence ordonnée d'activités assemblée en tenant compte des horaires d'ouverture de chacune et du temps de trajet entre elles, calculé sur le mode de transport le plus lent commun au groupe.
            </p>
          </div>

          {/* ÉTAPE 4 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">4</span>
              <h4 className="text-lg font-bold text-slate-900">Utilité Activité & Affinité Sociale</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Pour chaque activité <em>a</em> d'un scénario <em>S</em>, deux composantes sont évaluées pour l'utilisateur <em>u</em> : l'affinité déclarée pour ce type d'activité (avec héritage vers le type parent si le sous-type précis n'a pas été noté) f<sub>A</sub>(u,a), et l'adéquation du niveau social de l'activité avec celui recherché par <em>u</em>, f<sub>O</sub>(u,a). Ces deux valeurs vivent dans [0,1] et sont combinées selon les poids relatifs personnels r<sub>A</sub>, r<sub>O</sub> (r<sub>A</sub>+r<sub>O</sub>=1) :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              pondéré(a) = r<sub>A</sub>·f<sub>A</sub>(u,a) + r<sub>O</sub>·f<sub>O</sub>(u,a) &nbsp;∈&nbsp; [0, 1]
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Cette valeur est recentrée sur [-1, 1] — de sorte qu'une activité jugée neutre (0,5) devienne 0, ni positive ni négative — puis sommée sur l'ensemble des activités du scénario :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              Σ<sub>centrée</sub>(S) = Σ<sub>a∈S</sub> [ 2·pondéré(a) − 1 ]
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Une tangente hyperbolique ramène enfin cette somme dans [0,1] :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              u<sub>act</sub>(u, S) = ( tanh( Σ<sub>centrée</sub>(S) ) + 1 ) / 2
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              La tangente hyperbolique sature : empiler des activités déjà appréciées ne fait plus gagner grand-chose passé un certain seuil, alors qu'une activité franchement rejetée tire nettement le score vers le bas, en particulier dans un scénario court. La protection n'est donc pas symétrique — elle est délibérément plus sensible au rejet qu'à l'accumulation d'enthousiasme.
            </p>
          </div>

          {/* ÉTAPE 5 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">5</span>
              <h4 className="text-lg font-bold text-slate-900">Facteurs Horaires, Budget & Distance</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Trois facteurs indépendants complètent l'évaluation du scénario, chacun normalisé sur [0,1] :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              f<sub>S</sub>(u,S), f<sub>B</sub>(u,S), f<sub>D</sub>(u,S) ∈ [0, 1]
            </div>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 mb-3 list-none">
              <li><strong>f<sub>S</sub></strong> — croissant avec le taux de recouvrement entre le scénario et le créneau réellement disponible de <em>u</em>, décroissant avec le temps d'attente subi entre deux activités.</li>
              <li><strong>f<sub>B</sub></strong> — décroissant à mesure que le coût du scénario s'approche puis dépasse le budget déclaré par <em>u</em> ; identiquement égal à 1 si l'organisateur finance intégralement l'événement.</li>
              <li><strong>f<sub>D</sub></strong> — décroissant avec la distance totale à parcourir, calculée sur le mode de transport le plus lent commun au groupe.</li>
            </ul>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ces trois facteurs restent délibérément séparés de l'utilité d'activité — un scénario peut proposer une activité adorée mais mal desservie par les horaires ou le budget disponible ; les deux dimensions doivent pouvoir se contredire sans se masquer l'une l'autre.
            </p>
          </div>

          {/* ÉTAPE 6 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">6</span>
              <h4 className="text-lg font-bold text-slate-900">Compensation Historique (Rᵢ)</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Sur chaque événement passé <em>E</em>, l'écart entre l'utilité obtenue par <em>u</em> et la médiane du groupe pour ce même événement est capitalisé :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              δ(u, E) = médiane<sub>v∈E</sub>( u'(v,E) ) − u'(u,E)
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              La moyenne de ces écarts donne un coefficient brut, calculé séparément sur l'historique du groupe courant et sur l'historique global de l'utilisateur :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              R<sub>brut</sub> = 1 + ( Σδ / |événements| ) × 0.2
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Les deux valeurs obtenues (R<sub>groupe</sub>, R<sub>global</sub>) sont ensuite mélangées selon α, la part de l'historique réellement partagée avec ce groupe précis, puis écrêtées :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              Rᵢ = clamp( α·R<sub>groupe</sub> + (1−α)·R<sub>global</sub> , 0.5, 1.2 )
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Le détail complet de cette construction, ainsi que les cas limites (nouvel utilisateur, membre régulier, participant occasionnel), sont illustrés juste après le pipeline.
            </p>
          </div>

          {/* ÉTAPE 7 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">7</span>
              <h4 className="text-lg font-bold text-slate-900">Score Individuel Final</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Les cinq facteurs (activité+social, horaire, budget, distance) sont combinés selon les poids personnels de l'utilisateur w<sub>A</sub>, w<sub>O</sub>, w<sub>S</sub>, w<sub>B</sub>, w<sub>D</sub> (exprimés en pourcentage, Σw = 100), puis multipliés par le coefficient de compensation Rᵢ :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              u'(u,S) = min( 1, Rᵢ · [ (w<sub>A</sub>+w<sub>O</sub>)/100 · u<sub>act</sub>(u,S) + w<sub>S</sub>/100·f<sub>S</sub> + w<sub>B</sub>/100·f<sub>B</sub> + w<sub>D</sub>/100·f<sub>D</sub> ] )
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Le plafonnement à 1 empêche un coefficient Rᵢ favorable de faire dépasser à l'utilité individuelle son échelle normale — la compensation peut réparer un désavantage passé, jamais créer un privilège au-delà du maximum théorique.
            </p>
          </div>

          {/* ÉTAPE 8 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">8</span>
              <h4 className="text-lg font-bold text-slate-900">Score de Groupe & Front de Pareto Adaptatif</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Chaque scénario <em>S</em> produit un vecteur d'utilités individuelles u⃗(S) = ( u'(u₁,S), ..., u'(uₙ,S) ). Un scénario est dit dominé s'il en existe un autre qui égale ou dépasse chacune de ses valeurs, avec au moins une amélioration stricte :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              Ω*(d) = {`{ S ∈ Ω(d) | ∄ S' : u'(uᵢ,S') ≥ u'(uᵢ,S) ∀i, avec une inégalité stricte }`}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Parmi les scénarios non dominés, un score de groupe unique les classe — une moyenne géométrique pondérée par le poids de présence de chacun, avec un epsilon de stabilité numérique pour éviter un logarithme de zéro :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              W(S) = exp( Σ poids(u,d)·ln(0.01 + u'(u,S)) / Σ poids(u,d) )
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Une marge adaptative retient enfin les meilleurs scénarios non dominés, en s'élargissant automatiquement si trop peu de candidats subsistent :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              Finalistes = {`{ S ∈ Ω*(d) | W(S) ≥ (1 − marge)·max(W) }`} &nbsp;·&nbsp; marge ≥ 10%, [2 ≤ |Finalistes| ≤ 10]
            </div>
          </div>

          {/* ÉTAPE 9 */}
          <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 md:p-8 hover:bg-white hover:border-violet-200 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white shadow-sm font-mono shrink-0">9</span>
              <h4 className="text-lg font-bold text-slate-900">Scrutin Démocratique de Condorcet (Méthode de Black)</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Chaque participant classe librement les finalistes retenus à l'étape précédente. Une matrice de duels comptabilise, pour chaque paire, le nombre de votants préférant strictement l'un à l'autre :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              m<sub>jl</sub> = | {`{ u | S_j ≻_u S_l }`} |
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Un vainqueur de Condorcet existe s'il bat toutes les autres options en duel direct :
            </p>
            <div className="my-3 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
              S* vainqueur ⟺ m<sub>S*,l</sub> &gt; m<sub>l,S*</sub> &nbsp;∀ l ≠ S*
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              En l'absence de vainqueur (cycle intransitif), le décompte de Borda tranche — chaque rang attribué par chaque votant rapporte des points, et le total le plus élevé l'emporte. Ce départage se fait directement à partir des bulletins déposés par le groupe, jamais en revenant au score W(S) de l'algorithme : le dernier mot reste humain.
            </p>
          </div>
        </div>

        {/* FOCUS MATHÉMATIQUE SUR LA COMPENSATION HYBRIDE */}
        <div className="mt-20 border-t border-slate-200 pt-16">
          <div className="mb-10 text-center md:text-left">
            <span className="text-xs uppercase tracking-wider font-bold text-violet-700 block mb-1">Focus Algorithmique Avancé</span>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Rééquilibrage Temporel & Compensation Hybride
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Pour neutraliser l'effet d'exclusion au fil des événements, IRIS injecte un facteur de régulation dynamique basé sur l'historique des frustrations passées.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start bg-violet-50/40 border border-violet-100 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-lg font-bold text-violet-800">D'abord, comment se construit un R<sub>i</sub> brut</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sur chaque événement passé <em>E</em>, on compare l'utilité obtenue par la personne à la médiane du groupe pour ce même événement. Un écart positif signifie qu'elle a été moins bien servie que la médiane :
              </p>
              <div className="font-mono bg-slate-900 text-slate-200 rounded-xl p-3 text-center text-xs font-bold">
                δ(u, E) = médiane<sub>v∈E</sub>(u'(v,E)) − u'(u,E)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                La moyenne de ces écarts sur l'ensemble des événements pertinents donne le coefficient brut, avant écrêtage :
              </p>
              <div className="font-mono bg-slate-900 text-slate-200 rounded-xl p-3 text-center text-xs font-bold">
                R<sub>brut</sub> = 1 + ( Σδ / |événements| ) × 0.2
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Un historique purement global ignorerait les compromis spécifiques faits au sein d'un groupe d'amis soudés. À l'inverse, un historique purement local pénaliserait un invité occasionnel. IRIS résout cela en calculant <em>ce même R<sub>brut</sub></em> deux fois — une fois restreint aux événements du groupe courant, une fois sur l'ensemble de la plateforme — puis en les mélangeant selon la fidélité réelle au cercle d'amis.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cas particulier : un événement peut impliquer plusieurs groupes à la fois (une sortie mêlant deux cercles d'amis distincts, par exemple). Dans ce cas, il compte pour l'historique de <em>chacun</em> des groupes concernés, pas seulement pour un groupe "principal" — R<sub>groupe</sub> pour un groupe cible donné intègre alors tout événement passé partagé avec ce groupe, même celui-ci ayant par ailleurs impliqué d'autres groupes en parallèle.
              </p>

              <div className="grid gap-4 sm:grid-cols-3 text-[11px] pt-2">
                <div className="border border-violet-100 rounded-xl p-4 bg-white">
                  <span className="font-bold text-slate-900 block mb-1">Membre Régulier</span>
                  <p className="text-slate-500 leading-normal">α → 1. Seul l'historique interne du groupe fait foi.</p>
                </div>
                <div className="border border-violet-100 rounded-xl p-4 bg-white">
                  <span className="font-bold text-slate-900 block mb-1">Participant Occasionnel</span>
                  <p className="text-slate-500 leading-normal">α → 0. L'historique global amortit les variations de profil.</p>
                </div>
                <div className="border border-violet-100 rounded-xl p-4 bg-white">
                  <span className="font-bold text-slate-900 block mb-1">Nouvel Utilisateur</span>
                  <p className="text-slate-500 leading-normal">R<sub>i</sub> = 1.0. Point d'ancrage parfaitement neutre.</p>
                </div>
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl border border-violet-100 p-6 flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] font-mono text-violet-700 uppercase tracking-wider block mb-2">Formulations Strictes</span>
                <div className="font-mono bg-slate-900 text-slate-200 rounded-xl p-3 text-center text-xs font-bold mb-2">
                  α = E<sub>groupe</sub> / E<sub>total</sub>
                </div>
                <div className="font-mono bg-slate-900 text-slate-200 rounded-xl p-3 text-center text-xs font-bold mb-4">
                  R<sub>i</sub> = αR<sub>g</sub> + (1-α)R<sub>global</sub>
                </div>
              </div>
              <div className="border-t border-violet-100 pt-4">
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block mb-1">Cap d'Écrêtage Strict</span>
                <p className="text-[10px] text-slate-500 leading-normal font-mono">
                  R<sub>i</sub> ∈ [0.5, 1.2]
                </p>
                <p className="text-[10px] text-slate-500 leading-normal mt-1">
                  Ce garde-fou empêche tout participant ultra-frustré d'acquérir un droit de veto absolu ou de sur-fausser les utilités collectives lors de la session.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION : TABLEAU DE COMPARAISON AXIOMATIQUE
           ======================================================== */}
        <div className="mt-24">
          <div className="mb-8 text-center">
            <h3 className="text-3xl font-extrabold text-slate-900">
              Analyse Comparative des Modèles de Décision
            </h3>
            <p className="text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
              Ce que le protocole d'IRIS apporte face aux approches classiques — et ce qu'il en coûte. Une comparaison honnête suppose de reconnaître les compromis, pas seulement les gains.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="p-4">Propriété Axiomatique</th>
                  <th className="p-4">Moyenne Arithmétique (Sondages classiques)</th>
                  <th className="p-4">Scrutin Majoritaire (Doodle / Vote unique)</th>
                  <th className="p-4 bg-violet-50/50 text-violet-900">Modèle Hybride IRIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                <tr>
                  <td className="p-4 font-semibold text-slate-900">Protection Anti-Exclusion</td>
                  <td className="p-4 text-amber-700 font-medium">Faible (ignore le mal-être ciblé)</td>
                  <td className="p-4 text-amber-700 font-medium">Nulle (ignore les minorités)</td>
                  <td className="p-4 bg-violet-50/30 text-slate-700">Élevée (moyenne géométrique) — mais réciproquement plus sensible : un seul score très bas peut écarter un scénario que la majorité jugeait par ailleurs excellent</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900">Résistance au Vote Stratégique</td>
                  <td className="p-4">Moyenne (vulnérable à la manipulation des notes)</td>
                  <td className="p-4">Faible (vote utile systématique)</td>
                  <td className="p-4 bg-violet-50/30 text-slate-700">Meilleure que le vote à un tour, sans être immune — le théorème de Gibbard-Satterthwaite garantit qu'aucun scrutin ordinal à 3 options ou plus n'échappe totalement à la manipulation</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900">Prise en compte des Contraintes</td>
                  <td className="p-4">Manuelle (nécessite un arbitrage humain externe)</td>
                  <td className="p-4">Partielle (uniquement sur les dates)</td>
                  <td className="p-4 bg-violet-50/30 text-slate-700">Filtres durs multicritères — au prix d'un profil à configurer en amont, plus coûteux en temps qu'un simple sondage</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900">Mémoire Temporelle (Historique)</td>
                  <td className="p-4">Nulle (chaque événement redémarre à zéro)</td>
                  <td className="p-4">Nulle (aucun suivi des frustrations)</td>
                  <td className="p-4 bg-violet-50/30 text-slate-700">Active (compensation ex-post) — mais introduit un risque théorique de manipulation par simulation de frustration, atténué (non éliminé) par l'écrêtage [0.5, 1.2]</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900">Simplicité de mise en œuvre</td>
                  <td className="p-4 text-green-700 font-semibold">Élevée — un sondage suffit</td>
                  <td className="p-4 text-green-700 font-semibold">Élevée — une seule question</td>
                  <td className="p-4 bg-violet-50/30 text-amber-700 font-medium">Plus faible — la richesse du modèle a un coût réel en configuration initiale et en charge cognitive pour l'utilisateur</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================
            SECTION : CONCLUSION
           ======================================================== */}
        <div className="mt-24 border-t border-slate-200 pt-16">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-wider font-bold text-violet-700 mb-1">
              Synthèse
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Conclusion : un compromis assumé, pas un optimum universel
            </h3>
          </div>
          <div className="space-y-5 text-sm leading-relaxed text-slate-700 max-w-3xl">
            <p>
              Aucune des trois colonnes du tableau ci-dessus n'est strictement dominée par une autre. IRIS ne prétend pas remplacer un simple sondage dans toutes les situations — pour un choix binaire entre deux options sans enjeu d'équité, la moyenne arithmétique reste largement suffisante. Le protocole a du sens précisément quand plusieurs conditions se recoupent : des préférences hétérogènes, des contraintes dures réelles, et une relation qui se répète dans le temps — c'est-à-dire l'essentiel des décisions collectives récurrentes.
            </p>
            <p>
              Ce que le modèle apporte de spécifique, c'est de faire cohabiter deux logiques que la théorie du choix social oppose classiquement : maximiser la satisfaction collective (via l'agrégation géométrique de type Nash) et protéger l'équité individuelle dans la durée (via la compensation historique Rᵢ) — sans jamais retirer au groupe la décision finale, tranchée par un vote Condorcet transparent plutôt que par le score de l'algorithme lui-même.
            </p>

            <div className="my-10 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-8">
              <svg viewBox="0 0 900 300" width="100%" height="auto" role="img" aria-label="Schéma : des profils d'utilité individuels et des modèles de conséquence, partageant des variables communes, combinés par un calcul d'équité, réduits par un filtre, puis arbitrés par un vote">
                <defs>
                  <marker id="concl-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0 L0,7 L7,3.5 z" fill="#94A3B8" />
                  </marker>
                </defs>

                {/* Sources : profils et modèles de conséquence, convergeant vers les variables communes */}
                <line x1="150" y1="70" x2="272" y2="140" stroke="#C4B5FD" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />
                <line x1="150" y1="230" x2="272" y2="160" stroke="#C4B5FD" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />

                <rect x="10" y="40" width="140" height="60" rx="12" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="80" y="65" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4C1D95">Profils</text>
                <text x="80" y="80" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4C1D95">d'utilité</text>

                <rect x="10" y="200" width="140" height="60" rx="12" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="80" y="223" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4C1D95">Modèles de</text>
                <text x="80" y="238" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4C1D95">conséquence</text>
                <text x="80" y="252" textAnchor="middle" fontSize="9" fill="#7C3AED">(scénarios)</text>

                {/* Variables communes */}
                <rect x="290" y="115" width="130" height="70" rx="14" fill="#4C1D95" />
                <text x="355" y="145" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">Variables</text>
                <text x="355" y="160" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">communes</text>

                {/* Chaîne horizontale */}
                <line x1="420" y1="150" x2="472" y2="150" stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />
                <rect x="480" y="115" width="120" height="70" rx="14" fill="white" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="540" y="145" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E293B">Calcul</text>
                <text x="540" y="160" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E293B">d'équité</text>

                <line x1="600" y1="150" x2="652" y2="150" stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />
                <rect x="660" y="115" width="100" height="70" rx="14" fill="white" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="710" y="150" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E293B">Filtre</text>

                <line x1="760" y1="150" x2="812" y2="150" stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />
                <rect x="820" y="115" width="70" height="70" rx="14" fill="#7C3AED" />
                <text x="855" y="150" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">Vote</text>

                {/* Sortie vers décision, repliée en dessous pour rester dans le viewBox */}
                <line x1="855" y1="185" x2="855" y2="215" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="855" y1="215" x2="355" y2="215" stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#concl-arrow)" />
                <rect x="285" y="235" width="140" height="45" rx="12" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="355" y="263" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4C1D95">Décision</text>
              </svg>
              <p className="mt-4 text-xs text-slate-500 text-center max-w-2xl mx-auto">
                Deux entrées partageant les mêmes variables — ce que chacun veut, ce qu'implique chaque option — combinées par un calcul d'équité, réduites par un filtre, arbitrées par un vote.
              </p>
            </div>

            <p>
              Le modèle algorithmique décrit ici — profils d'utilité multi-attributs, agrégation géométrique pondérée, mémoire de compensation ex-post, arbitrage démocratique final — n'est pas intrinsèquement lié à l'organisation de sorties entre amis. Dès lors que les variables communes, les profils individuels et les modèles de conséquence d'un système de décision sont correctement définis, cette même structure s'applique à toute décision collective répétée où des préférences individuelles doivent être conciliées équitablement dans le temps : répartition de tâches ou de gardes au sein d'une équipe, budget participatif d'une association, allocation tournante de ressources partagées, ou arbitrages de comités. La démonstration actuelle d'IRIS teste ces principes sur un cas d'usage volontairement concret et à taille humaine ; l'architecture elle-même reste générique.
            </p>
          </div>
        </div>

        {/* ========================================================
            SECTION : BIBLIOGRAPHIE & RÉFÉRENCES ACADÉMIQUES
           ======================================================== */}
        <div className="mt-28 border-t border-slate-200 pt-16">
          <div className="mb-10">
            <div className="text-xs uppercase tracking-wider font-bold text-violet-700 mb-1">
              Rigueur Scientifique
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Bibliographie & Références de Recherche
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Les publications de référence fondant les choix axiomatiques et les garanties d'équité du protocole IRIS.
            </p>
          </div>

          <div className="space-y-4 font-sans">
            {[
              {
                authors: "Arrow, K. J.",
                year: "1951",
                title: "Social Choice and Individual Values",
                publisher: "John Wiley & Sons, New York (rééd. Yale University Press, 2012).",
                link: "https://www.jstor.org/stable/j.ctt1nqb90",
                linkLabel: "Lien stable (JSTOR)",
                desc: "Théorème fondamental démontrant l'impossibilité de concevoir une règle de vote idéale à partir de classements ordinaux purs sans violer un axiome de rationalité élémentaire, motivant l'usage initial d'utilités cardinales par IRIS."
              },
              {
                authors: "von Neumann, J. & Morgenstern, O.",
                year: "1944",
                title: "Theory of Games and Economic Behavior",
                publisher: "Princeton University Press, Princeton.",
                link: "https://www.jstor.org/stable/j.ctt1r2gkx",
                linkLabel: "Lien stable (JSTOR)",
                desc: "Axiomatisation de l'utilité cardinale et fondement de la théorie de la décision multi-attributs, à l'origine de la représentation des préférences individuelles sur une échelle continue utilisée par IRIS."
              },
              {
                authors: "Nash, J.",
                year: "1950",
                title: "The Bargaining Problem",
                publisher: "Econometrica, vol. 18, no. 2, pp. 155–162.",
                doi: "10.2307/1907266",
                desc: "Axiomatisation du produit des utilités individuelles comme l'unique solution satisfaisant l'invariance par changement d'échelle, l'indépendance des alternatives non pertinentes et la Pareto-optimalité."
              },
              {
                authors: "Black, D.",
                year: "1958",
                title: "The Theory of Committees and Elections",
                publisher: "Cambridge University Press, Cambridge (rééd. Springer, 1987).",
                doi: "10.1007/978-94-009-4225-7",
                desc: "Formalisation du vainqueur de Condorcet et de la règle de départage par comptage de Borda en cas de cycle — la méthode combinée porte aujourd'hui le nom de méthode de Black, directement reprise à l'étape 9 du pipeline IRIS."
              },
              {
                authors: "Sen, A.",
                year: "1970",
                title: "Collective Choice and Social Welfare",
                publisher: "Holden-Day, San Francisco (éd. augmentée, Harvard University Press, 2017).",
                doi: "10.4159/9780674974616",
                desc: "Introduction des concepts de comparaisons interpersonnelles d'utilités et approfondissement de la justice rawlsienne (Maximin), au cœur des pondérations temporelles ex-post d'IRIS."
              },
              {
                authors: "Moulin, H.",
                year: "2003",
                title: "Fair Division and Collective Welfare",
                publisher: "MIT Press, Cambridge.",
                doi: "10.7551/mitpress/2954.001.0001",
                desc: "Analyse approfondie de la justice distributive algorithmique et des mécanismes de partage exempts d'envie (Envy-Freeness) appliqués à l'allocation dynamique de ressources."
              }
            ].map((ref, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6 hover:border-violet-200 hover:bg-white transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {ref.authors} ({ref.year}). <span className="italic text-violet-900 font-medium">{ref.title}</span>
                  </span>
                  <a
                    href={ref.doi ? `https://doi.org/${ref.doi}` : ref.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-700 text-[11px] font-mono transition-colors border border-slate-200/60"
                  >
                    {ref.doi ? `DOI:${ref.doi}` : ref.linkLabel}
                  </a>
                </div>
                <p className="text-xs text-slate-400 font-mono mb-2">{ref.publisher}</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 rounded-xl p-3">
                  {ref.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            SECTION : AJOUTS FUTURS & RECHERCHE APRES LA DEMO
           ======================================================== */}
        <div className="mt-28 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-14 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-violet-400">
              Perspectives Évolutives
            </div>
            <h3 className="text-3xl font-bold tracking-tight mb-4">
              Perspectives de Recherche Future
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Après la validation empirique du modèle actuel lors de la phase de démonstration, les travaux de recherche s'orienteront vers l'intégration de couches d'intelligence contextuelle avancée.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 text-xs">
              <div className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
                <h4 className="font-bold text-violet-300 text-sm mb-2">Agents IA Prédictifs</h4>
                <p className="text-slate-300 leading-relaxed">
                  Analyse automatisée des retours de feedback post-événement par traitement du langage naturel (NLP) pour corriger dynamiquement et sans friction les profils d'utilité abstraits des utilisateurs.
                </p>
              </div>
              <div className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
                <h4 className="font-bold text-violet-300 text-sm mb-2">Variabilité Endogène</h4>
                <p className="text-slate-300 leading-relaxed">
                  Modélisation de critères de diversité pour introduire un facteur d'exploration contrôlé, évitant ainsi le risque d'enfermement des groupes dans des typologies d'activités redondantes.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
