// boostService - mise en avant payante d'une annonce.
import { supabase, isSupabaseConfigured } from './supabase';

export const BOOST_PLANS = [
  { id: 'b7',  days: 7,  price: 9.99,  label: '1 semaine', desc: 'Top des resultats 7 jours' },
  { id: 'b30', days: 30, price: 29.99, label: '1 mois',    desc: 'Top des resultats 30 jours' },
  { id: 'b90', days: 90, price: 79.99, label: '3 mois',    desc: 'Top des resultats 90 jours' },
];

// Active le boost premium (apres paiement confirme cote backend).
export async function applyBoost(propertyId, days) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error } = await supabase.rpc('apply_premium_boost', {
    p_property_id: propertyId, p_days: days,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Recupere les infos premium d'une annonce.
export async function getBoostStatus(propertyId) {
  if (!isSupabaseConfigured) return { ok: true, isPremium: false };
  const { data, error } = await supabase.from('properties')
    .select('is_premium, premium_until')
    .eq('id', propertyId).single();
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    isPremium: !!data?.is_premium && new Date(data.premium_until) > new Date(),
    until: data?.premium_until,
  };
}
