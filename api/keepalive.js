import { createClient } from '@supabase/supabase-js';

// service_role de préférence (count fiable même après réactivation de la RLS) ;
// fallback anon tant que la clé n'est pas configurée.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Endpoint de "keep-alive" : appelé 1x/jour par un cron pour éviter
// que le projet Supabase (plan gratuit) ne se mette en pause après
// ~7 jours d'inactivité — cause de la panne d'accès du 2026-07-16.
// Lecture seule : un count "head" qui touche la base sans ramener de données.
export default async function handler(req, res) {
  try {
    const { error, count } = await supabase
      .from('abonnements')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, count });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
