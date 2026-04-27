// Supabase Edge Function: stripe-webhook
// Reception des events Stripe et confirmation paiement -> RPC confirm_payment.
//
// Deploiement:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// Stripe Dashboard > Webhooks > endpoint URL:
//   https://<project>.functions.supabase.co/stripe-webhook
// Events a souscrire: payment_intent.succeeded, payment_intent.payment_failed

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature') || '';
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    return new Response(`bad signature: ${e.message}`, { status: 400 });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Retrouve la ligne payments via reference = pi.id
      const { data: row } = await supa.from('payments').select('id').eq('reference', pi.id).maybeSingle();
      if (row?.id) {
        await supa.rpc('confirm_payment', { p_payment_id: row.id });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supa.from('payments')
        .update({ status: 'failed', metadata: { reason: pi.last_payment_error?.message || 'failed' } })
        .eq('reference', pi.id);
    }
  } catch (e) {
    console.error('webhook handler error', e);
    return new Response('handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
