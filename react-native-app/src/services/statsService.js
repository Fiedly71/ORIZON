// ORIZON - Tracking d'evenements + agregats vendeur.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const KINDS = ['view', 'contact', 'share', 'favorite'];

// Insert un evenement (no-op silencieux si pas de Supabase).
export async function trackEvent(propertyId, kind) {
  if (!propertyId || !KINDS.includes(kind)) return { ok: false };
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const userId = useAuthStore.getState().user?.id || null;
  try {
    await supabase.from('property_events').insert({
      property_id: propertyId,
      user_id: userId,
      kind,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export const trackView    = (id) => trackEvent(id, 'view');
export const trackContact = (id) => trackEvent(id, 'contact');
export const trackShare   = (id) => trackEvent(id, 'share');
export const trackFavorite = (id) => trackEvent(id, 'favorite');

// Agregats par bien pour le owner connecte.
export async function getMyStats() {
  if (!isSupabaseConfigured) return { ok: true, data: [], mock: true };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, data: [] };
  const { data, error } = await supabase.rpc('seller_stats', { p_owner: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}
