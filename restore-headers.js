/**
 * restore-headers.js
 *
 * Répare les fichiers dont l'en-tête (imports, 'use client', etc.) a été
 * tronqué par l'insertion automatique de la licence AGPLv3.
 *
 * Principe : pour chaque fichier listé, on repère où le "vrai" contenu
 * reprend juste après le bloc de licence, on cherche cette même ligne
 * dans la version de sauvegarde du même fichier, et on récupère tout
 * ce qui la précédait dans la sauvegarde (les imports manquants, etc.)
 * pour le recoller devant.
 *
 * SÉCURITÉ : par défaut ce script ne modifie RIEN (mode "dry run").
 * Il affiche juste ce qu'il FERAIT pour chaque fichier. Relance-le avec
 * --apply seulement après avoir vérifié que le rapport a l'air correct.
 *
 * UTILISATION :
 *   1. Modifie BACKUP_ROOT et PROJECT_ROOT ci-dessous
 *   2. Remplis FILES_TO_CHECK avec les chemins relatifs concernés
 *      (ceux trouvés par le scan des fichiers contenant la licence)
 *   3. Lance : node restore-headers.js          (dry run, rien n'est écrit)
 *   4. Si le rapport semble bon : node restore-headers.js --apply
 */

const fs = require('fs')
const path = require('path')

// ─── À CONFIGURER ────────────────────────────────────────────────────
const BACKUP_ROOT = 'C:/Users/Alex/iris-demo backup'  // <-- à changer
const PROJECT_ROOT = 'C:/Users/Alex/iris-demo'                   // <-- à vérifier

const FILES_TO_CHECK = [
  'app/a-propos/page.tsx',
  'app/api/activity-subtypes/route.ts',
  'app/api/events/[id]/activities/[activityId]/route.ts',
  'app/api/events/[id]/activities/route.ts',
  'app/api/events/[id]/availability/route.ts',
  'app/api/events/[id]/close-phase/route.ts',
  'app/api/events/[id]/duplicate-source/route.ts',
  'app/api/events/[id]/invite/route.ts',
  'app/api/events/[id]/pareto/route.ts',
  'app/api/events/[id]/pref-sync-check/route.ts',
  'app/api/events/[id]/results/route.ts',
  'app/api/events/[id]/route.ts',
  'app/api/events/[id]/scenarios/route.ts',
  'app/api/events/[id]/vote/route.ts',
  'app/api/events/mine/route.ts',
  'app/api/events/route.ts',
  'app/api/groups/invite/route.ts',
  'app/api/groups/join/[code]/route.ts',
  'app/api/groups/route.ts',
  'app/api/profile/delete/route.ts',
  'app/api/profile/deletion-impact/route.ts',
  'app/api/profile/route.ts',
  'app/auth/callback/route.ts',
  'app/auth/confirm/page.tsx',
  'app/auth/forgot-password/page.tsx',
  'app/auth/login/page.tsx',
  'app/auth/reset/page.tsx',
  'app/confidentialite/page.tsx',
  'app/dashboard/page.tsx',
  'app/event/[id]/activities/page.tsx',
  'app/event/[id]/pareto/page.tsx',
  'app/event/[id]/results/page.tsx',
  'app/event/[id]/scenarios/page.tsx',
  'app/event/[id]/vote/page.tsx',
  'app/event/new/page.tsx',
  'app/faq/page.tsx',
  'app/group/[id]/page.tsx',
  'app/group/new/page.tsx',
  'app/home-page.tsx',
  'app/join/[code]/page.tsx',
  'app/join/group/[code]/page.tsx',
  'app/layout.tsx',
  'app/methode/page.tsx',
  'app/page.tsx',
  'app/profile/page.tsx',
  'app/providers.tsx',
  'app/roadmap/page.tsx',
  'app/science/index.ts',
  'app/science/IrisScientificArchitecture.tsx',
  'app/science/page.tsx',
  'app/science/ScienceClientView.tsx',
  'app/tarification/page.tsx',
  'components/InviteLinkBox.tsx',
  'components/InviteMemberForm.tsx',
  'components/JoinCodeForm.tsx',
  'components/Navbar.tsx',
  'components/ScrollToTop.tsx',
  'lib/iris/condorcet.ts',
  'lib/iris/pareto-engine.ts',
  'lib/iris/scenario-engine.ts',
  'lib/supabase/admin.ts',
]
// ──────────────────────────────────────────────────────────────────────

