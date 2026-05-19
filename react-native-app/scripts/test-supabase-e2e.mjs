// test-supabase-e2e.mjs
// Test end-to-end : connexion d'un compte demo + listing properties + insertion favori
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error('Manque SUPABASE_URL ou SUPABASE_ANON_KEY');
  process.exit(1);
}

const c = createClient(URL, ANON);
const out = (label, ok, detail = '') =>
  console.log(`  ${ok ? 'OK ' : 'KO '} ${label}${detail ? ' -> ' + detail : ''}`);

(async () => {
  console.log('=== E2E test ORIZON Supabase ===\n');

  console.log('1) Sign-in demo.proprio@orizon.ht');
  const { data: auth, error: e1 } = await c.auth.signInWithPassword({
    email: 'demo.proprio@orizon.ht',
    password: 'Demo2026!Orizon',
  });
  if (e1) return console.error('  KO', e1.message);
  out('signIn', !!auth.session, `uid=${auth.user.id}`);

  console.log('\n2) SELECT public.properties');
  const { data: props, error: e2, count } = await c
    .from('properties')
    .select('id,title,location,price,owner_id,status,payment_status', { count: 'exact' })
    .limit(5);
  out('select properties', !e2, e2 ? e2.message : `${count} lignes`);
  if (props) props.forEach((p) => console.log(`     #${p.id}  ${p.title.padEnd(30)}  ${p.price}$`));

  console.log('\n3) SELECT public.profiles WHERE id = me');
  const { data: prof, error: e3 } = await c
    .from('profiles')
    .select('id,full_name,role,verified,can_publish')
    .eq('id', auth.user.id)
    .single();
  out('select my profile', !e3, e3 ? e3.message : `role=${prof?.role}, verified=${prof?.verified}`);

  console.log('\n4) INSERT favorite (mes annonces)');
  if (props && props[0]) {
    const { error: e4 } = await c.from('favorites').upsert({
      user_id: auth.user.id,
      property_id: props[0].id,
    });
    out('insert favorite', !e4, e4?.message || `fav added on property #${props[0].id}`);
  }

  console.log('\n5) Sign-out');
  await c.auth.signOut();
  out('signOut', true);

  console.log('\n=== Done ===');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
