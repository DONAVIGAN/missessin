import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Génère un code au format MISS-<année>-XXXXXX (6 caractères alphanumériques).
function genererCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffixe = '';
  for (let i = 0; i < 6; i++) {
    suffixe += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MISS-${new Date().getFullYear()}-${suffixe}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { password, telephone, notes } = req.body || {};

  // Vérification du mot de passe AVANT toute action.
  // Le guard sur l'absence de variable d'env évite d'autoriser par défaut
  // si ADMIN_PASSWORD n'est pas configurée (undefined !== undefined = false).
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const code = genererCode();
  const maintenant = new Date();
  const dateExpiration = new Date(maintenant);
  dateExpiration.setDate(dateExpiration.getDate() + 30);

  const { data, error } = await supabase
    .from('abonnements')
    .insert({
      code,
      telephone: telephone || null,
      notes: notes || null,
      questions_restantes: 30,
      actif: true,
      date_creation: maintenant.toISOString(),
      date_expiration: dateExpiration.toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, code, data });
}
