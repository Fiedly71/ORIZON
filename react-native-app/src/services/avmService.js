// avmService - Estimation automatique de la valeur d'un bien (AVM simplifiee).
// Methode : moyenne du prix au m2 des biens comparables (meme type, meme ville, +/-30% surface).
import { supabase, isSupabaseConfigured } from './supabase';

export async function estimateValue({ type, location, area, bedrooms }) {
  if (!isSupabaseConfigured) {
    // Mock: 1500 USD/m2 base avec variabilite
    const baseM2 = 1500;
    return { ok: true, mock: true, estimate: Math.round((area || 100) * baseM2), confidence: 'low', sample: 0 };
  }
  let q = supabase.from('properties').select('price, area, bedrooms')
    .eq('moderation_status', 'approved')
    .eq('type', type || 'Maison')
    .gt('area', 0).gt('price', 0)
    .limit(50);
  if (location) {
    // Match approximatif sur la ville
    const city = String(location).split(',')[0].trim();
    q = q.ilike('location', `%${city}%`);
  }
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  const comps = (data || []).filter((c) => c.area >= (area * 0.7) && c.area <= (area * 1.3));
  if (comps.length < 3) return { ok: true, estimate: null, confidence: 'too_few', sample: comps.length };
  const ppm2 = comps.map((c) => c.price / c.area);
  const avg = ppm2.reduce((s, v) => s + v, 0) / ppm2.length;
  const sorted = [...ppm2].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const estimate = Math.round(area * median);
  const confidence = comps.length >= 10 ? 'high' : comps.length >= 5 ? 'medium' : 'low';
  return { ok: true, estimate, avg: Math.round(avg), median: Math.round(median), sample: comps.length, confidence };
}
