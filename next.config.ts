import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Racine du workspace forcée sur ce dossier.
  // Sans ça, Turbopack remonte l'arborescence à la recherche d'un lockfile et
  // finit par retenir C:\ comme racine (des pnpm-lock.yaml / package.json
  // parasites y traînent). Il ne trouve alors plus node_modules/next et plante
  // avec « Next.js package not found », en surveillant au passage tout le disque.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Origines autorisées à charger les ressources de développement (rechargement
  // à chaud). Sans ça, tester depuis un téléphone — réseau local ou tunnel —
  // fait échouer la liaison HMR, ce qui déclenche une boucle de rechargement de
  // la page. Sans effet en production.
  // La liste peut être surchargée via DEV_ORIGINS (valeurs séparées par des
  // virgules) quand l'IP locale change ou pour un autre type de tunnel.
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(',').map(o => o.trim()) ?? [
    '*.trycloudflare.com',
    '*.ngrok-free.app',
    '192.168.1.118',
  ],
};

export default nextConfig;
