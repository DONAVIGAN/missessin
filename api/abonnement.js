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

  const { action, code } = req.body;

  // Vérifier un code
  if (action === 'verifier') {
    const { data, error } = await supabase
      .from('abonnements')
      .select('*')
      .eq('code', code)
      .eq('actif', true)
      .single();

    if (error || !data) {
      return res.status(200).json({ valide: false, message: 'Code invalide ou expiré' });
    }

    if (new Date() > new Date(data.date_expiration)) {
      return res.status(200).json({ valide: false, message: 'Code expiré' });
    }

    if (data.questions_restantes <= 0) {
      return res.status(200).json({ valide: false, message: 'Quota de 30 questions épuisé' });
    }

    return res.status(200).json({ valide: true, questions_restantes: data.questions_restantes });
  }

  // Décrémenter le compteur
  if (action === 'decrementer') {
    const { data } = await supabase
      .from('abonnements')
      .select('questions_restantes')
      .eq('code', code)
      .single();

    if (data) {
      await supabase
        .from('abonnements')
        .update({ questions_restantes: data.questions_restantes - 1 })
        .eq('code', code);
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Action invalide' });
}
