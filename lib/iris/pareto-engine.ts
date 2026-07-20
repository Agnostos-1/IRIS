// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// ─── lib/iris/pareto-engine.ts ─────────────────────────────────────────────────
// Scoring complet (5 dimensions + compensation Rᵢ) et filtre Pareto.
// Partagé entre les routes Pareto (Phase 5), Vote (Phase 6) et Résultats (Phase 7).

import { haversineKm, ScenarioCandidate, DBUser, DBAvailability } from './scenario-engine'

export const DEFAULT_WEIGHTS = { activity: 35, schedule: 25, distance: 20, budget: 10, social: 10 }

// ─── Facteurs par activité (Activité, Social) ─────────────────────────────────

export function factorActivity(user: DBUser, act: { type: string; type_parent?: string | null }): { value: number; inherited: boolean } {
  const prefs = user.activity_prefs ?? {}
  // Note directe sur ce type/sous-type précis, sinon héritage de la note du type
  // parent (si c'est un sous-type), sinon neutre — jamais de recalcul en cascade
  // au-delà d'un niveau, la hiérarchie est plafonnée à 2 niveaux par construction.
  //
  // Le flag "inherited" sert uniquement à l'affichage de transparence (jamais au
  // calcul lui-même). Comme la propagation par capillarité écrit déjà la valeur
  // héritée dans le profil de chacun à la clôture de la Phase Activités, la clé
  // existe presque toujours — on ne peut donc plus distinguer "jamais confirmée"
  // de "confirmée" par la simple présence de la clé. Heuristique pragmatique
  // retenue (démo) : si la valeur du sous-type est encore EXACTEMENT égale à
  // celle du parent, on la considère probablement jamais retouchée. Faux positif
  // rare accepté (quelqu'un choisit délibérément la même valeur que son parent) ;
  // une solution rigoureuse nécessiterait de tracer explicitement la confirmation
  // (colonne dédiée), à envisager si ce mécanisme prend plus d'importance.
  if (prefs[act.type] !== undefined) {
    const inherited = act.type_parent != null && prefs[act.type_parent] === prefs[act.type]
    return { value: prefs[act.type] / 100, inherited }
  }
  if (act.type_parent && prefs[act.type_parent] !== undefined) return { value: prefs[act.type_parent] / 100, inherited: true }
  return { value: 0.5, inherited: false }
}

export function factorSocial(user: DBUser, act: { social_level: number }): number {
  return 1 - Math.abs((user.social_level ?? 3) - (act.social_level ?? 3)) / 4
}

// ─── Facteurs de scénario (Budget, Horaires, Distance) — comptés une fois ────

export function factorBudget(myBudget: number, totalCost: number): number {
  if (totalCost <= myBudget) return 1
  return Math.max(0, 1 - (totalCost - myBudget) / myBudget)
}

export function factorSchedule(
  scenario: ScenarioCandidate,
  slotStart: string | null,
  slotEnd: string | null
): { value: number; overlapRatio: number; waitPenalty: number } {
  const scenarioStart = scenario.timeline[0]?.start ?? scenario.windowStart
  const scenarioEnd   = scenario.timeline[scenario.timeline.length - 1]?.end ?? scenario.windowEnd
  const scenarioSpan  = Math.max(1, scenarioEnd - scenarioStart)

  let overlapRatio = 1
  if (slotStart && slotEnd) {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m ?? 0) }
    const uStart = toMin(slotStart)
    const uEnd   = toMin(slotEnd)
    const overlapStart = Math.max(scenarioStart, uStart)
    const overlapEnd   = Math.min(scenarioEnd, uEnd)
    overlapRatio = Math.max(0, Math.min(1, (overlapEnd - overlapStart) / scenarioSpan))
  }

  const waitPenalty = Math.min(0.5, scenario.totalWaitMinutes / 180)
  const value = overlapRatio * (1 - waitPenalty)
  return { value, overlapRatio, waitPenalty }
}

// Trajet complet domicile → activité 1 → ... → activité N → domicile.
export function factorDistanceRoundTrip(user: DBUser, scenario: ScenarioCandidate): { value: number; totalKm: number | null } {
  if (user.home_lat == null || user.home_lng == null) return { value: 0.6, totalKm: null }

  const acts = scenario.activities
  let totalKm = 0
  let prevLat = user.home_lat
  let prevLng = user.home_lng
  let knownHops = 0

  for (const act of acts) {
    if (act.lat == null || act.lng == null) continue
    totalKm += haversineKm(prevLat, prevLng, act.lat, act.lng)
    prevLat = act.lat; prevLng = act.lng
    knownHops++
  }
  if (knownHops === 0) return { value: 0.6, totalKm: null }
  totalKm += haversineKm(prevLat, prevLng, user.home_lat, user.home_lng)

  const value = Math.exp(-totalKm / (2 * (user.distance_max ?? 15)))
  return { value, totalKm: Math.round(totalKm * 10) / 10 }
}

