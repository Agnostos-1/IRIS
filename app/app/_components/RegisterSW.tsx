// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker de l'application.
 *
 * Le fichier est servi depuis /app/sw.js, ce qui lui donnerait par défaut la
 * portée /app/ — or la page de démarrage déclarée au manifeste est /app, sans
 * barre finale, qui ne serait alors pas contrôlée par le service worker et
 * ferait échouer la proposition d'installation. L'en-tête
 * Service-Worker-Allowed, posé dans next.config.ts, autorise la portée /app.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/app/sw.js', { scope: '/app' })
      .catch(() => {
        // Échec sans conséquence : l'application reste utilisable, seule
        // l'installation sur l'écran d'accueil devient indisponible. Inutile
        // d'alerter l'utilisateur, qui n'y peut rien.
      })
  }, [])

  return null
}
