// lib/iris/types.ts — v2
// Mis à jour avec les 19 contraintes dures et les nouveaux attributs d'activité

export type TransportMode = 'foot' | 'transit' | 'car'

export interface HardConstraints {
  // Mobilité
  PMR?:     boolean
  stair?:   boolean
  cardio?:  boolean
  vertigo?: boolean
  aquatic?: boolean
  // Accompagnement
  kids?: boolean
  pets?: boolean
  // Alimentaire
  nuts?:         boolean
  diet?:         boolean
  vegan?:        boolean
  gluten?:       boolean
  seafood?:      boolean
  halal_kosher?: boolean
  alcohol?:      boolean
  pregnancy?:    boolean
  // Environnement
  noise?:        boolean
  epilepsy?:     boolean
  smoke?:        boolean
  allergy_pets?: boolean
}

export interface UserWeights {
  activity: number
  schedule: number
  distance: number
  budget:   number
  social:   number
}

export interface IrisUser {
  id:               number
  name?:            string
  display_name?:    string | null
  zone?:            string
  distance_max?:    number
  social_level?:    number
  budget?:          number
  transport?:       TransportMode
  weights?:         UserWeights
  activity_prefs?:  Record<string, number>  // type → 0-100
  hard_constraints?: HardConstraints
}

export interface IrisActivity {
  id:          number
  name:        string
  type:        string
  zone?:       string
  cost?:       number
  duration?:   number        // minutes (anciennement 'dur')
  socialLevel?: number       // 1-5

  // Accessibilité de base
  acc?:        boolean       // PMR accessible
  kidOk?:      boolean
  noStairs?:   boolean       // pas d'escaliers
  petsAllowed?: boolean      // animaux acceptés

  // Caractéristiques physiques/environnementales
  isIntense?:     boolean    // effort physique intense
  isHighAltitude?: boolean   // hauteur / acrophobie
  isAquatic?:     boolean    // activité aquatique
  isLoud?:        boolean    // lieu bruyant
  hasStrobe?:     boolean    // lumières stroboscopiques
  smokeFree?:     boolean    // zone non-fumeur
  hasPets?:       boolean    // animaux présents sur place

  // Alimentaire (actifs seulement si servesFood = true)
  servesFood?:  boolean
  nutOk?:       boolean
  diabOk?:      boolean
  veganOk?:     boolean
  glutenOk?:    boolean
  seafoodOk?:   boolean
  halalOk?:     boolean
  alcoholFree?: boolean
  pregnancyOk?: boolean
}

export interface DateSlot {
  label:     string
  date?:     string
  startTime?: string
  endTime?:   string
  window:    number   // minutes disponibles
}

export type AvailStatus = 'ok' | 'no' | 'cond'

export interface ActiveUser {
  uid:    number
  weight: number
  uRaw:   number
  uPrime: number
}

export interface Scenario {
  id:          string
  did:         number
  dateLabel:   string
  timeWindow:  number
  ids:         number[]
  acts:        IrisActivity[]
  label:       string
  totalCost:   number
  totalTime:   number
  nEff:        number
  activeUsers: ActiveUser[]
  score:       number
  uVec:        number[]
}

export interface ParetoResult {
  finalistes: Scenario[]
  margin:     number
  best:       number
  comment:    string
}

export interface CondorcetResult {
  duel:      number[][]
  wins:      number[]
  borda:     number[]
  wId:       string | null
  bId:       string | null
  comment:   string
  defRanks:  string[][]
  allUids:   number[]
}

export interface HistoryEntry {
  lbl:  string
  date: string
  us:   number[]
}
