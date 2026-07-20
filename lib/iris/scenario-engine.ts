// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// ─── lib/iris/scenario-engine.ts ───────────────────────────────────────────────
// Génération des scénarios candidats (combinaisons d'activités faisables).
// Partagé entre la route Scénarios (Phase 4, affichage brut) et la route
// Pareto (Phase 5, scoring complet + filtre). Ce module ne calcule AUCUN
// score d'utilité — uniquement la faisabilité (contraintes, horaires, budget indicatif).

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRANSITION = 30 // minutes between activities (buffer)
export const SPEED: Record<string, number> = { foot: 5, transit: 22, car: 35 }

export const MEAL_TYPES = ['Restaurant', 'Gastronomie', 'Brunch', 'Petit-déjeuner']

export const GENERIC_MEAL_WINDOWS: { open: number; close: number }[] = [
  { open: 11 * 60, close: 15 * 60 },
  { open: 18 * 60, close: 23 * 60 + 59 },
]

export const DAY_KEYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DBActivity {
  id:               string
  name:             string
  type:             string
  type_parent:      string | null  // renseigné uniquement pour les sous-types (héritage de préférence)
  address:          string | null
  address_lat:      number | null
  address_lng:      number | null
  duration_minutes: number
  cost_per_person:  number
  social_level:     number
  opening_hours:    Record<string, { open: string; close: string; break_start?: string; break_end?: string }> | null
  no_stairs:        boolean
  is_intense:       boolean
  is_high_altitude: boolean
  is_aquatic:       boolean
  is_loud:          boolean
  has_strobe:       boolean
  smoke_free:       boolean
  has_pets:         boolean
  gluten_ok:        boolean
  seafood_ok:       boolean
  halal_ok:         boolean
  alcohol_free:     boolean
  pregnancy_ok:     boolean
  pets_allowed:     boolean
  kid_ok:           boolean
  vegan_ok:         boolean
  nut_ok:           boolean
  diab_ok:          boolean
}

export interface DBUser {
  id:               string
  display_name:     string | null
  home_lat:         number | null
  home_lng:         number | null
  transport:        string
  distance_max:     number
  budget:           number
  social_level:     number
  weights:          Record<string, number>
  hard_constraints: Record<string, boolean>
  activity_prefs:   Record<string, number>
}

export interface DBAvailability {
  user_id:              string
  date:                 string
  status:               string   // 'ok' | 'cond' | 'no'
  probability:          number   // 0.0 to 1.0
  slot_start:           string | null
  slot_end:             string | null
  budget_personal:      number | null
  constraint_overrides: Record<string, Record<string, boolean>> | null  // activityId -> constraintKey -> bool
}

export interface DateObj {
  date:       string
  label?:     string
  startTime?: string
  endTime?:   string
  window?:    number
}

export interface TimelineStepInternal {
  actId:        string
  start:        number
  end:          number
  travelBefore: number
  waitBefore:   number
}

export interface ActiveUserEntry {
  userId:    string
  profile:   DBUser
  av:        DBAvailability
  overrides: Record<string, Record<string, boolean>>  // activityId -> constraintKey -> bool
}

export interface ScenarioCandidate {
  id:                string
  date:              string
  dayKey:            string
  dayLabel:          string
  activityIds:       string[]
  activities:         { id: string; name: string; type: string; duration: number; cost: number; lat: number | null; lng: number | null; address: string | null; social_level: number }[]
  timeline:          TimelineStepInternal[]
  windowStart:       number
  windowEnd:         number
  totalCost:         number
  totalTimeMinutes:  number
  totalWaitMinutes:  number
  activeUsers:       ActiveUserEntry[]
  effectiveBudget:   number
  nEff:              number
}

export interface EliminatedActivity {
  id:     string
  name:   string
  reason: string
  date:   string
}

// ─── Geometry / time helpers ──────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function travelMinutes(
  fromLat: number | null, fromLng: number | null,
  toLat: number | null,   toLng: number | null,
  transport: string
): number {
  if (!fromLat || !fromLng || !toLat || !toLng) return 20
  const km    = haversineKm(fromLat, fromLng, toLat, toLng)
  const speed = SPEED[transport] ?? 20
  return Math.round((km / speed) * 60)
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

export function minutesToTime(m: number): string {
  const h   = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function normalizeClose(open: number, close: number): number {
  return close < open ? close + 24 * 60 : close
}

export function combos<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [h, ...t] = arr
  return [...combos(t, k - 1).map(c => [h, ...c]), ...combos(t, k)]
}

export function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const result: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) result.push([arr[i], ...p])
  }
  return result
}

