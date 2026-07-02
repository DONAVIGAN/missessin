import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --- Anti brute-force -------------------------------------------------------
// Endpoint admin sensible (génère des codes d'accès payants). Vercel étant
// stateless (pas de mémoire fiable entre invocations), on stocke les tentatives
// échouées dans Supabase (table `admin_tentatives`) pour un rate-limiting fiable.
const FENETRE_MINUTES = 15; // fenêtre glissante d'observation des échecs
const MAX_ECHECS = 5;       // échecs autorisés par IP dans la fenêtre

function getIp(req) {
  // Sur Vercel, x-real-ip = IP réelle du client posée par la plateforme
  // (moins falsifiable que x-forwarded-for, que le client peut préfixer).
  return (
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'inconnue'
  );
}

// Comparaison à temps constant pour éviter les attaques par timing.
function motDePasseValide(fourni, attendu) {
  if (!attendu || typeof fourni !== 'string') return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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

  const ip = getIp(req);

  // 1. Rate-limiting : refuser si trop d'échecs récents depuis cette IP.
  //    On ne « fail-close » PAS en cas d'erreur Supabase : le mot de passe
  //    protège de toute façon, donc on log et on poursuit vers la vérification.
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();
  const { count, error: errCount } = await supabase
    .from('admin_tentatives')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('succes', false)
    .gte('date', depuis);

  if (!errCount && count >= MAX_ECHECS) {
    res.setHeader('Retry-After', String(FENETRE_MINUTES * 60));
    return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard' });
  }

  const { password, telephone, notes } = req.body || {};

  // 2. Vérification du mot de passe (temps constant). Le guard sur l'absence
  //    de variable d'env évite d'autoriser par défaut si ADMIN_PASSWORD manque.
  if (!motDePasseValide(password, process.env.ADMIN_PASSWORD)) {
    // Journaliser l'échec (best-effort — n'interrompt pas la réponse 401).
    await supabase.from('admin_tentatives').insert({ ip, succes: false });
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // 3. Succès : générer le code d'accès.
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

  // Tracer le succès (best-effort) — utile pour l'audit des générations.
  await supabase.from('admin_tentatives').insert({ ip, succes: true });

  return res.status(200).json({ success: true, code, data });
}
