// Supabase Edge Function: stripe-create-payment-intent
//
// Deploiement:
//   supabase functions deploy stripe-create-payment-intent
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//
// Appel cote app:
//   await supabase.functions.invoke('stripe-create-payment-intent', {
//     body: { amount: 2000, currency: 'usd', propertyId, purpose: 'listing' }
//   })
//
// Renvoie { clientSecret, paymentIntentId, paymentRowId } a consommer
// avec @stripe/stripe-react-native (presentPaymentSheet).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { amount, currency = 'usd', propertyId, purpose = 'listing' } = await req.json();
    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: 'amount invalide' }), { status: 400, headers: cors });
    }

    // Identifie l'utilisateur depuis le JWT
    const auth = req.headers.get('Authorization') || '';
    const supa = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await supa.auth.getUser();
    const userId = userData?.user?.id || null;

    // Cree un PaymentIntent Stripe
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: { propertyId: propertyId || '', userId: userId || '', purpose },
      automatic_payment_methods: { enabled: true },
    });

    // Insere une ligne payments en pending lie au PI
    const { data: row } = await supa.from('payments').insert({
      user_id: userId,
      property_id: propertyId || null,
      provider: 'stripe',
      purpose,
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      reference: intent.id,
      metadata: { intent_status: intent.status },
    }).select().single();

    return new Response(JSON.stringify({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      paymentRowId: row?.id,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
