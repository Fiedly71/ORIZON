// Service: historique de prix d'un bien.
import { supabase, isSupabaseConfigured } from './supabase';

const TABLE = 'price_history';
const mockStore = { items: [] };

export async function listPriceHistory(propertyId) {
  if (!isSupabaseConfigured) {
    return { ok: true, data: mockStore.items.filter((i) => i.property_id === propertyId), mock: true };
  }
  const { data, error } = await supabase
    .from(TABLE).select('*').eq('property_id', propertyId).order('noted_at', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function recordPrice(propertyId, price, { source = 'manual', currency = 'USD' } = {}) {
  const row = {
    property_id: propertyId, price: Number(price), currency, source,
    noted_at: new Date().toISOString().slice(0, 10),
  };
  if (!isSupabaseConfigured) {
    const item = { id: 'ph-' + Date.now(), ...row };
    mockStore.items.push(item);
    return { ok: true, data: item, mock: true };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
