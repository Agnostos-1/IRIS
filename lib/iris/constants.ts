// lib/iris/constants.ts

export const EPS         = 0.01;
export const TRANSITION  = 30;    // marge entre activités (minutes)
export const MAX_FINALS  = 10;
export const MIN_FINALS  = 2;
export const MARGIN_STEP = 5;
export const MARGIN_MAX  = 50;

export const DIM_LABELS = ['Activité', 'Horaire', 'Distance', 'Budget', 'Social'] as const;

export const ZONE_LBL: Record<string, string> = {
  'P-nord':   'Paris-nord',
  'P-centre': 'Paris-centre',
  'P-est':    'Paris-est',
  'P-ouest':  'Paris-ouest',
  'P-sud':    'Paris-sud',
};

export const TRANSP_LBL: Record<string, string> = {
  foot:    '🚶 Pied',
  transit: '🚇 Transports',
  car:     '🚗 Voiture',
};

// Matrice de distances entre zones (km)
export const KM: Record<string, Record<string, number>> = {
  'P-nord':   { 'P-nord':0, 'P-centre':3, 'P-est':5,  'P-ouest':6, 'P-sud':7 },
  'P-centre': { 'P-nord':3, 'P-centre':0, 'P-est':4,  'P-ouest':4, 'P-sud':4 },
  'P-est':    { 'P-nord':5, 'P-centre':4, 'P-est':0,  'P-ouest':8, 'P-sud':6 },
  'P-ouest':  { 'P-nord':6, 'P-centre':4, 'P-est':8,  'P-ouest':0, 'P-sud':5 },
  'P-sud':    { 'P-nord':7, 'P-centre':4, 'P-est':6,  'P-ouest':5, 'P-sud':0 },
};

// Vitesses moyennes par mode de transport (km/h)
export const SPEED: Record<string, number> = {
  foot:    5,
  transit: 20,
  car:     30,
};
