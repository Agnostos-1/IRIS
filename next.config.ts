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
};

export default nextConfig;
