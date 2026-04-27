// Supabase Edge Function: moncash-verify
// Verifie un orderId aupres de MonCash et confirme le paiement si succes.
//
// Body: { orderId } - retourne l'app apres redirect.
//
// Deploiement:
//   supabase functions deploy moncash-verify

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('MONCASH_BASE') || 'https://sandbox.moncashbutton.digicelgroup.com';
const CID  = Deno.env.get('MONCASH_CLIENT_ID')!;
const CSC  = Deno.env.get('MONCASH_CLIENT_SECRET')!;

const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getToken() {
  const basic = btoa(`${CID}:${CSC}`);
  const r = await fetch(`${BASE}/Api/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials&scope=read,write',
  });
  if (!r.ok) throw new Error(`moncash auth failed: ${r.status}`);
  return (await r.json()).access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { orderId } = await req.json();
    if (!orderId) return new Response(JSON.stringify({ error: 'orderId requis' }), { status: 400, headers: cors });

    const token = await getToken();
    const r = await fetch(`${BASE}/Api/v1/RetrieveOrderPayment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const j = await r.json();
    const ok = r.ok && j?.payment?.message === 'successful';

    const { data: row } = await supa.from('payments').select('id').eq('reference', orderId).maybeSingle();
    if (row?.id) {
      if (ok) {
        await supa.rpc('confirm_payment', { p_payment_id: row.id });
      } else {
        await supa.from('payments').update({ status: 'failed', metadata: j }).eq('id', row.id);
      }
    }

    return new Response(JSON.stringify({ ok, payment: j?.payment || null }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
