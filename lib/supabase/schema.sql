-- ============================================================================
-- IRIS v5 — Schéma Supabase corrigé
-- Version 2 — corrections sur le schéma généré par Copilot
--
-- Corrections par rapport à schema.sql v1 :
-- 1. users.id référence auth.users(id) → RLS auth.uid() = id fonctionne
-- 2. users : ajout zone, transport, weights, hard_constraints (colonnes IRIS)
-- 3. phase_3_activities : ajout zone, soc, acc, kid_ok, nut_ok, diab_ok,
--    vegan_ok, serves_food (colonnes utilisées par le moteur)
-- 4. Ajout table invitation_tokens (liens d'invitation + QR codes)
-- 5. Ajout colonne invite_code sur events (code court partageable)
--
-- Pour appliquer : coller dans Supabase SQL Editor → Run
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USERS
-- Profil étendu lié à Supabase Auth (auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  -- Clé = même UUID que auth.users → auth.uid() = id fonctionne dans les RLS
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,

  -- Localisation et transport (moteur IRIS)
  zone          TEXT DEFAULT 'P-centre',   -- zone géographique
  transport     TEXT CHECK (transport IN ('foot','transit','car')) DEFAULT 'transit',
  distance_max  INTEGER DEFAULT 15,        -- Dm en km

  -- Budget et profil social
  budget        INTEGER DEFAULT 30,        -- budget max par activité (€)
  social_level  INTEGER CHECK (social_level BETWEEN 1 AND 5) DEFAULT 3,

  -- Poids des 5 critères IRIS (JSONB, somme = 100)
  -- ex: {"activity":35,"schedule":25,"distance":20,"budget":10,"social":10}
  weights       JSONB DEFAULT '{"activity":35,"schedule":25,"distance":20,"budget":10,"social":10}',

  -- Contraintes dures (JSONB)
  -- ex: {"PMR":false,"kids":false,"nuts":false,"diet":false,"vegan":false}
  hard_constraints JSONB DEFAULT '{"PMR":false,"kids":false,"nuts":false,"diet":false,"vegan":false}',

  -- Préférences par type d'activité (JSONB, 0-100)
  -- ex: {"Escape Game":70,"Musée":60,"Restaurant":80,"Sport":40,"Détente":50}
  activity_prefs JSONB DEFAULT '{}',

  -- Métadonnées
  onboarding_done BOOLEAN DEFAULT false,  -- a-t-il complété son profil ?
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- GROUPS
-- Un groupe = une équipe qui planifie ensemble sur la durée
-- L'historique Rᵢ appartient au groupe (entre plusieurs événements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  -- Historique agrégé des votes passés pour le calcul des Rᵢ
  -- Structure : [{"event_id":"...","date":"...","scores":{"uid1":0.72,...}}, ...]
  vote_history JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON public.groups(owner_id);

-- ============================================================================
-- GROUP_MEMBERS
-- Appartenance à un groupe (indépendant des événements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      TEXT CHECK (status IN ('invited','active','rejected')) DEFAULT 'invited',
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status   ON public.group_members(status);

-- ============================================================================
-- EVENTS
-- Un événement = une sortie planifiée par un groupe
-- Plusieurs événements par groupe → historique Rᵢ inter-événements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,

  -- Phase du workflow IRIS
  -- 0=brouillon, 1=disponibilités, 2=activités, 3=préférences,
  -- 4=calcul, 5=vote, 6=résultat
  phase       INTEGER CHECK (phase BETWEEN 0 AND 6) DEFAULT 0,

  -- Dates proposées (tableau de dates en JSONB)
  -- ex: [{"label":"Sam. 14 juin","date":"2026-06-14","window":480}, ...]
  proposed_dates JSONB DEFAULT '[]',

  -- Code court pour partage rapide (ex: "IRIS-4K7X")
  invite_code TEXT UNIQUE,

  -- Budget global optionnel pour l'événement
  budget_global INTEGER,

  -- Fenêtre horaire par défaut (minutes)
  time_window INTEGER DEFAULT 480,

  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_group_id    ON public.events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_phase       ON public.events(phase);
CREATE INDEX IF NOT EXISTS idx_events_invite_code ON public.events(invite_code);

-- ============================================================================
-- INVITATION_TOKENS
-- Liens d'invitation pour participants sans compte IRIS
-- Utilisé pour les liens /join/[token] et QR codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitation_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64url'),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  -- Email pré-rempli si l'organisateur a invité par email
  email       TEXT,
  -- Statut du token
  status      TEXT CHECK (status IN ('pending','used','expired')) DEFAULT 'pending',
  -- ID de l'utilisateur qui a utilisé ce token (une fois accepté)
  used_by     UUID REFERENCES public.users(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token    ON public.invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_event_id ON public.invitation_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email    ON public.invitation_tokens(email);

-- ============================================================================
-- PHASE 1 — AVAILABILITIES
-- Disponibilités par participant et par date proposée
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.availabilities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      TEXT CHECK (status IN ('ok','no','cond')) DEFAULT 'cond',
  -- Probabilité de présence [0,1] — utilisée si status = 'cond'
  probability DECIMAL(3,2) CHECK (probability BETWEEN 0 AND 1) DEFAULT 0.70,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id, date)
);

CREATE INDEX IF NOT EXISTS idx_avail_user_id  ON public.availabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_avail_event_id ON public.availabilities(event_id);

-- ============================================================================
-- ACTIVITIES
-- Activités suggérées par les participants pour un événement
-- Contient toutes les colonnes utilisées par le moteur IRIS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  suggested_by UUID REFERENCES public.users(id),

  -- Informations de base
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- "Escape Game","Musée","Restaurant","Sport","Détente"
  description TEXT,
  url         TEXT,           -- lien réservation / info

  -- Données spatiales et temporelles
  zone        TEXT DEFAULT 'P-centre',
  address     TEXT,
  duration    INTEGER NOT NULL DEFAULT 90,   -- durée en minutes
  cost        INTEGER NOT NULL DEFAULT 0,    -- coût par personne (€)

  -- Niveau social de l'activité (1–5)
  social_level INTEGER CHECK (social_level BETWEEN 1 AND 5) DEFAULT 3,

  -- Contraintes (colonnes utilisées par hardOk() du moteur)
  acc         BOOLEAN DEFAULT true,   -- accessible PMR
  kid_ok      BOOLEAN DEFAULT true,   -- adapté enfants
  nut_ok      BOOLEAN DEFAULT true,   -- sans noix (si serves_food)
  diab_ok     BOOLEAN DEFAULT true,   -- adapté régime (si serves_food)
  vegan_ok    BOOLEAN DEFAULT true,   -- vegan-friendly (si serves_food)
  serves_food BOOLEAN DEFAULT false,  -- active les contraintes alimentaires

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_event_id ON public.activities(event_id);
CREATE INDEX IF NOT EXISTS idx_activities_type     ON public.activities(type);

-- ============================================================================
-- USER_EVENT_PROFILE
-- Profil de préférences d'un utilisateur pour un événement spécifique
-- Permet de surcharger le profil global de l'utilisateur pour cet événement
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_event_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Surcharge des poids (optionnel — null = utilise profil global)
  weights     JSONB,
  hard_constraints JSONB,
  activity_prefs   JSONB,
  zone        TEXT,
  transport   TEXT CHECK (transport IN ('foot','transit','car')),
  budget      INTEGER,
  social_level INTEGER,

  -- Statut de complétion
  profile_done BOOLEAN DEFAULT false,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_uep_user_id  ON public.user_event_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_uep_event_id ON public.user_event_profiles(event_id);

-- ============================================================================
-- SCENARIOS (générés par le moteur, stockés pour la phase vote)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scenarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- IDs des activités composant ce scénario
  activity_ids JSONB NOT NULL,  -- ex: ["uuid1","uuid2"]
  label       TEXT NOT NULL,    -- ex: "Escape Game + Restaurant"

  -- Métriques calculées par le moteur
  total_cost  INTEGER,
  total_time  INTEGER,          -- en minutes
  gm_score    DECIMAL(6,4),     -- score collectif GM [0,1]
  pareto_finalist BOOLEAN DEFAULT false,

  -- Satisfaction individuelle stockée pour affichage résultat
  -- ex: {"uid1":{"uRaw":0.72,"uPrime":0.75},...}
  user_scores JSONB DEFAULT '{}',

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_event_id ON public.scenarios(event_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_pareto   ON public.scenarios(pareto_finalist);

-- ============================================================================
-- VOTES
-- Classements Condorcet par participant
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  -- Classement des scenario_ids par ordre de préférence décroissant
  ranking     JSONB NOT NULL,  -- ex: ["uuid_sc1","uuid_sc3","uuid_sc2"]
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_event_id ON public.votes(event_id);

-- ============================================================================
-- EVENT_RESULTS
-- Résultat final stocké après le vote
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_results (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID UNIQUE NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  winner_scenario_id UUID REFERENCES public.scenarios(id),
  method            TEXT CHECK (method IN ('condorcet','borda')),
  gm_score          DECIMAL(6,4),
  pareto_margin     INTEGER,    -- % de marge utilisée
  vote_stats        JSONB,      -- statistiques détaillées
  finalized_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGER updated_at automatique
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_group_members_updated_at
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_avail_updated_at
  BEFORE UPDATE ON public.availabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_uep_updated_at
  BEFORE UPDATE ON public.user_event_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_votes_updated_at
  BEFORE UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTION : générer un invite_code court unique (ex: IRIS-4K7X)
-- Appelée automatiquement à la création d'un événement
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  IF NEW.invite_code IS NULL THEN
    LOOP
      code := 'IRIS-' || upper(substring(encode(gen_random_bytes(3), 'hex'), 1, 4));
      SELECT EXISTS(SELECT 1 FROM public.events WHERE invite_code = code) INTO exists_already;
      EXIT WHEN NOT exists_already;
    END LOOP;
    NEW.invite_code := code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_invite_code
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION generate_invite_code();

-- ============================================================================
-- FONCTION : créer automatiquement un profil users à l'inscription
-- Supabase Auth appelle cette fonction via un trigger sur auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users (Supabase gère auth, notre trigger crée le profil public)
CREATE OR REPLACE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: lecture profil propre"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: mise à jour profil propre"
  ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- GROUPS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups: voir les groupes dont je suis propriétaire"
  ON public.groups FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "groups: voir les groupes dont je suis membre actif"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "groups: créer un groupe"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "groups: modifier mon groupe"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- GROUP_MEMBERS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members: voir membres de mes groupes"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
        AND gm2.status = 'active'
    )
  );

CREATE POLICY "group_members: propriétaire peut inviter"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "group_members: propriétaire peut modifier statut"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
  );

-- Un membre peut accepter sa propre invitation
CREATE POLICY "group_members: accepter ma propre invitation"
  ON public.group_members FOR UPDATE
  USING (user_id = auth.uid());

-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events: voir les événements de mes groupes"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = events.group_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = events.group_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "events: créer un événement dans mon groupe"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = events.group_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = events.group_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "events: modifier un événement de mon groupe"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = events.group_id AND owner_id = auth.uid()
    )
  );