export function gm(vs: number[], eps = 0.01): number {
  if (!vs.length) return 0
  return Math.exp(vs.reduce((s, v) => s + Math.log(eps + v), 0) / vs.length)
}

export function isMealType(type: string): boolean {
  return MEAL_TYPES.some(t => type?.toLowerCase().includes(t.toLowerCase()))
}

// ─── Opening / service windows ────────────────────────────────────────────────

export function activityWindows(act: DBActivity, dayKey: string): { open: number; close: number }[] {
  const oh = act.opening_hours
  if (!oh || Object.keys(oh).length === 0) {
    return isMealType(act.type) ? GENERIC_MEAL_WINDOWS : [{ open: 0, close: 24 * 60 }]
  }
  const h = oh[dayKey]
  if (!h) return []

  const open  = timeToMinutes(h.open)
  const close = normalizeClose(open, timeToMinutes(h.close))

  // Mode "2 services" : open/close = service 1 (ex. midi), break_start/break_end =
  // service 2 (ex. soir) — deux créneaux INDÉPENDANTS, pas une seule plage avec une
  // coupure au milieu. C'est la structure réellement enregistrée par le formulaire.
  if (h.break_start && h.break_end) {
    const bs = timeToMinutes(h.break_start)
    const be = normalizeClose(bs, timeToMinutes(h.break_end))
    return [{ open, close }, { open: bs, close: be }]
  }
  return [{ open, close }]
}

export function findEarliestStart(
  act: DBActivity,
  earliestArrival: number,
  dayKey: string,
  windowEnd: number
): { start: number; wait: number } | null {
  const duration = act.duration_minutes ?? 90
  const windows  = activityWindows(act, dayKey).sort((a, b) => a.open - b.open)

  for (const w of windows) {
    const start = Math.max(earliestArrival, w.open)
    const end   = start + duration
    if (end <= w.close && end <= windowEnd) return { start, wait: start - earliestArrival }
  }
  return null
}

export function eliminationReason(act: DBActivity, dayKey: string, windowStart: number, windowEnd: number, dayLabel: string): string {
  const windows = activityWindows(act, dayKey)
  if (windows.length === 0) return `Fermé le ${dayLabel}`
  const fits = findEarliestStart(act, windowStart, dayKey, windowEnd)
  if (!fits) {
    const windowsStr = windows.map(w => `${minutesToTime(w.open)}-${minutesToTime(w.close % (24 * 60))}`).join(' / ')
    return `Horaires (${windowsStr}) incompatibles avec le créneau ${minutesToTime(windowStart)}-${minutesToTime(windowEnd)}`
  }
  return 'Contrainte bloquante'
}

// ─── Constraint check ────────────────────────────────────────────────────────

export function hardOk(
  user: DBUser,
  activity: DBActivity,
  overrides: Record<string, boolean>
): { ok: boolean; reasons: string[] } {
  const hc      = user.hard_constraints ?? {}
  const reasons: string[] = []
  const check = (key: string, fail: boolean, label: string) => {
    if (hc[key] && !overrides[key] && fail) reasons.push(label)
  }
  check('PMR',          !activity.no_stairs,        '♿ PMR')
  check('stair',        !activity.no_stairs,        '🪜 Escaliers')
  check('cardio',        activity.is_intense,       '🫀 Effort intense')
  check('vertigo',       activity.is_high_altitude, '🧗 Hauteur')
  check('aquatic',       activity.is_aquatic,       '🏊 Aquatique')
  check('noise',         activity.is_loud,          '🔊 Bruit')
  check('epilepsy',      activity.has_strobe,       '⚡ Stroboscope')
  check('smoke',        !activity.smoke_free,        '🚬 Tabac')
  check('allergy_pets',  activity.has_pets,         '🐱 Animaux')
  check('gluten',       !activity.gluten_ok,        '🌾 Gluten')
  check('seafood',      !activity.seafood_ok,       '🦞 Fruits de mer')
  check('halal_kosher', !activity.halal_ok,         '🥩 Halal/Casher')
  check('alcohol',      !activity.alcohol_free,     '🍺 Alcool')
  check('pregnancy',    !activity.pregnancy_ok,     '🤰 Grossesse')
  check('pets',         !activity.pets_allowed,     '🐾 Animal admis')
  check('kids',         !activity.kid_ok,           '👶 Enfants')
  check('vegan',        !activity.vegan_ok,         '🌱 Vegan')
  check('nuts',         !activity.nut_ok,           '🥜 Noix')
  check('diet',         !activity.diab_ok,          '🏥 Régime médical')
  return { ok: reasons.length === 0, reasons }
}

