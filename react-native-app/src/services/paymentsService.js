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
import { track, EVT } from './analyticsService';
import { captureException } from './errorService';

// Tarification publication
export const LISTING_FEE_USD = 20;
export const LISTING_FEE_HTG = 2500;
export const USD_TO_HTG = 125; // taux de reference (sandbox)

// MonCash MANUEL - numero receveur central TROKE/ORIZON
// Le client paye sur ce numero MonCash, puis soumet la reference via l'app.
// L'admin valide manuellement.
export const MONCASH_RECEIVER_NUMBER = '39934388';
export const MONCASH_RECEIVER_NAME = 'ORIZON';

export const PROVIDERS = {
  STRIPE: 'stripe',
  MONCASH: 'moncash',
};

// Bascule REEL: quand true, on appelle les Supabase Edge Functions
// (stripe-create-payment-intent / moncash-create-order / moncash-verify).
// Sinon, on reste en SANDBOX (insert payments + confirm_payment direct).
export const USE_REAL_PAYMENTS =
  String(process.env.EXPO_PUBLIC_USE_REAL_PAYMENTS || '').toLowerCase() === 'true';

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

// Paiement carte (Stripe sandbox/mock OU reel via Edge Function)
export async function payListingWithStripe({ propertyId, label = 'ORIZON - Publication' }) {
  const { amount, currency } = feeFor(PROVIDERS.STRIPE);
  track(EVT.startPayment, { provider: 'stripe', amount, currency, propertyId, real: USE_REAL_PAYMENTS });

  // ---- Mode REEL (production) ----
  if (USE_REAL_PAYMENTS && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
        body: { amount, currency, propertyId, purpose: 'listing' },
      });
      if (error) throw error;
      const { clientSecret, paymentIntentId, paymentRowId } = data || {};
      if (!clientSecret) throw new Error('clientSecret manquant');

      // Presente le PaymentSheet Stripe (necessite @stripe/stripe-react-native + StripeProvider).
      let stripe;
      try { stripe = require('@stripe/stripe-react-native'); } catch { stripe = null; }
      if (!stripe?.initPaymentSheet) {
        return { ok: false, error: '@stripe/stripe-react-native non installe (yarn add @stripe/stripe-react-native)' };
      }
      const init = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'ORIZON',
      });
      if (init.error) throw new Error(init.error.message);
      const present = await stripe.presentPaymentSheet();
      if (present.error) {
        track(EVT.paymentFail, { provider: 'stripe', step: 'present', error: present.error.message });
        return { ok: false, error: present.error.message };
      }
      // Le webhook Stripe va appeler confirm_payment. On attend brievement.
      track(EVT.paymentSuccess, { provider: 'stripe', amount, currency, real: true });
      return { ok: true, paymentId: paymentRowId, reference: paymentIntentId, amount, currency };
    } catch (e) {
      captureException(e, { provider: 'stripe', mode: 'real' });
      track(EVT.paymentFail, { provider: 'stripe', step: 'edge', error: e?.message });
      return { ok: false, error: e?.message || String(e) };
    }
  }

  // ---- Mode SANDBOX ----
  const ins = await insertPendingPayment({
    provider: PROVIDERS.STRIPE, amount, currency, propertyId,
    metadata: { label, sandbox: true },
  });
  if (!ins.ok) { track(EVT.paymentFail, { provider: 'stripe', step: 'insert', error: ins.error }); return ins; }

  // SANDBOX: simulation d'un PaymentSheet Stripe.
  await new Promise((r) => setTimeout(r, 1200));

  const conf = await confirmPaymentRpc(ins.payment.id);
  if (!conf.ok) {
    await markFailed(ins.payment.id, conf.error);
    track(EVT.paymentFail, { provider: 'stripe', step: 'confirm', error: conf.error });
    captureException(new Error('Stripe confirm failed: ' + conf.error), { paymentId: ins.payment.id });
    return { ok: false, error: conf.error };
  }
  track(EVT.paymentSuccess, { provider: 'stripe', amount, currency });
  return {
    ok: true,
    paymentId: ins.payment.id,
    reference: `stripe_sandbox_${ins.payment.id}`,
    amount, currency,
    mock: !isSupabaseConfigured,
  };
}

