# Tester IRIS sur téléphone

Mémo de démarrage rapide pour le chantier mobile. Le détail des diagnostics qui
ont mené à cette configuration est dans l'historique des sessions ; ici, juste
ce qu'il faut relancer.

## Acquis une fois pour toutes — ne rien relancer

Ces réglages persistent au redémarrage de la machine :

| Réglage | Où |
|---|---|
| Règle pare-feu entrante, port 3000 | Windows |
| Réseau classé « Privé » (et non « Public ») | Windows |
| `ExecutionPolicy RemoteSigned` (portée CurrentUser) | PowerShell |
| Racine Turbopack + `allowedDevOrigins` | `next.config.ts` |
| Contournement TLS Avast (`--use-system-ca`) | script `dev` de `package.json` |

## Route A — Réseau local (la plus rapide)

```
npm run dev
```

Puis sur le téléphone, même box que le PC :

```
http://192.168.1.118:3000
```

**Prérequis, à faire une seule fois sur le téléphone :** Chrome → ⋮ →
Paramètres → Confidentialité et sécurité → « Utiliser les connexions
sécurisées » → désactiver. Sans ça Chrome réécrit l'adresse en `https://`,
que le serveur de développement ne sait pas servir.

Si Chrome s'entête, ouvrir l'adresse en navigation privée (il mémorise la
bascule vers HTTPS), ou passer par Firefox qui ne force pas le HTTPS sur les
adresses IP locales.

### Si l'IP locale a changé

Elle est affichée par `npm run dev`, ligne `Network:`. Pour la surcharger sans
modifier `next.config.ts` :

```
$env:DEV_ORIGINS="192.168.1.42"; npm run dev
```

## Route B — Tunnel HTTPS

Nécessaire seulement pour ce qui exige HTTPS : service worker, notifications
push, partage natif. Donc à partir de la phase PWA.

Terminal 1 :

```
npm run dev
```

Terminal 2 :

```
npx.cmd -y cloudflared tunnel --url http://localhost:3000
```

Ouvrir sur le téléphone l'URL `https://….trycloudflare.com` affichée. Elle
change à chaque lancement, mais `allowedDevOrigins` contient le joker
`*.trycloudflare.com` — rien à reconfigurer.

Le bloc rouge « NativeCommandError » au démarrage n'est pas une erreur :
cloudflared écrit ses journaux sur la sortie d'erreur, PowerShell les colore
en rouge.

## Se connecter

**Par mot de passe uniquement.** Le lien magique redirige vers les URL
déclarées dans Supabase (`localhost:3000`), qui ne correspondent ni à l'IP
locale ni à l'URL du tunnel — le lien ne reviendrait pas au bon endroit.

Pour lever cette limite, ajouter l'origine voulue dans Supabase →
Authentication → URL Configuration → Redirect URLs.

## Déboguer depuis le PC

Téléphone branché en USB, débogage USB activé dans les options développeur,
puis `chrome://inspect` sur le PC : console, inspecteur d'éléments et réseau
de la page du téléphone, sur grand écran.

## En cas de panne

| Symptôme | Cause probable |
|---|---|
| « Ce site ne peut pas fournir de connexion sécurisée » | Chrome force le HTTPS — voir Route A |
| « N'a pas répondu à temps » | Pare-feu, ou téléphone hors du réseau du PC |
| La page se recharge en boucle et vide les champs | Origine absente d'`allowedDevOrigins` |
| Connexion qui tourne sans fin, retour au login | TLS Node — vérifier que `dev` porte bien `--use-system-ca` |
| `Next.js package not found` au démarrage | Cache `.next` à supprimer |