// Calcule plusieurs horaires de départ candidats pour un ordre d'activités donné,
// au lieu de systématiquement ancrer au début de la fenêtre de l'événement.
// Ancrer bêtement au début peut manquer le scénario optimal : si un restaurant
// n'ouvre son service que le soir, démarrer plus tard (ex. Escape Game 17h → Resto
// 19h) peut donner une attente quasi nulle, alors que démarrer à 14h fixe forcerait
// une attente de plusieurs heures entre les deux activités.
//
// Principe : pour chaque activité de la séquence, si on suppose qu'aucune attente
// n'a lieu avant elle, on calcule l'horaire de départ qui la ferait arriver pile à
// l'ouverture d'une de ses fenêtres. Chaque candidat est ensuite testé normalement
// via buildTimeline, qui vérifie lui-même la faisabilité réelle (donc les horaires
// de fermeture sont naturellement respectés — un candidat non viable est simplement
// rejeté comme n'importe quel autre essai).
function computeCandidateStarts(
  actsOrder:   DBActivity[],
  windowStart: number,
  windowEnd:   number,
  dayKey:      string,
  transport:   string
): number[] {
  const candidates = new Set<number>([windowStart])
  let cumulativeOffset = 0
  let prevAct: DBActivity | null = null

  for (const act of actsOrder) {
    if (prevAct) {
      cumulativeOffset += travelMinutes(prevAct.address_lat, prevAct.address_lng, act.address_lat, act.address_lng, transport) + TRANSITION
    }
    for (const w of activityWindows(act, dayKey)) {
      const candidateStart = w.open - cumulativeOffset
      if (candidateStart >= windowStart && candidateStart < windowEnd) {
        candidates.add(candidateStart)
      }
    }
    cumulativeOffset += (act.duration_minutes ?? 90)
    prevAct = act
  }
  return [...candidates].sort((a, b) => a - b)
}

// ─── Timeline builder ─────────────────────────────────────────────────────────

export function buildTimeline(
  actsOrder:   DBActivity[],
  windowStart: number,
  windowEnd:   number,
  dayKey:      string,
  transport:   string
): { timeline: TimelineStepInternal[]; totalWait: number; totalElapsed: number } | null {
  let cursor = windowStart
  const timeline: TimelineStepInternal[] = []
  let totalWait = 0
  let prevAct: DBActivity | null = null

  for (const act of actsOrder) {
    const travel = prevAct
      ? travelMinutes(prevAct.address_lat, prevAct.address_lng, act.address_lat, act.address_lng, transport) + TRANSITION
      : 0
    const earliestArrival = cursor + travel
    const slot = findEarliestStart(act, earliestArrival, dayKey, windowEnd)
    if (!slot) return null

    const { start, wait } = slot
    const end = start + (act.duration_minutes ?? 90)
    timeline.push({ actId: act.id, start, end, travelBefore: travel, waitBefore: wait })
    totalWait += wait
    cursor = end
    prevAct = act
  }
  return { timeline, totalWait, totalElapsed: cursor - windowStart }
}

// ─── Main entry point ─────────────────────────────────────────────────────────
// Génère tous les scénarios candidats faisables (1-3 activités) pour toutes
// les dates fournies. Ne calcule aucun score — juste la faisabilité.

