// ORIZON - Service Premium (boost annonces + abonnements agence).
// Sandbox: simule paiement (1.2s), insere payments + applique boost via RPC.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

// Tarification (sandbox).
export const BOOST_PLANS = {
  '7d':  { days: 7,  amountUsd: 5,  amountHtg: 650,  label: 'Boost 7 jours' },
  '30d': { days: 30, amountUsd: 15, amountHtg: 1900, label: 'Boost 30 jours' },
};

export const AGENCY_PLANS = {
  agency_basic: { amountUsd: 25, amountHtg: 3200, label: 'Agence Basic',  features: ['10 annonces activées', 'Badge agence'] },
  agency_pro:   { amountUsd: 60, amountHtg: 7600, label: 'Agence Pro',    features: ['Annonces illimitees', 'Badge Pro', 'Stats avancees'] },
};

function feeFor(plan, currency) {
  return currency === 'HTG' ? { amount: plan.amountHtg, currency: 'HTG' } : { amount: plan.amountUsd, currency: 'USD' };
}

// ─── Boost premium ───
export async function boostListing({ propertyId, planKey = '7d', currency = 'USD' }) {
  const plan = BOOST_PLANS[planKey];
  if (!plan) return { ok: false, error: 'Plan inconnu' };
  const userId = useAuthStore.getState().user?.id || null;
  const { amount, currency: cur } = feeFor(plan, currency);

  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1000));
    return { ok: true, mock: true, days: plan.days };
  }

  const { data: pay, error: e1 } = await supabase
    .from('payments')
    .insert({
      user_id: userId, property_id: propertyId,
      provider: 'mock', purpose: 'boost',
      amount, currency: cur, status: 'pending',
      metadata: { planKey, days: plan.days, sandbox: true },
    })
    .select().single();
  if (e1) return { ok: false, error: e1.message };

  await new Promise((r) => setTimeout(r, 1200));

  const { error: e2 } = await supabase
    .from('payments')
    .update({ status: 'succeeded', confirmed_at: new Date().toISOString() })
    .eq('id', pay.id);
  if (e2) return { ok: false, error: e2.message };

  const { error: e3 } = await supabase.rpc('apply_premium_boost', {
    p_property_id: propertyId,
    p_days: plan.days,
  });
  if (e3) return { ok: false, error: e3.message };

  return { ok: true, paymentId: pay.id, days: plan.days };
}

// ─── Abonnement agence ───
export async function subscribeAgency({ planKey = 'agency_basic', currency = 'USD' }) {
  const plan = AGENCY_PLANS[planKey];
  if (!plan) return { ok: false, error: 'Plan inconnu' };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'Non authentifie' };
  const { amount, currency: cur } = feeFor(plan, currency);

  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1000));
    return { ok: true, mock: true };
  }

  // 1) payment ligne.
  const { data: pay, error: e1 } = await supabase
    .from('payments')
    .insert({
      user_id: userId, property_id: null,
      provider: 'mock', purpose: 'subscription',
      amount, currency: cur, status: 'pending',
      metadata: { planKey, sandbox: true },
    })
    .select().single();
  if (e1) return { ok: false, error: e1.message };

  await new Promise((r) => setTimeout(r, 1200));

  await supabase.from('payments')
    .update({ status: 'succeeded', confirmed_at: new Date().toISOString() })
    .eq('id', pay.id);

  // 2) subscription active 30 jours.
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: e2 } = await supabase.from('subscriptions').insert({
    user_id: userId, plan: planKey, status: 'active',
    provider: 'mock', reference: pay.id,
    current_period_end: periodEnd,
  });
  if (e2) return { ok: false, error: e2.message };

  return { ok: true, paymentId: pay.id, periodEnd };
}

export async function getActiveSubscription() {
  if (!isSupabaseConfigured) return { ok: true, data: null, mock: true };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, data: null };
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
