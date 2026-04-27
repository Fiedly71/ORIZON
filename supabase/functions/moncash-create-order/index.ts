// Supabase Edge Function: moncash-create-order
//
// Cree un ordre MonCash via l'API Digicel et renvoie redirectUrl + orderId.
// L'app ouvre redirectUrl dans expo-web-browser, attend le retour.
//
// Deploiement:
//   supabase functions deploy moncash-create-order
//   supabase secrets set MONCASH_CLIENT_ID=xxx MONCASH_CLIENT_SECRET=xxx MONCASH_BASE=https://moncashbutton.digicelgroup.com
//
// Body attendu: { amount: 2500, propertyId, purpose }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('MONCASH_BASE') || 'https://sandbox.moncashbutton.digicelgroup.com';
const CID  = Deno.env.get('MONCASH_CLIENT_ID')!;
const CSC  = Deno.env.get('MONCASH_CLIENT_SECRET')!;

const supaUrl = Deno.env.get('SUPABASE_URL')!;
const svc     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getMoncashToken() {
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
  if (!r.ok) throw new Error(`moncash auth failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { amount, propertyId, purpose = 'listing' } = await req.json();
    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: 'amount invalide' }), { status: 400, headers: cors });
    }

    const auth = req.headers.get('Authorization') || '';
    const supa = createClient(supaUrl, svc, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await supa.auth.getUser();
    const userId = ud?.user?.id || null;

    const token = await getMoncashToken();
    const orderId = `orizon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Cree le paiement
    const r = await fetch(`${BASE}/Api/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ amount, orderId }),
    });
    if (!r.ok) throw new Error(`moncash create failed: ${r.status} ${await r.text()}`);
    const j = await r.json();
    const token2 = j?.payment_token?.token;
    if (!token2) throw new Error('moncash token absent');

    const redirectUrl = `${BASE}/Moncash-middleware/Payment/Redirect?token=${encodeURIComponent(token2)}`;

    // Insere une ligne pending
    await supa.from('payments').insert({
      user_id: userId, property_id: propertyId || null,
      provider: 'moncash', purpose, amount, currency: 'HTG',
      status: 'pending', reference: orderId,
      metadata: { token: token2 },
    });

    return new Response(JSON.stringify({ orderId, redirectUrl }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
