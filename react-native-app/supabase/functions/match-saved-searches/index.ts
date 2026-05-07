// supabase/functions/match-saved-searches/index.ts
// Edge Function (a deployer via `supabase functions deploy match-saved-searches`)
// Doit etre appellee par un cron Supabase (Database -> Cron) toutes les heures.
//
// Pour chaque saved_search active (frequency != 'off'):
//   - calcule le nombre de matches actuels via RPC match_saved_search
//   - si >0 et > last_count, push notification a l'utilisateur
//   - met a jour last_count + last_match_at
//
// Cron suggere : 0 * * * *  (toutes les heures)
//
// Variables d'env requises : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_ACCESS_TOKEN
//
// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function pushExpo(token: string, title: string, body: string, data: any) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, sound: 'default', title, body, data }),
  });
}

Deno.serve(async () => {
  const { data: searches, error } = await sb
    .from('saved_searches')
    .select('id, user_id, name, last_count')
    .neq('frequency', 'off');

  if (error) return new Response(error.message, { status: 500 });

  let notified = 0;
  for (const s of searches || []) {
    const { data: cnt } = await sb.rpc('match_saved_search', { p_id: s.id });
    const newCount = cnt || 0;
    if (newCount > (s.last_count || 0)) {
      // Recuperer les push tokens de l'utilisateur
      const { data: tokens } = await sb
        .from('push_tokens')
        .select('token')
        .eq('user_id', s.user_id);
      const newOnes = newCount - (s.last_count || 0);
      for (const t of tokens || []) {
        await pushExpo(
          t.token,
          'Nouveaux biens',
          `${newOnes} nouveau${newOnes > 1 ? 'x' : ''} bien${newOnes > 1 ? 's' : ''} pour "${s.name}"`,
          { type: 'saved_search', id: s.id },
        );
        notified++;
      }
    }
    await sb.from('saved_searches').update({
      last_count: newCount,
      last_match_at: new Date().toISOString(),
    }).eq('id', s.id);
  }

  return new Response(JSON.stringify({ ok: true, notified, processed: searches?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
