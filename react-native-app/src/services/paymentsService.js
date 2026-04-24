// Service de paiements ORIZON.
// - Stripe: utilise le SDK natif via PaymentSheet. Necessite une Edge Function
//   Supabase (ou backend) qui cree un PaymentIntent et renvoie le clientSecret.
//   Endpoint attendu: <SUPABASE_URL>/functions/v1/create-payment-intent
//   Body: { amount, currency, propertyId } -> { clientSecret, paymentIntentId }
//
// - MonCash: redirige vers une URL de paiement (Edge Function ou backend MonCash)
//   et ouvre WebBrowser. Endpoint attendu: /functions/v1/moncash-create
//   Body: { amount, propertyId } -> { redirectUrl, orderId }
//
// Mode mock: simule un paiement reussi apres 1.2s pour la demo.
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

async function authedFetch(path, body) {
  const session = (await supabase.auth.getSession()).data?.session;
  const headers = {
    'Content-Type': 'application/json',
    apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const r = await fetch(`${SUPABASE_URL}/functions/v1${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function logPayment({ provider, amount, currency = 'USD', status, reference, propertyId, metadata }) {
  if (!isSupabaseConfigured) return;
  const userId = useAuthStore.getState().user?.id || null;
  await supabase.from('payments').insert({
    user_id: userId,
    property_id: propertyId || null,
    provider, amount, currency, status,
    reference: reference || null,
    metadata: metadata || {},
  });
}

// --- Stripe ---
export async function payWithStripe({ amount, currency = 'USD', propertyId, label = 'ORIZON' }) {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return { ok: true, mock: true, reference: 'mock-stripe-' + Date.now() };
  }
  try {
    const { clientSecret, paymentIntentId } = await authedFetch('/create-payment-intent', {
      amount: Math.round(amount * 100), currency: currency.toLowerCase(), propertyId,
    });
    const init = await initPaymentSheet({
      merchantDisplayName: label,
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
    });
    if (init.error) return { ok: false, error: init.error.message };
    const present = await presentPaymentSheet();
    if (present.error) {
      await logPayment({ provider: 'stripe', amount, currency, status: 'failed', reference: paymentIntentId, propertyId });
      return { ok: false, error: present.error.message };
    }
    await logPayment({ provider: 'stripe', amount, currency, status: 'succeeded', reference: paymentIntentId, propertyId });
    return { ok: true, reference: paymentIntentId };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// --- MonCash ---
export async function payWithMonCash({ amount, propertyId, label = 'ORIZON' }) {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return { ok: true, mock: true, reference: 'mock-moncash-' + Date.now() };
  }
  try {
    const { redirectUrl, orderId } = await authedFetch('/moncash-create', { amount, propertyId });
    const result = await WebBrowser.openAuthSessionAsync(redirectUrl, 'orizon://payment-return');
    if (result.type !== 'success') {
      await logPayment({ provider: 'moncash', amount, status: 'failed', reference: orderId, propertyId, metadata: { label } });
      return { ok: false, error: 'Paiement MonCash interrompu' };
    }
    await logPayment({ provider: 'moncash', amount, status: 'succeeded', reference: orderId, propertyId, metadata: { label } });
    return { ok: true, reference: orderId };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export async function listMyPayments() {
  if (!isSupabaseConfigured) return { ok: true, data: [], mock: true };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}