// ─── Compensation historique Rᵢ ────────────────────────────────────────────────
//
// Principe : pour chaque événement PASSÉ auquel la personne a participé, on
// compare SON utilité obtenue à la MÉDIANE des utilités de TOUS LES PARTICIPANTS
// de ce même événement (pas à sa propre médiane historique — comparer une
// personne à elle-même ne détecte jamais d'écart avec le groupe).
//
// deficit = médiane_événement − utilité_personne
//   > 0 → la personne a été moins bien servie que le groupe ce jour-là → à compenser (Rᵢ > 1)
//   < 0 → la personne a été mieux servie que le groupe ce jour-là     → léger rééquilibrage (Rᵢ < 1)
//
// Rᵢ = clamp(1 + moyenne(deficit) × 0.2, 0.5, 1.2)

interface EventUtilityRow { event_id: string; group_ids: string[] | null; utility: number }

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)]
}

// Calcule le Rᵢ d'une personne à partir de SES lignes d'historique (event_id, utility)
// et d'une table { event_id → [utilités de TOUS les participants de cet événement] }.
function computeRiFromRows(
  myRows: { event_id: string; utility: number }[],
  eventUtilities: Record<string, number[]>
): number {
  if (!myRows.length) return 1.0
  const avgDeficit = myRows.reduce((s, r) => {
    const evUtils = eventUtilities[r.event_id] ?? [r.utility]
    return s + (median(evUtils) - r.utility)
  }, 0) / myRows.length
  return Math.max(0.5, Math.min(1.2, 1 + avgDeficit * 0.2))
}

// Récupère, pour un ensemble d'event_id, les utilités de TOUS les participants
// (nécessaire pour calculer la médiane réelle de chaque événement, pas juste
// celle d'un sous-ensemble d'utilisateurs).
async function fetchEventUtilities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  eventIds: string[]
): Promise<Record<string, number[]>> {
  if (!eventIds.length) return {}
  const { data } = await adminSupabase
    .from('utility_history')
    .select('event_id, utility')
    .in('event_id', eventIds)

  const map: Record<string, number[]> = {}
  for (const r of (data ?? []) as { event_id: string; utility: number }[]) {
    if (!map[r.event_id]) map[r.event_id] = []
    map[r.event_id].push(r.utility)
  }
  return map
}

export async function computeFairnessCoefficients(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  groupIds: string[],
  userIds: string[]
): Promise<Record<string, number>> {
  if (!groupIds?.length || !userIds.length) return Object.fromEntries(userIds.map(id => [id, 1.0]))

  const { data: historyRows } = await adminSupabase
    .from('utility_history')
    .select('event_id, user_id, group_ids, utility')
    .in('user_id', userIds)

  const rows: (EventUtilityRow & { user_id: string })[] = historyRows ?? []
  const eventIds = [...new Set(rows.map(r => r.event_id))]
  const eventUtilities = await fetchEventUtilities(adminSupabase, eventIds)

  const result: Record<string, number> = {}
  for (const uid of userIds) {
    const userRows = rows.filter(r => r.user_id === uid)
    if (!userRows.length) { result[uid] = 1.0; continue }

    // Un événement peut être lié à plusieurs groupes (ex. un extra rattaché après coup
    // à un groupe pré-existant, ou un organisateur membre de plusieurs groupes invités
    // au même événement) — l'historique de CE participant compte dès qu'il correspond à
    // N'IMPORTE LEQUEL des groupes de l'événement, pas un seul groupe "primaire" fragile.
    const groupRows = userRows.filter(r => r.group_ids?.some(g => groupIds.includes(g)))
    const alpha = groupRows.length / userRows.length

    const riGroup  = computeRiFromRows(groupRows, eventUtilities)
    const riGlobal = computeRiFromRows(userRows, eventUtilities)
    result[uid] = parseFloat((alpha * riGroup + (1 - alpha) * riGlobal).toFixed(3))
  }

  return result
}

// ─── Détail Rᵢ pour un seul utilisateur (affichage transparence — pages Groupe/Profil) ──

export interface FairnessBreakdown {
  riGroup:     number | null
  riGlobal:    number
  alpha:       number | null
  riEffective: number
  hasHistory:  boolean
}

