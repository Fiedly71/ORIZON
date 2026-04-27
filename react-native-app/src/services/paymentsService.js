// ORIZON - Service de paiements (mode SANDBOX par defaut).
//
// Frais de publication: 20 USD ou 2 500 HTG par annonce.
//
// Deux fournisseurs supportes (sandbox/mock pour l'instant):
//   - 'stripe'  : carte bancaire en USD (Visa/MasterCard)
//   - 'moncash' : portefeuille mobile haitien en HTG
//
// En PROD, brancher:
//   - Stripe via une Edge Function Supabase /create-payment-intent
//     qui renvoie clientSecret -> consommer avec @stripe/stripe-react-native.
//   - MonCash via /moncash-create qui renvoie redirectUrl -> ouvrir avec
//     expo-web-browser, attendre la redirection orizon://payment-return,
//     puis verifier l'orderId cote serveur.
//
// Ici en SANDBOX:
//   1) On insere une ligne 'payments' (status=pending) liee a la propriete.
//   2) On simule l'interaction utilisateur (1.2s d'attente).
//   3) On appelle la RPC public.confirm_payment(payment_id) qui:
//        - met payments.status='succeeded'
//        - met properties.payment_status='paid' + published_at=now()
//   4) On renvoie {ok:true, reference, paymentId}.

import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

// Tarification publication
export const LISTING_FEE_USD = 20;
export const LISTING_FEE_HTG = 2500;
export const USD_TO_HTG = 125; // taux de reference (sandbox)

export const PROVIDERS = {
  STRIPE: 'stripe',
  MONCASH: 'moncash',
};

export function feeFor(provider) {
  return provider === PROVIDERS.MONCASH
    ? { amount: LISTING_FEE_HTG, currency: 'HTG' }
    : { amount: LISTING_FEE_USD, currency: 'USD' };
}

// --------- Helpers internes ---------

async function insertPendingPayment({ provider, amount, currency, propertyId, purpose = 'listing', metadata = {} }) {
  const userId = useAuthStore.getState().user?.id || null;
  if (!isSupabaseConfigured) {
    // mode mock total
    return {
      ok: true,
      mock: true,
      payment: {
        id: `mock-pay-${Date.now()}`,
        user_id: userId,
        property_id: propertyId,
        provider, purpose, amount, currency,
        status: 'pending',
      },
    };
  }
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      property_id: propertyId || null,
      provider, purpose, amount, currency,
      status: 'pending',
      metadata,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, payment: data };
}

async function confirmPaymentRpc(paymentId) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error } = await supabase.rpc('confirm_payment', { p_payment_id: paymentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function markFailed(paymentId, reason) {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('payments')
    .update({ status: 'failed', metadata: { reason } })
    .eq('id', paymentId);
}

// --------- API publique ---------

// Paiement carte (Stripe sandbox/mock)
export async function payListingWithStripe({ propertyId, label = 'ORIZON - Publication' }) {
  const { amount, currency } = feeFor(PROVIDERS.STRIPE);
  const ins = await insertPendingPayment({
    provider: PROVIDERS.STRIPE, amount, currency, propertyId,
    metadata: { label, sandbox: true },
  });
  if (!ins.ok) return ins;

  // SANDBOX: simulation d'un PaymentSheet Stripe.
  await new Promise((r) => setTimeout(r, 1200));

  const conf = await confirmPaymentRpc(ins.payment.id);
  if (!conf.ok) {
    await markFailed(ins.payment.id, conf.error);
    return { ok: false, error: conf.error };
  }
  return {
    ok: true,
    paymentId: ins.payment.id,
    reference: `stripe_sandbox_${ins.payment.id}`,
    amount, currency,
    mock: !isSupabaseConfigured,
  };
}

// Paiement MonCash (sandbox/mock)
export async function payListingWithMonCash({ propertyId, phone, label = 'ORIZON - Publication' }) {
  const { amount, currency } = feeFor(PROVIDERS.MONCASH);
  const ins = await insertPendingPayment({
    provider: PROVIDERS.MONCASH, amount, currency, propertyId,
    metadata: { label, phone: phone || null, sandbox: true },
  });
  if (!ins.ok) return ins;

  // SANDBOX: simulation de l'ouverture du WebBrowser MonCash.
  await new Promise((r) => setTimeout(r, 1500));

  const conf = await confirmPaymentRpc(ins.payment.id);
  if (!conf.ok) {
    await markFailed(ins.payment.id, conf.error);
    return { ok: false, error: conf.error };
  }
  return {
    ok: true,
    paymentId: ins.payment.id,
    reference: `moncash_sandbox_${ins.payment.id}`,
    amount, currency,
    mock: !isSupabaseConfigured,
  };
}

// Helper generique
export async function payListing({ provider, propertyId, phone }) {
  if (provider === PROVIDERS.MONCASH) return payListingWithMonCash({ propertyId, phone });
  return payListingWithStripe({ propertyId });
}

// Liste l'historique des paiements de l'utilisateur connecte.
export async function listMyPayments() {
  if (!isSupabaseConfigured) return { ok: true, data: [], mock: true };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}