export function generateEventScenarios(params: {
  rawDates:      DateObj[]
  activities:    DBActivity[]
  users:         DBUser[]
  avails:        DBAvailability[]
  budgetGlobal:  number | null
}): { scenarios: ScenarioCandidate[]; eliminatedActivities: EliminatedActivity[] } {
  const { rawDates, activities, users, avails } = params

  const scenarios: ScenarioCandidate[] = []
  const eliminatedActivities: EliminatedActivity[] = []

  for (const dateObj of rawDates) {
    const dateStr = dateObj.date
    const d       = new Date(dateStr)
    const dayKey  = DAY_KEYS[d.getDay()]
    const dayLabelShort = d.toLocaleDateString('fr-FR', { weekday: 'long' })

    const activeAvails = avails.filter(a => a.date === dateStr && (a.status === 'ok' || a.status === 'cond'))
    if (!activeAvails.length) continue

    const activeUsers: ActiveUserEntry[] = activeAvails
      .map(av => {
        const profile = users.find(u => u.id === av.user_id)
        return profile ? { userId: profile.id, profile, av, overrides: av.constraint_overrides ?? {} } : null
      })
      .filter((x): x is ActiveUserEntry => x !== null)

    if (!activeUsers.length) continue

    let windowStart: number
    let windowEnd: number
    if (dateObj.startTime && dateObj.endTime) {
      windowStart = timeToMinutes(dateObj.startTime)
      windowEnd   = timeToMinutes(dateObj.endTime)
    } else {
      const slotStarts = activeAvails.map(a => a.slot_start ? timeToMinutes(a.slot_start) : 9 * 60)
      const slotEnds   = activeAvails.map(a => a.slot_end   ? timeToMinutes(a.slot_end)   : 23 * 60)
      windowStart = Math.max(...slotStarts)
      windowEnd   = Math.min(...slotEnds)
    }
    if (windowEnd - windowStart < 60) continue

    // Le budget n'intervient plus ici à la génération : en mode individuel, seul le
    // budget personnel de chacun compte pour effectiveBudget (utilisé ailleurs pour
    // l'affichage) ; en mode "organisateur finance tout" (budgetGlobal actif), le
    // filtrage par coût total se fait plus tard, au stade Pareto — pas ici, pour que
    // l'organisateur voie encore tous les scénarios bruts en Phase Scénarios, avec
    // juste un avertissement, avant que le filtre dur ne s'applique.
    const budgetPerUser = activeUsers.map(({ av, profile }) => av.budget_personal ?? profile.budget ?? 30)
    const effectiveBudget = Math.min(...budgetPerUser)

    const nEff = activeUsers.reduce((s, { av }) => {
      const baseProb = av.probability ?? 0.7
      return s + (av.status === 'ok' ? baseProb : baseProb * 0.7)
    }, 0)

    const slowestTransport = activeUsers.reduce((worst, { profile }) => {
      const speed = SPEED[profile.transport ?? 'transit'] ?? 20
      return speed < (SPEED[worst] ?? 20) ? (profile.transport ?? 'transit') : worst
    }, 'car')

    const viableActs = activities.filter(act => {
      const reachable = findEarliestStart(act, windowStart, dayKey, windowEnd) !== null
      if (!reachable) return false
      return activeUsers.some(({ profile, overrides }) => hardOk(profile, act, overrides[act.id] ?? {}).ok)
    })

    for (const act of activities) {
      if (!viableActs.find(v => v.id === act.id)) {
        const reachable = findEarliestStart(act, windowStart, dayKey, windowEnd) !== null
        const reason = !reachable
          ? eliminationReason(act, dayKey, windowStart, windowEnd, dayLabelShort)
          : (() => {
              const blockedReasons = activeUsers.flatMap(({ profile, overrides }) => hardOk(profile, act, overrides[act.id] ?? {}).reasons)
              return `Contrainte bloquante pour tous : ${[...new Set(blockedReasons)].join(', ')}`
            })()
        eliminatedActivities.push({ id: act.id, name: act.name, reason, date: dateStr })
      }
    }

    const actIds = viableActs.map(a => a.id)
    const allCombos = [...combos(actIds, 1), ...combos(actIds, 2), ...combos(actIds, 3)]

    for (const ids of allCombos) {
      const acts = ids.map(id => activities.find(a => a.id === id)!)

      const totalCost = acts.reduce((s, a) => s + (a.cost_per_person ?? 0), 0)

      let blocked = false
      for (const { profile, overrides } of activeUsers) {
        for (const act of acts) {
          if (!hardOk(profile, act, overrides[act.id] ?? {}).ok) { blocked = true; break }
        }
        if (blocked) break
      }
      if (blocked) continue

      let best: { timeline: TimelineStepInternal[]; totalWait: number; totalElapsed: number } | null = null
      for (const order of permutations(acts)) {
        const candidateStarts = computeCandidateStarts(order, windowStart, windowEnd, dayKey, slowestTransport)
        for (const candidateStart of candidateStarts) {
          const result = buildTimeline(order, candidateStart, windowEnd, dayKey, slowestTransport)
          if (result && (!best || result.totalWait < best.totalWait ||
              (result.totalWait === best.totalWait && result.totalElapsed < best.totalElapsed))) {
            best = result
          }
        }
      }
      if (!best) continue

      const orderedActs = best.timeline.map(step => acts.find(a => a.id === step.actId)!)

      scenarios.push({
        id:               `${dateStr}-${[...ids].sort().join('_')}`,
        date:             dateStr,
        dayKey,
        dayLabel:         dateObj.label ?? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        activityIds:      ids,
        activities:       orderedActs.map(a => ({ id: a.id, name: a.name, type: a.type, duration: a.duration_minutes, cost: a.cost_per_person, lat: a.address_lat, lng: a.address_lng, address: a.address, social_level: a.social_level })),
        timeline:         best.timeline,
        windowStart,
        windowEnd,
        totalCost,
        totalTimeMinutes: best.totalElapsed,
        totalWaitMinutes: best.totalWait,
        activeUsers,
        effectiveBudget,
        nEff,
      })
    }
  }

  return { scenarios, eliminatedActivities }
}
