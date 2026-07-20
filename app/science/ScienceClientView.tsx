// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

"use client";

import React, { useEffect } from "react";

export function ScienceClientView({ initialData }: { initialData: any }) {
  
  // Écouteur pour capter le clic sur le SVG de ScientificNodeMap
  useEffect(() => {
    const handleDisciplineClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        // Mapping pour s'assurer de cibler le bon ID HTML
        let targetId = customEvent.detail.id;
		if (targetId === "iris-core") {
			const element = document.getElementById("doc-section-architecture");
			if (element) {
			  element.scrollIntoView({ behavior: "smooth", block: "start" });
			}
			return;
        }
        if (targetId === "welfare-econ") targetId = "welfare";
        if (targetId === "game-theory") targetId = "fairness";
        
        const element = document.getElementById(`doc-section-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    window.addEventListener("scientific-node-click", handleDisciplineClick);
    return () => window.removeEventListener("scientific-node-click", handleDisciplineClick);
  }, []);

  return (
    <div className="w-full bg-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-5xl py-16 px-6 space-y-32">
        
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Documentation Scientifique Approfondie
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Étude détaillée des 5 piliers axiomatiques fondant le protocole IRIS. Cliquez sur les bulles du graphe interactif ci-dessus pour accéder directement aux sections de recherche.
          </p>
        </div>

        {/* ========================================================================
            SECTION 5.1 : THÉORIE DU CHOIX SOCIAL
           ======================================================================== */}
        <section id="doc-section-social-choice" className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 p-8 md:p-14 shadow-sm">
          <div className="border-b border-slate-150 pb-6 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
              Discipline Économique Principale
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              1. Théorie du Choix Social & Règles d'Agrégation
            </h3>
            <p className="text-slate-500 italic text-sm mt-1">
              Modélisation constitutionnelle des volontés individuelles et limites de l'ingénierie du vote.
            </p>
          </div>

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">A. Introduction & Fondations Théoriques</h4>
              <p>
                La Théorie du Choix Social analyse formellement la possibilité de construire une fonction de décision collective à partir de profils de préférences individuels hétérogènes. Initiée mathématiquement par les travaux précurseurs de Nicolas de Condorcet et du Chevalier de Borda au XVIIIe siècle, elle pose une question fondamentale : peut-on concevoir une règle de décision démocratique qui soit à la fois juste, rationnelle, cohérente et immune aux comportements stratégiques (manipulations) ?
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">B. État de l'Art & Modèles de Consensus</h4>
              <p>
                Le consensus moderne repose sur le constat d'une impasse ordinale, formalisée par Kenneth Arrow. Lorsque les agents classent simplement leurs choix de manière ordinale (Option A &gt; Option B &gt; Option C), aucun mécanisme de vote ne peut garantir simultanément un ensemble de critères de rationalité pourtant raisonnables pris un par un. Face à cette limite, une partie de la recherche contemporaine explore des structures de vote préférentiel par classement complet (méthodes de Condorcet) ou des évaluations fondées sur la notation continue (vote par valeur/approbation) pour réinjecter de la nuance — sans qu'aucune de ces approches ne "résolve" à proprement parler le théorème d'Arrow : elles en contournent la prémisse ordinale, chacune important ses propres limites (comparaison interpersonnelle des utilités, manipulation des notations).
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">C. Formalisation Mathématique Inspirée</h4>
              <p>
                Le modèle s'appuie sur la formalisation matricielle des duels de Condorcet. Soit un ensemble de participants <em>V</em> et un ensemble d'options <em>X</em>. On construit la matrice des préférences majoritaires <strong>M</strong> où chaque entrée <em>m<sub>jk</sub></em> comptabilise le nombre d'agents préférant strictement l'alternative <em>j</em> à l'alternative <em>k</em> :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                m<sub>jk</sub> = |{`{ i ∈ V | x_j ≻_i x_k }`}|
              </div>
              <p>
                Une alternative <em>x<sup>*</sup></em> est un Vainqueur de Condorcet si et seulement si pour toute autre alternative <em>y</em>, <em>m<sub>x<sup>*</sup>y</sub> &gt; m<sub>yx<sup>*</sup></sub></em>.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">D. Applications Contemporaines & Limites</h4>
              <p>
                Ces théories s'appliquent aujourd'hui aux algorithmes de recommandation de groupe, aux systèmes de gouvernance décentralisés (DAOs), et aux modes de scrutin complexes (Scrutin à vote unique transférable). Cependant, la limite majeure réside dans le <strong>Paradoxe de Condorcet</strong> (intransitivité collective : le groupe préfère A à B, B à C, et C à A). De plus, le théorème de Gibbard-Satterthwaite démontre que tout scrutin ordinal comportant plus de 3 alternatives est sujet au vote stratégique (mensonge sur ses préférences pour faire gagner une autre option).
              </p>
            </div>

            <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-violet-800 mb-2">E. Ancrage & Application dans le Protocole IRIS</h4>
              <p className="text-slate-800">
                IRIS résout l'impasse du choix social en n'appliquant pas le vote ordinal d'emblée sur l'immensité de l'espace combinatoire (ce qui provoquerait des cycles systématiques et une charge cognitive insurmontable). L'algorithme opère un <strong>couplage strict</strong> : il utilise d'abord l'évaluation quantitative continue pour filtrer et extraire un "Front de Pareto adaptatif" d'excellence contenant entre 2 et 10 options finalistes. Ce n'est qu'ensuite que ces finalistes d'élite sont soumis à la <strong>Méthode de Black</strong> (qui valide le vainqueur de Condorcet s'il existe, et bascule sur le score de Borda en cas de cycle). Cela ne supprime pas la possibilité théorique de vote stratégique établie par Gibbard-Satterthwaite — aucun scrutin ordinal ne le peut — mais réduit fortement le nombre d'options sur lesquelles un tel calcul devient praticable, tout en préservant une réelle robustesse politique face aux blocs minoritaires.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================
            SECTION 5.2 : ÉCONOMIE DU BIEN-ÊTRE
           ======================================================================== */}
        <section id="doc-section-welfare" className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 p-8 md:p-14 shadow-sm">
          <div className="border-b border-slate-150 pb-6 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
              Axiomatique Distributive
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              2. Économie du Bien-être & Fonctions de Bien-être Social (SWF)
            </h3>
            <p className="text-slate-500 italic text-sm mt-1">
              Modélisation de l'optimum social et arbitrage entre efficacité globale et équité.
            </p>
          </div>

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">A. Introduction & Fondations Théoriques</h4>
              <p>
                L'Économie du Bien-être est la branche de la microéconomie quantitative qui cherche à évaluer la désirabilité d'allocations alternatives de ressources pour une société. Elle formalise les notions d'optimalité économique et cherche à traduire mathématiquement des notions philosophiques et morales de justice distributive (notamment à travers l'utilitarisme de Bentham et le principe d'équité de John Rawls) sous la forme de Fonctions de Bien-être Social (Social Welfare Functions).
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">B. État de l'Art & Modèles de Consensus</h4>
              <p>
                Le consensus académique distingue deux grandes familles de fonctions d'agrégation du bien-être. La première est la <strong>Fonction Utilitariste</strong>, qui calcule la somme ou la moyenne arithmétique brute des utilités individuelles ; sa limite est qu'elle tolère le sacrifice ou l'exclusion d'une minorité si le gain de la majorité est supérieur. La seconde est la <strong>Fonction Egalitariste de Rawls (Maximin)</strong>, qui évalue le bien-être du groupe à l'aune unique du membre le plus défavorisé ; sa limite est qu'elle engendre une paralysie de l'optimisation collective dès qu'un agent bute sur un niveau de satisfaction bas.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">C. Formalisation Mathématique Inspirée</h4>
              <p>
                Parmi les propositions cherchant à concilier ces deux extrêmes, celle du <strong>Nash Social Welfare (NSW)</strong> occupe une place particulièrement étudiée — sans qu'elle fasse pour autant l'objet d'un consensus exclusif : le leximin égalitariste ou les indices d'Atkinson restent des alternatives sérieusement défendues en économie du bien-être. Soit un vecteur d'utilités individuelles <em>(U<sub>1</sub>, U<sub>2</sub>, ..., U<sub>N</sub>)</em> pour une allocation donnée <em>S</em>. La fonction de bien-être de Nash calcule le produit géométrique des utilités, ou de manière équivalente, la somme de leurs logarithmes :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                W<sub>Nash</sub>(S) = [ ∏<sub>i=1</sub><sup>N</sup> U<sub>i</sub>(S) ]<sup>1/N</sup> = exp( 1/N ∑<sub>i=1</sub><sup>N</sup> ln(U<sub>i</sub>(S)) )
              </div>
              <p>
                Cette formulation mathématique impose une concavité stricte qui pénalise de manière exponentielle les valeurs proches de zéro.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">D. Applications Contemporaines & Limites</h4>
              <p>
                Le Nash Social Welfare est intensivement utilisé dans la recherche sur le <em>Fair Division</em> (partage de biens indivisibles), l'allocation équitable de bandes passantes dans les réseaux informatiques et la tarification des ressources énergétiques. Sa limite principale est qu'il exige des <strong>utilités strictement positives</strong> : si un seul agent possède une utilité de 0 pour une option, le produit global s'effondre à 0, rendant la fonction hyper-sensible aux veto individuels si l'espace combinatoire n'est pas rigoureusement filtré ex-ante.
              </p>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-blue-800 mb-2">E. Ancrage & Application dans le Protocole IRIS</h4>
              <p className="text-slate-800">
                IRIS adopte le <strong>Nash Social Welfare (Moyenne Géométrique)</strong> comme axe central du calcul de son score de bien-être collectif. En multipliant les utilités plutôt qu'en les additionnant, l'algorithme d'IRIS agit comme un <strong>bouclier anti-exclusion</strong> pour les minorités ou les membres timides du groupe. Par exemple, si un scénario plaît énormément à 5 participants (note 90/100) mais isole totalement un sixième (note 5/100), la moyenne arithmétique classique donnerait un score encore engageant (75,8/100) et validerait l'option, créant de la frustration. La moyenne géométrique d'IRIS, elle, fait chuter la note collective à 55,6/100 — un écart de vingt points qui suffit, une fois comparé aux autres scénarios candidats, à faire préférer un compromis harmonieux où chacun obtient une utilité acceptable.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================
            SECTION 5.3 : THÉORIE DE LA DÉCISION
           ======================================================================== */}
        <section id="doc-section-decision" className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 p-8 md:p-14 shadow-sm">
          <div className="border-b border-slate-150 pb-6 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              Préférences Individuelles
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              3. Théorie de la Décision & Modélisation Multi-Attributs
            </h3>
            <p className="text-slate-500 italic text-sm mt-1">
              Quantification des utilités cardinales individuelles et modélisation des barrières de tolérance.
            </p>
          </div>

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">A. Introduction & Fondations Théoriques</h4>
              <p>
                La Théorie de la Décision modélise le comportement d'un agent rationnel confronté à des choix multi-critères. Fondée sur l'axiomatique de Von Neumann-Morgenstern, elle démontre que les choix d'un individu peuvent être représentés fidèlement par une fonction d'utilité cardinale continue. La branche spécifique de la théorie multi-attributs (MAUT - Multi-Attribute Utility Theory) étudie comment décomposer la valeur globale d'une alternative complexe en un ensemble de sous-dimensions quantifiables.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">B. État de l'Art & Modèles de Consensus</h4>
              <p>
                Les modèles de consensus contemporains stipulent qu'une préférence humaine ne peut se résumer à un choix binaire ou à une seule variable (comme le prix). Pour capturer fidèlement l'affinité d'un agent pour une option, il faut modéliser indépendamment les dimensions d'utilité, appliquer des transformations monotones non-linéaires pour refléter l'aversion au risque ou aux surcoûts, et introduire des <strong>seuils de contraintes absolues (filtres durs)</strong> sous peine de rendre le modèle déconnecté de la réalité psychologique de l'agent.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">C. Formalisation Mathématique Inspirée</h4>
              <p>
                Soit une alternative <em>a</em> caractérisée par un ensemble de critères <em>C</em>. L'utilité cardinale d'un agent <em>u</em> pour cette alternative est formulée par une combinaison pondérée des fonctions de valeur de chaque critère :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                u(u, a) = ∑<sub>c ∈ C</sub> w<sub>u,c</sub> · v<sub>u,c</sub>(a<sub>c</sub>)
              </div>
              <p>
                Où <em>w<sub>u,c</sub></em> représente le poids d'importance accordé par l'utilisateur au critère <em>c</em> (avec ∑ w = 1), et <em>v<sub>u,c</sub></em> est la fonction de score normalisant la valeur brute du critère sur une échelle homogène absolue de [0, 100].
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">D. Applications Contemporaines & Limites</h4>
              <p>
                Cette ingénierie de la décision sous-tend les progiciels d'aide à la décision industrielle, le yield management aéroportuaire, et la modélisation des choix d'investissements. Sa principale limite réside dans la <strong>charge cognitive de paramétrage</strong> : demander à un utilisateur d'expliciter manuellement ses poids d'importance et ses fonctions de valeur pour chaque critère est fastidieux et génère un fort taux d'abandon.
              </p>
            </div>

            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-purple-800 mb-2">E. Ancrage & Application dans le Protocole IRIS</h4>
              <p className="text-slate-800">
                IRIS s'inspire de la MAUT sans en reprendre la formulation la plus classique. Plutôt qu'une somme pondérée uniforme sur des dimensions indépendantes, l'affinité pour une activité et le niveau social recherché sont d'abord combinés puis recentrés autour de zéro pour chaque activité du scénario, avant d'être sommés et ramenés dans l'intervalle [0,1] par une tangente hyperbolique — une façon de saturer l'accumulation d'enthousiasme tout en laissant un net rejet peser lourdement sur le résultat. Trois autres facteurs (adéquation horaire, budgétaire et distance) restent volontairement séparés de cette évaluation par activité, et s'appliquent au niveau du scénario dans son ensemble : une activité adorée mais mal desservie par les horaires ne doit pas voir son défaut masqué par l'enthousiasme qu'elle suscite par ailleurs. Pour contourner la limite de la charge cognitive de paramétrage, IRIS ne demande explicitement que les poids relatifs entre ces dimensions, pas les fonctions de valeur elles-mêmes. Surtout, IRIS couple cette évaluation à <strong>19 clés de contraintes dures (Filtres Durs)</strong> : si une option viole une contrainte éliminatoire (un restaurant non compatible avec un régime alimentaire strict, par exemple), la fonction d'utilité individuelle s'effondre mathématiquement à 0 avant toute agrégation, protégeant l'intégrité du participant.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================
            SECTION 5.4 : INTELLIGENCE COLLECTIVE ALGORITHMIQUE
           ======================================================================== */}
        <section id="doc-section-collective-intelligence" className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 p-8 md:p-14 shadow-sm">
          <div className="border-b border-slate-150 pb-6 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
              Optimisation Combinatoire
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              4. Intelligence Collective Algorithmique & Génération Combinatoire
            </h3>
            <p className="text-slate-500 italic text-sm mt-1">
              Exploration massive d'espaces distribués et mécanismes d'émergence de solutions optimales.
            </p>
          </div>

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">A. Introduction & Fondations Théoriques</h4>
              <p>
                L'Intelligence Collective Algorithmique traite de la capacité de systèmes informatiques distribués à résoudre des problèmes d'optimisation complexes qu'aucun agent humain ou sous-comité isolé ne pourrait appréhender. La vulgarisation de James Surowiecki (<em>La Sagesse des Foules</em>) en a popularisé l'intuition, mais son socle mathématique rigoureux repose sur des résultats plus anciens et précisément nommés — le théorème du jury de Condorcet, puis le théorème de diversité prédictive de Scott Page — qui explorent comment la mise en commun structurée de jugements individuels imparfaits peut faire émerger une estimation collective plus fiable que celle du meilleur expert isolé.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">B. État de l'Art & Modèles de Consensus</h4>
              <p>
                Le consensus scientifique moderne se concentre sur la résolution des problèmes d'explosion combinatoire (NP-complets). Lorsque plusieurs contraintes de temps, de ressources et de choix discrets se croisent, le nombre de combinaisons théoriquement possibles grandit de manière exponentielle. L'état de l'art n'utilise plus de simples algorithmes de force brute, mais des moteurs de génération couplés à des filtres heuristiques capables d'élaguer l'arbre de décision en temps réel pour ne conserver que les combinaisons viables.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">C. Formalisation Mathématique Inspirée</h4>
              <p>
                Soit <em>A</em> l'ensemble global des éléments disponibles et <em>T</em> l'horizon temporel du problème. L'espace combinatoire total <strong>Ω</strong> est l'ensemble de toutes les combinaisons <em>S</em> formées par des enchaînements valides. La recherche cherche à maximiser le rendement en éliminant ex-ante les sous-ensembles non viables :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                Ω<sub>élagué</sub> = {`{ S ∈ A^K | Durée(S) ≤ D_max ∧ Coût(S) ≤ B }`}
              </div>
              <p>
                Où <em>K</em>, la taille de la combinaison, n'a pas à être fixé a priori : il peut résulter directement des autres contraintes du problème (durée, coût) plutôt que d'un plafond arbitraire.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">D. Applications Contemporaines & Limites</h4>
              <p>
                Ces concepts gouvernent les algorithmes de logistique internationale, la génération automatique d'emplois du temps universitaires complexes, et la planification de missions spatiales multi-satellites. La limite inhérente est la <strong>perte de contrôle utilisateur</strong> : si le moteur algorithmique fonctionne de manière opaque ("boîte noire"), les utilisateurs rejettent les solutions proposées, même si celles-ci sont mathématiquement parfaites, par manque de sentiment d'agence (empowerment).
              </p>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-indigo-800 mb-2">E. Ancrage & Application dans le Protocole IRIS</h4>
              <p className="text-slate-800">
                Dans IRIS, l'intelligence collective se matérialise par son <strong>moteur de génération de scénarios (Étape 3 du pipeline)</strong>. Au lieu de forcer les utilisateurs à négocier de longues heures ou à voter sur des dates isolées, l'algorithme d'IRIS ingère en parallèle toutes les contraintes et crée un <strong>vrai maillage de réseau distribué</strong>. Il explore l'espace combinatoire pour assembler des enchaînements d'activités (ex: un brunch à 11h, suivi d'un escape game à 14h, suivi d'un verre à 17h) cohérents en termes de temps de trajet et d'enveloppe budgétaire, dont le nombre n'est limité que par ce qui tient effectivement dans la fenêtre commune. Pour lever la limite de la "boîte noire", IRIS restitue la main aux participants lors de l'étape finale en soumettant les scénarios au vote préférentiel de Condorcet, réconciliant ainsi l'hyper-efficacité de l'exploration de données et la souveraineté humaine.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================
            SECTION 5.5 : ÉQUITÉ ALGORITHMIQUE & THÉORIE DES JEUX
           ======================================================================== */}
        <section id="doc-section-fairness" className="scroll-mt-28 bg-white rounded-3xl border border-slate-200 p-8 md:p-14 shadow-sm">
          <div className="border-b border-slate-150 pb-6 mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full">
              Régulation Temporelle
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              5. Équité Algorithmique, Théorie des Jeux & Compensation Historique
            </h3>
            <p className="text-slate-500 italic text-sm mt-1">
              Stabilité coopérative, concepts d'absence d'envie (Envy-Freeness) et justice corrective temporelle.
            </p>
          </div>

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">A. Introduction & Fondations Théoriques</h4>
              <p>
                L'Équité Algorithmique, couplée à la Théorie des Jeux Coopératifs, étudie les mécanismes d'interaction entre agents rationnels cherchant à maximiser leur intérêt propre tout en coopérant pour stabiliser le groupe. Elle introduit des critères géométriques stricts de justice relationnelle, notamment le concept d'<strong>absence d'envie (Envy-Freeness)</strong> : une allocation est jugée exempte d'envie si aucun joueur ne préfère le package de ressources attribué à un autre joueur plutôt que le sien.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">B. État de l'Art & Modèles de Consensus</h4>
              <p>
                Un constat largement partagé, sans qu'il s'agisse d'un théorème unique et nommé, est qu'une décision collective ponctuelle ne peut satisfaire pleinement tout le monde à un instant T dès que les préférences des agents divergent fortement. Une partie de la recherche sur l'allocation équitable se penche donc sur des modèles dynamiques et intertemporels : si un agent accepte une concession lors d'un épisode donné, il est raisonnable — bien que cela reste un choix de conception plutôt qu'une conséquence mathématique obligée — de vouloir capitaliser cet écart pour le compenser lors des arbitrages suivants.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">C. Formalisation Mathématique Inspitée</h4>
              <p>
                Pour modéliser l'équilibre d'un participant au sein de plusieurs cercles d'amis, la recherche applique des équations de lissage barycentrique. Soit l'historique des frustrations d'un individu <em>i</em>. Le coefficient d'atténuation <em>α</em> mesure sa fidélité à un groupe donné :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                α = E<sub>groupe</sub> / E<sub>total</sub>
              </div>
              <p>
                L'indice de compensation effectif <strong>R<sub>i</sub></strong> est calculé en fusionnant l'historique interne du groupe et l'historique global de l'utilisateur sur la plateforme :
              </p>
              <div className="my-4 font-mono bg-slate-900 text-slate-200 text-center py-3 rounded-xl text-xs">
                R<sub>i</sub> = α · R<sub>groupe</sub> + (1 - α) · R<sub>global</sub>
              </div>
              <p>
                Avec un encadrement strict par un cap d'écrêtage : <em>R<sub>i</sub> ∈ [0.5, 1.2]</em>.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">D. Applications Contemporaines & Limites</h4>
              <p>
                Ces modèles dynamiques de régulation gouvernent les systèmes de compensation de vols des compagnies aériennes, la répartition des charges de copropriété complexes, et la planification équitable des plannings de garde hospitaliers. Sa limite majeure est le <strong>risque de manipulation ou de chantage à la frustration</strong> : si le système accorde un poids trop élevé à un agent frustré, celui-ci est incité à simuler une insatisfaction permanente pour acquérir une position de dictateur mathématique lors des sessions suivantes.
              </p>
            </div>

            <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-800 mb-2">E. Ancrage & Application dans le Protocole IRIS</h4>
              <p className="text-slate-800">
                IRIS implémente cette gestion temporelle à travers son <strong>Modèle de Compensation Historique Hybride (Étape 6 et 7 du pipeline)</strong>. Pour neutraliser tout risque de chantage à la frustration (la limite théorique), IRIS applique un <strong>cap d'écrêtage strict entre 0.5 et 1.2</strong>. Même si un participant a fait d'immenses concessions lors des trois derniers événements, son multiplicateur <em>R<sub>i</sub></em> ne pourra jamais dépasser 1.2, empêchant ainsi qu'il n'obtienne un droit de veto ou qu'il ne détruise le bien-être général du groupe — sans pour autant éliminer complètement le risque théorique, seulement l'atténuer. De plus, grâce au calcul de l'atténuation <em>α</em>, l'algorithme fait la distinction entre un membre régulier (<em>α → 1</em>, où seule la mémoire interne du groupe compte) et un invité occasionnel multi-groupes (<em>α → 0</em>, où son historique global d'utilisateur régule son intégration).
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}