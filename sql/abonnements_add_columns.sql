-- Ajoute les colonnes utilisées par api/admin.js (génération de code) :
--   - date_creation : horodatage de création du code (on insère un ISO 8601 UTC)
--   - notes         : notes libres / référence de paiement saisies par l'admin
--
-- Idempotent (IF NOT EXISTS) : sans effet si les colonnes existent déjà.
-- À exécuter dans Supabase → SQL Editor sur la base de Missessin.

ALTER TABLE abonnements
  ADD COLUMN IF NOT EXISTS date_creation timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes text;
