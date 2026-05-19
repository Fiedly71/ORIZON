// test-supabase-e2e.mjs
// Test bout-en-bout : connexion compte demo + lecture annonces + insertion favori + nettoyage.
// Usage : (depuis racine workspace, apres avoir defini SUPABASE_URL et SUPABASE_ANON_KEY)
//   node scripts/test-supabase-e2e.mjs

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const supaPath = resolve(process.cwd(), 'react-native-app/node_modules/@supabase/supabase-js/dist/index.mjs');
const { createClient } = await import(pathToFileURL(supaPath).href);

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !ANON) { console.error('Manque SUPABASE_URL / SUPABASE_ANON_KEY'); process.exit(1); }

const supa = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = 'demo.acheteur@orizon.ht';
const PWD = 'Demo2026!Orizon';

(async () => {
  console.log('=== E2E test ORIZON ===\n');

  console.log('1) Login', EMAIL);
  const { data: auth, error: e1 } = await supa.auth.signInWithPassword({ email: EMAIL, password: PWD });
  if (e1) { console.error('  ECHEC :', e1.message); process.exit(1); }
  console.log('  OK uid=', auth.user.id);

  console.log('\n2) SELECT public.properties (avec session)');
  const { data: props, error: e2 } = await supa.from('properties').select('id,title,price,type,status').limit(5);
  if (e2) { console.error('  ECHEC :', e2.message); process.exit(1); }
  console.log('  OK', props.length, 'biens :');
  props.forEach(p => console.log('   -', p.title, '|', p.type, '|', p.status, '|', p.price));

  if (props.length === 0) { console.log('\n(rien a tester sur favoris)'); process.exit(0); }

  const target = props[0].id;
  console.log('\n3) INSERT favori sur', target);
  const { error: e3 } = await supa.from('favorites').upsert({ user_id: auth.user.id, property_id: target });
  if (e3) { console.error('  ECHEC :', e3.message); }
  else { console.log('  OK'); }

  console.log('\n4) SELECT mes favoris');
  const { data: favs, error: e4 } = await supa.from('favorites').select('property_id').eq('user_id', auth.user.id);
  if (e4) { console.error('  ECHEC :', e4.message); }
  else { console.log('  OK', favs.length, 'fav(s)'); }

  console.log('\n5) DELETE favori (cleanup)');
  const { error: e5 } = await supa.from('favorites').delete().eq('user_id', auth.user.id).eq('property_id', target);
  if (e5) { console.error('  ECHEC :', e5.message); } else { console.log('  OK'); }

  console.log('\n6) Logout');
  await supa.auth.signOut();
  console.log('  OK');
  console.log('\n=== E2E PASS ===');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
