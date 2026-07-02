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

-- Droits pour la clé anon utilisée par api/admin.js : SELECT + INSERT seulement
-- (pas UPDATE/DELETE) afin qu'un attaquant ne puisse pas remettre son compteur
-- d'échecs à zéro via la clé anon publique. Sans ces droits, les insertions de
-- tentatives échouent silencieusement et le rate-limiting ne compte rien.
grant select, insert on table admin_tentatives to anon, authenticated;
alter table admin_tentatives disable row level security;