export async function computeFairnessBreakdown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  userId: string,
  groupId?: string | null,
  excludeEventId?: string | null
): Promise<FairnessBreakdown> {
  const { data: historyRows } = await adminSupabase
    .from('utility_history')
    .select('event_id, group_ids, utility')
    .eq('user_id', userId)

  const rows: EventUtilityRow[] = (historyRows ?? []).filter((r: EventUtilityRow) => r.event_id !== excludeEventId)
  const hasHistory = rows.length > 0
  const eventIds = [...new Set(rows.map(r => r.event_id))]
  const eventUtilities = hasHistory ? await fetchEventUtilities(adminSupabase, eventIds) : {}

  const riGlobal = hasHistory ? computeRiFromRows(rows, eventUtilities) : 1.0

  if (!groupId) {
    return { riGroup: null, riGlobal: parseFloat(riGlobal.toFixed(3)), alpha: null, riEffective: parseFloat(riGlobal.toFixed(3)), hasHistory }
  }

  const groupRows = rows.filter(r => r.group_ids?.includes(groupId))
  const alpha = hasHistory ? groupRows.length / rows.length : 0
  const riGroup = groupRows.length ? computeRiFromRows(groupRows, eventUtilities) : 1.0
  const riEffective = hasHistory ? parseFloat((alpha * riGroup + (1 - alpha) * riGlobal).toFixed(3)) : 1.0

  return {
    riGroup: parseFloat(riGroup.toFixed(3)),
    riGlobal: parseFloat(riGlobal.toFixed(3)),
    alpha: parseFloat(alpha.toFixed(2)),
    riEffective,
    hasHistory,
  }
}

// ─── Utilité individuelle par scénario ────────────────────────────────────────

export interface ActivityBreakdown {
  activityId: string
  name:       string
  fA: number; fO: number
  fAInherited: boolean  // true si fA vient d'un héritage de type parent, jamais confirmé pour ce sous-type précis
  weighted:   number
  centered:   number
}

export interface UserScenarioUtility {
  userId:       string
  uPrime:       number
  weight:       number
  ri:           number
  fB:           number
  fS:           number
  fD:           number
  totalKm:      number | null
  uActivities:  number
  scheduleDetail: { overlapRatio: number; waitPenalty: number }
  weights:      typeof DEFAULT_WEIGHTS
  perActivity:  ActivityBreakdown[]
  probability: number | null
  availStatus: string
}

export function computeUserUtility(
  user: DBUser,
  av: DBAvailability,
  scenario: ScenarioCandidate,
  ri: number,
  organizerFunded = false
): UserScenarioUtility {
  const w = { ...DEFAULT_WEIGHTS, ...(user.weights ?? {}) }
  const myBudget = av.budget_personal ?? user.budget ?? 30
  // En mode "organisateur finance tout", le budget personnel n'est plus un facteur de
  // satisfaction individuelle — personne ne paie de sa poche, donc neutre (1.0). Le
  // filtrage par coût réel se fait en amont, sur le total du scénario, pas ici.
  const fB = organizerFunded ? 1 : factorBudget(myBudget, scenario.totalCost)

  // Simplement neutraliser fB à 1 ne suffit pas : ça laisse le poids budget de CHACUN
  // (variable selon ses propres préférences) contribuer pleinement à son score, ce qui
  // avantage artificiellement ceux qui avaient personnellement mis un poids budget élevé.
  // La correction correcte : retirer le poids budget de la pondération et le redistribuer
  // proportionnellement aux autres facteurs, pour que la somme reste 100% sans lui.
  const remainingTotal = w.activity + w.social + w.schedule + w.distance
  const scale = organizerFunded && remainingTotal > 0 ? 100 / remainingTotal : 1
  const wEff = organizerFunded
    ? {
        activity: Math.round(w.activity * scale),
        social:   Math.round(w.social   * scale),
        schedule: Math.round(w.schedule * scale),
        distance: Math.round(w.distance * scale),
        budget:   0,
      }
    : w
  const { value: fS, overlapRatio, waitPenalty } = factorSchedule(scenario, av.slot_start, av.slot_end)
  const { value: fD, totalKm } = factorDistanceRoundTrip(user, scenario)

  const groupWeight = wEff.activity + wEff.social
  const rA = groupWeight > 0 ? wEff.activity / groupWeight : 0.5
  const rO = groupWeight > 0 ? wEff.social   / groupWeight : 0.5

  const perActivity: ActivityBreakdown[] = scenario.activities.map(act => {
    const { value: fA, inherited: fAInherited } = factorActivity(user, act)
    const fO = factorSocial(user, act)
    const weighted = rA * fA + rO * fO
    const centered = 2 * weighted - 1
    return { activityId: act.id, name: act.name, fA, fO, fAInherited, weighted, centered }
  })

  const sumCentered = perActivity.reduce((s, a) => s + a.centered, 0)
  const uActivities = (Math.tanh(sumCentered) + 1) / 2

  const uRaw = (groupWeight / 100) * uActivities + (wEff.schedule / 100) * fS + (wEff.budget / 100) * fB + (wEff.distance / 100) * fD
  const uPrime = Math.min(1, ri * uRaw)
  const weight = av.status === 'ok' ? (av.probability ?? 0.7) : (av.probability ?? 0.7) * 0.7

  return { userId: user.id, uPrime, weight, ri, fB, fS, fD, totalKm, uActivities, scheduleDetail: { overlapRatio, waitPenalty }, weights: wEff, perActivity, probability: av.probability ?? null, availStatus: av.status }
}