// Paiement MonCash (sandbox/mock OU reel via Edge Function)
export async function payListingWithMonCash({ propertyId, phone, label = 'ORIZON - Publication' }) {
  const { amount, currency } = feeFor(PROVIDERS.MONCASH);
  track(EVT.startPayment, { provider: 'moncash', amount, currency, propertyId, real: USE_REAL_PAYMENTS });

  // ---- Mode REEL ----
  if (USE_REAL_PAYMENTS && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('moncash-create-order', {
        body: { amount, propertyId, purpose: 'listing' },
      });
      if (error) throw error;
      const { orderId, redirectUrl } = data || {};
      if (!redirectUrl) throw new Error('redirectUrl manquant');

      let WB;
      try { WB = require('expo-web-browser'); } catch { WB = null; }
      if (!WB?.openAuthSessionAsync) {
        return { ok: false, error: 'expo-web-browser non installe' };
      }
      const res = await WB.openAuthSessionAsync(redirectUrl, 'orizon://payment-return');
      if (res?.type !== 'success' && res?.type !== 'dismiss') {
        track(EVT.paymentFail, { provider: 'moncash', step: 'browser', type: res?.type });
        return { ok: false, error: 'paiement annule' };
      }
      // Verifie le paiement cote serveur
      const verify = await supabase.functions.invoke('moncash-verify', { body: { orderId } });
      if (verify.error || !verify.data?.ok) {
        track(EVT.paymentFail, { provider: 'moncash', step: 'verify', error: verify.error?.message });
        return { ok: false, error: verify.error?.message || 'paiement non confirme' };
      }
      track(EVT.paymentSuccess, { provider: 'moncash', amount, currency, real: true });
      return { ok: true, reference: orderId, amount, currency };
    } catch (e) {
      captureException(e, { provider: 'moncash', mode: 'real' });
      track(EVT.paymentFail, { provider: 'moncash', step: 'edge', error: e?.message });
      return { ok: false, error: e?.message || String(e) };
    }
  }

  // ---- Mode SANDBOX ----
  const ins = await insertPendingPayment({
    provider: PROVIDERS.MONCASH, amount, currency, propertyId,
    metadata: { label, phone: phone || null, sandbox: true },
  });
  if (!ins.ok) { track(EVT.paymentFail, { provider: 'moncash', step: 'insert', error: ins.error }); return ins; }

  // SANDBOX: simulation de l'ouverture du WebBrowser MonCash.
  await new Promise((r) => setTimeout(r, 1500));

  const conf = await confirmPaymentRpc(ins.payment.id);
  if (!conf.ok) {
    await markFailed(ins.payment.id, conf.error);
    track(EVT.paymentFail, { provider: 'moncash', step: 'confirm', error: conf.error });
    captureException(new Error('MonCash confirm failed: ' + conf.error), { paymentId: ins.payment.id });
    return { ok: false, error: conf.error };
  }
  track(EVT.paymentSuccess, { provider: 'moncash', amount, currency });
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

// ============================================================
// MONCASH MANUEL - paiement hors-bande avec validation admin
// ============================================================
//
// Workflow :
//   1. Le client paye 2500 HTG sur MonCash 39934388 (USSD *202# ou app MonCash)
//   2. Il recoit un SMS de confirmation avec une reference unique
//   3. Il revient dans l'app et soumet : reference + son numero
//   4. submitMonCashManual() cree un payment status=pending
//   5. Un admin verifie le SMS sur son telephone receveur et approuve
//   6. La RPC approve_payment confirme le paiement et active la propriete

export async function submitMonCashManual({ propertyId, reference, phone, amount, currency = 'HTG', purpose = 'listing' }) {
  if (!reference || reference.trim().length < 4) {
    return { ok: false, error: 'Reference MonCash invalide (4 caracteres minimum)' };
  }
  if (!phone || phone.replace(/\D/g, '').length < 8) {
    return { ok: false, error: 'Numero de telephone invalide' };
  }

  const fee = amount || LISTING_FEE_HTG;

  track(EVT.startPayment, { provider: 'moncash_manual', amount: fee, currency, propertyId });

  if (!isSupabaseConfigured) {
    return {
      ok: true,
      mock: true,
      paymentId: `mock-${Date.now()}`,
      message: 'Paiement enregistre (mode demo). Un admin va valider sous peu.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('submit_moncash_payment', {
      p_property_id: propertyId || null,
      p_amount: fee,
      p_currency: currency,
      p_purpose: purpose,
      p_reference: reference.trim().toUpperCase(),
      p_phone: phone.trim(),
    });
    if (error) {
      track(EVT.paymentFail, { provider: 'moncash_manual', error: error.message });
      return { ok: false, error: error.message };
    }
    return {
      ok: true,
      paymentId: data,
      message: 'Paiement soumis. Un admin va verifier ta reference et activer ta publication sous peu (quelques minutes a quelques heures).',
    };
  } catch (e) {
    captureException(e, { provider: 'moncash_manual' });
    return { ok: false, error: e?.message || String(e) };
  }
}

// Instructions affichees au client
export function getMonCashInstructions(amount = LISTING_FEE_HTG) {
  return [
    `Compose *202# ou ouvre l'app MonCash`,
    `Envoie ${amount} HTG au numero ${MONCASH_RECEIVER_NUMBER} (${MONCASH_RECEIVER_NAME})`,
    `Note la reference recue par SMS, puis reviens ici pour la soumettre`,
  ];
}

