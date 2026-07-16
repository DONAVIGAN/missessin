-- Droits d'accès à la table `abonnements` pour la clé `anon` utilisée par les
-- fonctions serverless api/abonnement.js (vérification + décrément) et
-- api/admin.js (génération de code + RETURNING via .select()).
--
-- Contexte : la clé anon n'est PAS exposée au navigateur — le front passe
-- toujours par /api/*, jamais directement par Supabase. Le niveau de confiance
-- est donc le même que pour `admin_tentatives`.
--
-- Symptôme corrigé : sans ces droits (RLS active, aucune policy anon), le
-- SELECT ... .single() de vérification ne remonte aucune ligne, `error` est
-- vrai, et TOUS les codes ressortent « Code invalide ou expiré ».
--
-- À exécuter dans Supabase -> SQL Editor sur la base de Missessin.
-- Idempotent : ré-exécutable sans effet de bord.

-- Droits nécessaires :
--   SELECT  -> verifier (abonnement.js) + RETURNING de l'insert (admin.js)
--   INSERT  -> génération de code (admin.js)
--   UPDATE  -> décrément du quota questions_restantes (abonnement.js)
-- Volontairement PAS de DELETE via la clé anon.
grant select, insert, update on table abonnements to anon, authenticated;

-- Désactive la RLS sur cette table : l'accès est déjà médiatisé par les
-- fonctions /api (la clé anon n'est jamais publique côté client), donc aucune
-- policy fine n'est requise. Cohérent avec admin_tentatives.
alter table abonnements disable row level security;
