// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const DISCIPLINES = [
  {
    id: "social-choice",
    title: "Choix social",
    shortTitle: "Choix\nsocial",
    color: "#6D28D9",
    bg: "#F3E8FF",
    x: 50,
    y: 12,
    description:
      "Étudie les mécanismes d'agrégation des préférences individuelles en une décision collective, en analysant la cohérence logique des règles de vote.",
    irisContributions: [
      "Résolution des paradoxes d'agrégation",
      "Calcul de vainqueur de Condorcet",
      "Réduction de la fenêtre de manipulation stratégique"
    ],
    foundations: [
      "Théorème d'impossibilité d'Arrow",
      "Théorème de Gibbard-Satterthwaite",
      "Paradoxe de Condorcet"
    ],
    limitations: [
      "Incohérence potentielle des majorités",
      "Vulnérabilité aux manipulations stratégiques"
    ]
  },
  {
    id: "welfare",
    title: "Bien-être social",
    shortTitle: "Bien-être\nsocial",
    color: "#2563EB",
    bg: "#DBEAFE",
    x: 88,
    y: 38,
    description:
      "Évalue et compare mathématiquement les états sociaux induits par une décision collective afin de maximiser l'optimum du groupe.",
    irisContributions: [
      "Maximisation du Nash Social Welfare (NSW)",
      "Préservation de la Pareto-optimalité",
      "Inspiration de l'invariance d'échelle des utilités"
    ],
    foundations: [
      "Fonctions de Bien-être Social Cardinales",
      "Critère d'optimalité de Pareto",
      "Axiomatique du produit de Nash"
    ],
    limitations: [
      "Arbitrage critique efficacité vs justice économique",
      "Difficulté de comparaison interpersonnelle des utilités"
    ]
  },
  {
    id: "decision",
    title: "Théorie de la décision",
    shortTitle: "Théorie de la\ndécision",
    color: "#7C3AED",
    bg: "#EDE9FE",
    x: 80,
    y: 75,
    description:
      "Modélise les comportements et les choix d'un agent rationnel face à des options multi-critères et sous contraintes dures.",
    irisContributions: [
      "Construction de fonctions d'utilité cardinale",
      "Normalisation des préférences individuelles",
      "Modélisation des contraintes absolues (Hard Constraints)"
    ],
    foundations: [
      "Théorie de l'utilité espérée (Von Neumann-Morgenstern)",
      "Rationalité limitée (Herbert Simon)",
      "Multi-Attribute Utility Theory (MAUT)"
    ],
    limitations: [
      "Biais cognitifs d'évaluation",
      "Difficulté d'expression des préférences abstraites"
    ]
  },
  {
    id: "collective-intelligence",
    title: "Intelligence collective",
    shortTitle: "Intelligence\ncollective",
    color: "#0891B2",
    bg: "#CFFAFE",
    x: 16,
    y: 75,
    description:
      "Analyse comment la mise en commun des informations distribuées au sein d'un groupe permet de converger vers des solutions optimales.",
    irisContributions: [
      "Exploitation de la diversité cognitive",
      "Décentralisation de la génération de scénarios",
      "Apprentissage itératif du groupe"
    ],
    foundations: [
      "Théorème du jury de Condorcet",
      "Wisdom of Crowds (Surowiecki)",
      "Théorème de la diversité prédictive (Page)"
    ],
    limitations: [
      "Risque d'effets de cascade et de pensée de groupe",
	  "Biais du juste milieu (recherche d'un compromis tiède au détriment de l'optimum)",
      "Biais de conformisme social"
    ]
  },
  {
    id: "fairness",
    title: "Équité algorithmique",
    shortTitle: "Équité\nalgorithmique",
    color: "#9333EA",
    bg: "#F3E8FF",
    x: 8,
    y: 38,
    description:
      "Formalise les principes de justice distributive pour corriger activement les inégalités et les frustrations accumulées au fil du temps.",
    irisContributions: [
      "Algorithme de compensation historique ex-post",
      "Équilibrage dynamique des frustrations",
      "Recherche d'absence d'envie dans la durée (inspiration Envy-Freeness)"
    ],
    foundations: [
      "Théorie du partage équitable (Fair Division)",
      "Justice distributive (John Rawls - Maximin)",
      "Algorithmes d'allocation dynamique de ressources"
    ],
    limitations: [
      "Coût d'opportunité de l'équité sur l'efficacité globale",
      "Subjectivité de la mémoire temporelle des frustrations"
    ]
  }
];

export const CONNECTIONS = [
  {
    from: "social-choice",
    to: "welfare",
    label: "Le mode de scrutin définit\nla fonction de bien-être"
  },
  {
    from: "welfare",
    to: "decision",
    label: "L'optimum collectif agrège\nles utilités individuelles"
  },
  {
    from: "decision",
    to: "collective-intelligence",
    label: "La rationalité individuelle\nnourrit la dynamique de groupe"
  },
  {
    from: "collective-intelligence",
    to: "fairness",
    label: "La diversité du groupe exige\ndes garanties d'équité"
  },
  {
    from: "fairness",
    to: "social-choice",
    label: "La justice perçue légitime\nles règles du vote"
  },
  {
    from: "social-choice",
    to: "collective-intelligence",
    label: "Le cadre de vote structure\nl'émergence des idées"
  },
  {
    from: "welfare",
    to: "fairness",
    label: "Le Nash Welfare arbitre\nl'efficacité et la justice",
    offsetX: 0,  
    offsetY: -15  
  },
  {
    from: "collective-intelligence",
    to: "welfare",
    label: "La mise en commun révèle\nun compromis pertinent",
    offsetX: 0,  
    offsetY: 55  
  },
  {
    from: "fairness",
    to: "decision",
    label: "L'historique des gains modifie\nl'utilité courante d'un agent",
    offsetX: -60, 
    offsetY: 45  
  },
  {
    from: "decision",
    to: "social-choice",
    label: "Des profils d'utilité émergent\nles classements de vote"
  }
];

export const IRIS_CONNECTIONS = [
  { discipline: "social-choice", label: "Scrutin de Condorcet (Méthode de Black)" },
  { discipline: "welfare", label: "Moyenne Géométrique (NSW)" },
  { discipline: "decision", label: "Modèle Multi-Attributs & Contraintes" },
  { discipline: "collective-intelligence", label: "Co-construction de Scénarios" },
  { discipline: "fairness", label: "Pondération Temporelle Ex-Post" }
];

