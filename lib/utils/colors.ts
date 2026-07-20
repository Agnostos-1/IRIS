// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Format et couleurs pour l'affichage des scores

export function formatPercent(value: number): string {
  return Math.round(value * 100) + "%";
}

export function getColorForScore(value: number): [string, string] {
  // Retourne [backgroundColor, textColor]
  if (value >= 0.80) return ["#BBF7D0", "#14532D"];
  if (value >= 0.65) return ["#D9F99D", "#3F6212"];
  if (value >= 0.55) return ["#FEF9C3", "#713F12"];
  if (value >= 0.45) return ["#FED7AA", "#9A3412"];
  return ["#FECACA", "#7F1D1D"];
}

export const ZONE_LABELS: Record<string, string> = {
  "P-nord": "Paris-nord",
  "P-centre": "Paris-centre",
  "P-est": "Paris-est",
  "P-ouest": "Paris-ouest",
  "P-sud": "Paris-sud",
};

export const TRANSPORT_LABELS: Record<string, string> = {
  foot: "🚶 Pied",
  transit: "🚇 Transports",
  car: "🚗 Voiture",
};

export const DIMENSION_LABELS = ["Activité", "Horaire", "Distance", "Budget", "Social"];

export const TABS = [
  "👥 Profils",
  "📅 Disponibilités",
  "🎯 Activités",
  "🗂️ Scénarios",
  "📊 Scores",
  "🗳️ Vote",
  "🏆 Résultat",
];