-- INVITATION_TOKENS — lisibles publiquement (nécessaire pour /join/[token])
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_tokens: lecture publique par token"
  ON public.invitation_tokens FOR SELECT
  USING (true);  -- le token lui-même fait office de secret

CREATE POLICY "invite_tokens: propriétaire peut créer"
  ON public.invitation_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      WHERE e.id = event_id AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "invite_tokens: mise à jour par n'importe qui authentifié (accept)"
  ON public.invitation_tokens FOR UPDATE
  USING (status = 'pending');

-- AVAILABILITIES
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avail: voir les dispo de mon événement"
  ON public.availabilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
      WHERE e.id = availabilities.event_id
        AND (g.owner_id = auth.uid() OR gm.status = 'active')
    )
  );

CREATE POLICY "avail: saisir mes dispo"
  ON public.availabilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "avail: modifier mes dispo"
  ON public.availabilities FOR UPDATE
  USING (auth.uid() = user_id);

-- ACTIVITIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities: voir les activités de mon événement"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
      WHERE e.id = activities.event_id
        AND (g.owner_id = auth.uid() OR gm.status = 'active')
    )
  );

CREATE POLICY "activities: suggérer une activité"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "activities: modifier ma suggestion"
  ON public.activities FOR UPDATE
  USING (auth.uid() = suggested_by);

