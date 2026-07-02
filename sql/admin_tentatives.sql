-- Table de journalisation des tentatives d'accès à /api/admin, utilisée pour
-- le rate-limiting anti brute-force (voir api/admin.js).
-- À exécuter dans Supabase → SQL Editor sur la base de Missessin.
--
-- Idempotent (IF NOT EXISTS) : sans effet si la table existe déjà.

create table if not exists admin_tentatives (
  id     uuid        primary key default gen_random_uuid(),
  ip     text        not null,
  succes boolean     not null default false,
  date   timestamptz not null default now()
);

-- Index pour la requête de comptage (IP + fenêtre temporelle glissante).
create index if not exists idx_admin_tentatives_ip_date
  on admin_tentatives (ip, date);

-- NOTE RLS : api/admin.js écrit via la clé anonyme (SUPABASE_ANON_KEY), comme
-- pour la table `abonnements`. Aligner la politique RLS de `admin_tentatives`
-- sur celle d'`abonnements` (mêmes droits d'insertion/lecture anon), sinon les
-- insertions de tentatives échoueront silencieusement (best-effort côté code).
