// Edge Function : envoie des notifications push Expo à plusieurs users.
// Requête : POST { user_ids: string[], title: string, body: string, data?: object }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { user_ids, title, body, data = {} } = await req.json();

  if (!user_ids?.length || !title) {
    return new Response(JSON.stringify({ error: 'user_ids + title requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Récupère les tokens actifs de ces utilisateurs.
  const { data: rows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', user_ids);

  if (error || !rows?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = rows.map((r: { token: string }) => ({
    to: r.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  // Batch de max 100 messages par appel Expo.
  const BATCH_SIZE = 100;
  let sentCount = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sentCount += batch.length;
  }

  return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