-- USER_EVENT_PROFILES
ALTER TABLE public.user_event_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uep: voir mon profil événement"
  ON public.user_event_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "uep: créer mon profil événement"
  ON public.user_event_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uep: modifier mon profil événement"
  ON public.user_event_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- SCENARIOS, VOTES, EVENT_RESULTS : lecture pour membres du groupe
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scenarios: voir pour mon événement"
  ON public.scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
      WHERE e.id = scenarios.event_id
        AND (g.owner_id = auth.uid() OR gm.status = 'active')
    )
  );

CREATE POLICY "votes: voir les votes de mon événement"
  ON public.votes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      WHERE e.id = votes.event_id AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "votes: voter"
  ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes: modifier mon vote"
  ON public.votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "event_results: voir pour mon événement"
  ON public.event_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.groups g ON e.group_id = g.id
      LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
      WHERE e.id = event_results.event_id
        AND (g.owner_id = auth.uid() OR gm.status = 'active')
    )
  );

-- ============================================================================
-- FIN DU SCHÉMA
-- Tables créées :
--   users, groups, group_members, events, invitation_tokens,
--   availabilities, activities, user_event_profiles,
--   scenarios, votes, event_results
--
-- Prochaine étape : activer Supabase Auth → Email (magic link)
-- dans Authentication > Providers > Email → désactiver "Confirm email"
-- pour la démo, ou laisser activé pour la prod.
-- ============================================================================