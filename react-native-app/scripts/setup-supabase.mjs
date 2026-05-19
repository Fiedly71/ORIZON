// setup-supabase.mjs
// Cree les 3 comptes demo dans Supabase Auth + verifie la connectivite.
// Usage : node scripts/setup-supabase.mjs
//
// Pre-requis : SETUP_DATABASE.sql et db/demo_seed.sql deja executes dans
// le SQL Editor Supabase (creent les tables/policies + profils + 5 annonces).
//
// SECRETS lus depuis les variables d'env (NE PAS hardcoder dans le repo) :
//   SUPABASE_URL              ex. https://vghcduobhuccmsvlbokv.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  ex. eyJ...
//
// Le script :
//   1) cree (ou met a jour) les 3 utilisateurs demo avec email_confirm=true
//   2) affiche leurs UUID -> a utiliser pour controler le seed SQL si besoin
//   3) tente un select sur public.properties pour valider l'anon key

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

if (!URL || !SERVICE) {
  console.error('Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans l\'env.');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = 'Demo2026!Orizon';
const DEMO_USERS = [
  { email: 'demo.acheteur@orizon.ht', role: 'Acheteur / Locataire', name: 'Demo Acheteur' },
  { email: 'demo.proprio@orizon.ht',  role: 'Proprietaire',         name: 'Demo Proprietaire' },
  { email: 'demo.agence@orizon.ht',   role: 'Agence',               name: 'Agence Demo ORIZON' },
];

async function upsertUser(u) {
  // Cherche s'il existe deja
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  const existing = list.users.find((x) => x.email === u.email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.name, role: u.role },
    });
    if (error) throw error;
    console.log(`  MAJ : ${u.email}  uid=${existing.id}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.name, role: u.role },
  });
  if (error) throw error;
  console.log(`  CREE : ${u.email}  uid=${data.user.id}`);
  return data.user.id;
}

(async () => {
  console.log('=== ORIZON Supabase setup ===');
  console.log('URL :', URL);
  console.log('');
  console.log('1) Creation/MAJ des 3 comptes demo (mdp : Demo2026!Orizon)');
  const ids = {};
  for (const u of DEMO_USERS) {
    try {
      ids[u.email] = await upsertUser(u);
    } catch (e) {
      console.error(`  ECHEC ${u.email} :`, e.message);
    }
  }

  console.log('');
  console.log('2) Verification anon key sur public.properties');
  if (ANON) {
    const pub = createClient(URL, ANON);
    const { data, error, count } = await pub
      .from('properties')
      .select('id', { count: 'exact', head: true });
    if (error) {
      console.error('  ECHEC select :', error.message);
      console.error('  -> verifie que SETUP_DATABASE.sql a bien ete execute.');
    } else {
      console.log(`  OK : table properties accessible. Nb lignes : ${count ?? 0}`);
    }
  } else {
    console.log('  (skip - SUPABASE_ANON_KEY non fourni)');
  }

  console.log('');
  console.log('=== Termine ===');
  console.log('Prochaines etapes :');
  console.log('  - Si pas encore fait : execute SETUP_DATABASE.sql puis db/demo_seed.sql');
  console.log('    dans le SQL Editor Supabase (Dashboard > SQL Editor > New query)');
  console.log('  - Apres seed, les 3 comptes ci-dessus seront prets pour les reviewers Apple/Google.');
})().catch((e) => {
  console.error('FATAL :', e);
  process.exit(1);
});
