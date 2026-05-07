// statsHistoryService - serie temporelle des events sur 7 jours.
import { supabase, isSupabaseConfigured } from './supabase';

// Retourne { labels:['L','M',...], views:[..], contacts:[..] } sur les 7 derniers jours
// pour toutes les annonces du proprietaire (ou une seule si propertyId fourni).
export async function getEventsLast7Days({ propertyId, ownerId } = {}) {
  const labels = [];
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    labels.push(['D','L','M','M','J','V','S'][d.getDay()]);
    days.push(d.toISOString().slice(0, 10));
  }

  if (!isSupabaseConfigured) {
    // Mock realiste
    const rand = () => Math.floor(Math.random() * 25);
    return { ok: true, labels, views: days.map(rand), contacts: days.map(() => Math.floor(Math.random() * 5)) };
  }

  let query = supabase.from('property_events')
    .select('kind, created_at, property_id')
    .gte('created_at', days[0]);
  if (propertyId) query = query.eq('property_id', propertyId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const views = new Array(7).fill(0);
  const contacts = new Array(7).fill(0);
  for (const ev of (data || [])) {
    const day = ev.created_at.slice(0, 10);
    const idx = days.indexOf(day);
    if (idx < 0) continue;
    if (ev.kind === 'view') views[idx]++;
    else if (ev.kind === 'contact') contacts[idx]++;
  }
  return { ok: true, labels, views, contacts };
}