// ─── Dominance de Pareto ────────────────────────────────────────────────────────

export function dominates(a: number[], b: number[]): boolean {
  let strictlyBetter = false
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return false
    if (a[i] > b[i]) strictlyBetter = true
  }
  return strictlyBetter
}

// ─── Orchestration complète : scoring + dominance + marge adaptative ──────────

export interface ScoredScenario {
  scenario:   ScenarioCandidate
  perUser:    UserScenarioUtility[]
  groupScore: number
  uVector:    number[]
}

export interface ParetoResult {
  scored:             ScoredScenario[]
  nonDominated:       ScoredScenario[]
  finalists:          ScoredScenario[]
  best:               number
  cutoff:             number
  marginUsed:         number
  marginWasExtended:  boolean
  isDirectWinner:     boolean
  message:            string
  dominatedCount:     number
  eliminatedForBudget: { scenarioId: string; totalCost: number; limit: number }[]
}

export function computeParetoResult(
  scenarios: ScenarioCandidate[],
  riMap: Record<string, number>,
  budgetGlobal?: { amount: number; overrunPct: number } | null
): ParetoResult {
  const organizerFunded = budgetGlobal != null

  // Filtre dur (mode "organisateur finance tout") : le coût RÉEL total du scénario —
  // coût par personne × nombre de participants actifs de CE scénario précis, pas le
  // coût par personne seul — doit rester sous le plafond + tolérance de dépassement.
  // Contrairement aux contraintes dures classiques, ce filtre s'applique ici (au
  // stade Pareto), pas à la génération — pour que la page Scénarios puisse encore
  // tout montrer avec un simple avertissement avant que ce filtre ne s'applique.
  const eliminatedForBudget: { scenarioId: string; totalCost: number; limit: number }[] = []
  const budgetFiltered = organizerFunded
    ? scenarios.filter(s => {
        const realTotal = s.totalCost * s.activeUsers.length
        const limit = budgetGlobal!.amount * (1 + budgetGlobal!.overrunPct)
        if (realTotal > limit) {
          eliminatedForBudget.push({ scenarioId: s.id, totalCost: realTotal, limit })
          return false
        }
        return true
      })
    : scenarios

  const scored: ScoredScenario[] = budgetFiltered.map(scenario => {
    const perUser = scenario.activeUsers.map(({ profile, av }) =>
      computeUserUtility(profile, av, scenario, riMap[profile.id] ?? 1.0, organizerFunded)
    )
    const logSum = perUser.reduce((s, u) => s + u.weight * Math.log(0.01 + u.uPrime), 0)
    const totalWeight = perUser.reduce((s, u) => s + u.weight, 0)
    const groupScore = parseFloat(Math.exp(logSum / totalWeight).toFixed(4))
    return { scenario, perUser, groupScore, uVector: perUser.map(u => u.uPrime) }
  })

  const nonDominated = scored.filter(s =>
    !scored.some(other => other !== s && other.uVector.length === s.uVector.length && dominates(other.uVector, s.uVector))
  )
  const dominatedCount = scored.length - nonDominated.length

  const best = nonDominated.length ? Math.max(...nonDominated.map(s => s.groupScore)) : 0
  let margin = 10
  let finalists = nonDominated
  let marginWasExtended = false

  while (true) {
    const cutoff = best * (1 - margin / 100)
    finalists = nonDominated.filter(s => s.groupScore >= cutoff)
    if (finalists.length > 10) finalists = [...finalists].sort((a, b) => b.groupScore - a.groupScore).slice(0, 10)
    if (finalists.length >= 2) break
    if (margin >= 50) break
    margin += 5
    marginWasExtended = true
  }

  const cutoff = best * (1 - margin / 100)
  finalists = [...finalists].sort((a, b) => b.groupScore - a.groupScore)

  const isDirectWinner = finalists.length === 1
  let message: string
  if (budgetFiltered.length === 0 && scenarios.length > 0) {
    message = `Aucun scénario ne respecte le budget défini (${eliminatedForBudget.length} scénario${eliminatedForBudget.length > 1 ? 's' : ''} exclu${eliminatedForBudget.length > 1 ? 's' : ''} pour dépassement) — envisagez d'augmenter le plafond ou le seuil de dépassement toléré.`
  } else if (isDirectWinner) {
    message = 'Un seul scénario viable a été trouvé — il est recommandé directement.'
  } else if (marginWasExtended) {
    message = `La marge a été élargie à ${margin}% pour conserver le vote démocratique. ${finalists.length} scénarios retenus.`
  } else {
    message = `${finalists.length} scénarios retenus dans les ${margin}% du meilleur score (${Math.round(best * 100)}%).`
  }

  return { scored, nonDominated, finalists, best, cutoff, marginUsed: margin, marginWasExtended, isDirectWinner, message, dominatedCount, eliminatedForBudget }
}