const LICENSE_END_MARKER = '// (at your option) any later version.'
const APPLY = process.argv.includes('--apply')

function restoreOne(relPath) {
  const currentPath = path.join(PROJECT_ROOT, relPath)
  const backupPath = path.join(BACKUP_ROOT, relPath)

  if (!fs.existsSync(currentPath)) {
    console.log(`[ABSENT]     ${relPath} — fichier introuvable dans le projet actuel`)
    return
  }
  if (!fs.existsSync(backupPath)) {
    console.log(`[NOUVEAU]    ${relPath} — absent de la sauvegarde (créé après vendredi, à traiter autrement)`)
    return
  }

  const current = fs.readFileSync(currentPath, 'utf8')
  const backup = fs.readFileSync(backupPath, 'utf8')

  const licenseIdx = current.indexOf(LICENSE_END_MARKER)
  if (licenseIdx === -1) {
    console.log(`[SANS LICENCE] ${relPath} — pas d'en-tête de licence trouvé, probablement pas concerné`)
    return
  }

  // Tout ce qui suit la ligne de licence
  const afterLicenseRaw = current.slice(licenseIdx + LICENSE_END_MARKER.length)
  const afterLicense = afterLicenseRaw.replace(/^(\r?\n)+/, '')

  const firstLine = afterLicense.split(/\r?\n/).find(l => l.trim().length > 0)
  if (!firstLine) {
    console.log(`[VIDE]       ${relPath} — rien après la licence, cas à vérifier manuellement`)
    return
  }
  const needle = firstLine.trim()

  // Cherche cette ligne dans la sauvegarde — et vérifie qu'elle n'apparaît qu'une fois
  const occurrences = backup.split(needle).length - 1
  if (occurrences === 0) {
    console.log(`[INTROUVABLE] ${relPath} — la ligne "${needle}" n'apparaît pas dans la sauvegarde (fichier trop modifié depuis vendredi, à traiter manuellement)`)
    return
  }
  if (occurrences > 1) {
    console.log(`[AMBIGU]     ${relPath} — la ligne "${needle}" apparaît ${occurrences} fois dans la sauvegarde, impossible de savoir laquelle, à traiter manuellement`)
    return
  }

  const backupIdx = backup.indexOf(needle)
  const headerFromBackup = backup.slice(0, backupIdx)

  // Si l'en-tête récupéré est suspicieusement long (>50 lignes), on demande confirmation manuelle
  const headerLineCount = headerFromBackup.split(/\r?\n/).length
  if (headerLineCount > 50) {
    console.log(`[À VÉRIFIER] ${relPath} — en-tête récupéré de ${headerLineCount} lignes, c'est beaucoup, vérifie à la main avant d'appliquer`)
    return
  }

  const licenseBlock = current.slice(0, licenseIdx + LICENSE_END_MARKER.length)
  const newContent = licenseBlock + '\n\n' + headerFromBackup + afterLicense

  if (APPLY) {
    fs.writeFileSync(currentPath, newContent, 'utf8')
    console.log(`[RESTAURÉ]   ${relPath} — ${headerLineCount} ligne(s) récupérée(s)`)
  } else {
    console.log(`[À RESTAURER] ${relPath} — ${headerLineCount} ligne(s) seraient récupérées :`)
    console.log('   ---')
    console.log(headerFromBackup.split(/\r?\n/).map(l => '   ' + l).join('\n'))
    console.log('   ---')
  }
}

console.log(APPLY ? '=== MODE APPLICATION (écriture réelle) ===\n' : '=== MODE SIMULATION (rien n\'est écrit) ===\n')

for (const relPath of FILES_TO_CHECK) {
  restoreOne(relPath)
}

console.log('\nTerminé.', APPLY ? '' : 'Relance avec --apply si le rapport ci-dessus semble correct.')
