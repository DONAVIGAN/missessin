import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, telephone, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (action === 'creer_code') {
    const code = 'MISS-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const dateExpiration = new Date();
    dateExpiration.setDate(dateExpiration.getDate() + 30);

    const { data, error } = await supabase
      .from('abonnements')
      .insert({
        code,
        telephone,
        questions_restantes: 30,
        date_expiration: dateExpiration.toISOString(),
        actif: true
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, code, data });
  }

  return res.status(400).json({ error: 'Action invalide' });
}
