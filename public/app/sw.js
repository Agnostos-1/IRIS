// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
//
// Service worker de l'application IRIS.
//
// Il ne met RIEN en cache, volontairement. Android exige un service worker
// doté d'un gestionnaire fetch pour proposer l'installation et générer une
// vraie application (WebAPK) ; c'est son seul rôle ici.
//
// Mettre en cache dès maintenant serait contre-productif pendant une phase de
// développement quotidienne : un service worker trop zélé sert d'anciennes
// versions, et l'utilisateur reste bloqué dessus sans comprendre pourquoi. La
// stratégie de cache et le mode hors ligne viendront quand les écrans seront
// stabilisés, de façon délibérée plutôt que par effet de bord.

self.addEventListener('install', () => {
  // Pas d'attente : la nouvelle version remplace immédiatement l'ancienne.
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Gestionnaire présent mais sans respondWith : chaque requête part sur le
  // réseau comme si le service worker n'existait pas.
})