// ─── Persistance du scénario gagnant ──────────────────────────────────────────

export interface VoteResultInfo {
  method:          'direct' | 'condorcet' | 'borda'
  pairwise?:       Record<string, Record<string, number>>
  bordaScores?:    Record<string, number>
  candidates?:     string[]
  candidateLabels?: Record<string, string>
  [key: string]: unknown
}

export async function persistWinningScenario(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  eventId: string,
  groupIds: string[],
  winning: ScoredScenario,
  voteResultInfo: VoteResultInfo
): Promise<void> {
  const snapshot = {
    id:               winning.scenario.id,
    date:             winning.scenario.date,
    dayLabel:         winning.scenario.dayLabel,
    activities:       winning.scenario.activities,
    timeline:         winning.scenario.timeline,
    windowStart:      winning.scenario.windowStart,
    windowEnd:        winning.scenario.windowEnd,
    totalCost:        winning.scenario.totalCost,
    totalTimeMinutes: winning.scenario.totalTimeMinutes,
    totalWaitMinutes: winning.scenario.totalWaitMinutes,
    groupScore:       winning.groupScore,
    perUser:          winning.perUser.map(u => ({
      userId: u.userId, uPrime: u.uPrime, ri: u.ri, fB: u.fB, fS: u.fS, fD: u.fD,
    })),
  }

  const { error: eventError } = await adminSupabase
    .from('events')
    .update({
      phase: 7,
      winning_scenario_id: winning.scenario.id,
      winning_scenario_snapshot: snapshot,
      vote_result: { ...voteResultInfo, concludedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)

  if (eventError) {
    console.error('persistWinningScenario — échec de la mise à jour de l\'événement:', eventError)
    throw new Error(`Impossible d'enregistrer le scénario gagnant : ${eventError.message}`)
  }

  if (groupIds.length > 0) {
    // Chaque participant est tagué avec TOUS ses groupes d'appartenance parmi ceux de
    // l'événement — quelqu'un membre de deux groupes tous deux invités au même
    // événement (ex. l'organisateur) doit voir SA nouvelle donnée alimenter les DEUX
    // trajectoires Rᵢ, qui continuent de diverger selon l'historique propre de chacune.
    const { data: memberRows } = await adminSupabase
      .from('group_members')
      .select('user_id, group_id')
      .in('group_id', groupIds)
      .in('user_id', winning.perUser.map(u => u.userId))
    const groupsByUser = new Map<string, string[]>()
    for (const r of (memberRows ?? [])) {
      const existing = groupsByUser.get(r.user_id) ?? []
      groupsByUser.set(r.user_id, [...existing, r.group_id])
    }

    const historyRows = winning.perUser
      .filter(u => groupsByUser.has(u.userId))
      .map(u => ({
        group_ids: groupsByUser.get(u.userId)!, event_id: eventId, user_id: u.userId, utility: u.uPrime,
      }))
    if (historyRows.length > 0) {
      const { error: historyError } = await adminSupabase.from('utility_history').insert(historyRows)
      if (historyError) {
        console.error('persistWinningScenario — échec de l\'écriture utility_history:', historyError)
      }
    }
  }
}
