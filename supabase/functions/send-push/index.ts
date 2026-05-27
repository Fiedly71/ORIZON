// @ts-nocheck
// deno-lint-ignore-file
// Supabase Edge Function: send-push (Deno runtime - le LSP TypeScript de VS Code
// configure pour Node ne resout pas les imports https:// ni le global Deno.)
// Envoie une notification Expo Push a un ou plusieurs users (via leurs tokens dans push_tokens).
// Invoque depuis :
//  - un trigger DB (on_message_inserted)
//  - depuis le client admin (broadcast)
//  - depuis d'autres Edge Functions (match saved_searches)
//
// Body JSON :
//   { userIds: ['uuid','uuid'], title: '...', body: '...', data?: {...} }
//   OU
//   { tokens: ['ExpoToken[...]'], title, body, data }
//
// Deploy :
//   supabase functions deploy send-push --no-verify-jwt
//
// Pas de secret requis (Expo Push API publique pour les tokens valides).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { userIds = [], tokens: directTokens = [], title, body, data = {} } = payload || {};

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title et body requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let tokens: string[] = Array.isArray(directTokens) ? [...directTokens] : [];

    if (userIds.length > 0) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: rows, error } = await supabase
        .from('push_tokens')
        .select('token')
        .in('user_id', userIds);
      if (error) throw error;
      tokens.push(...(rows || []).map((r) => r.token).filter(Boolean));
    }

    tokens = Array.from(new Set(tokens)).filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: 'no tokens' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Expo accepte des batchs jusqu'a 100 messages.
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    const chunks: any[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let sent = 0;
    const errors: any[] = [];
    for (const chunk of chunks) {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      const j = await resp.json().catch(() => null);
      if (resp.ok) sent += chunk.length;
      else errors.push(j || { status: resp.status });
    }

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
