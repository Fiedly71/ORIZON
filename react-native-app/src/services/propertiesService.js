// Service Properties ORIZON.
// Mode mock: pas de cles -> on utilise propertiesSeed.
// Mode reel: requetes Supabase sur la table 'properties'.
//
// Schema attendu (voir db/properties.sql):
//   id (uuid), title, location, price (numeric), type, bedrooms (int),
//   bathrooms (int), area (int), status, rating (numeric), reviews (int),
//   amenities (text[]), description, image, images (text[]),
//   owner_name, owner_type, agent_id, featured (bool), verified (bool),
//   posted_at (date), year_built (int), floors (int), owner_id (uuid)
import { supabase, isSupabaseConfigured } from './supabase';
import { propertiesSeed } from '../data/mockData';

const TABLE = 'properties';

// --- mappers DB <-> app ---
function fromRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    location: r.location,
    price: Number(r.price) || 0,
    type: r.type,
    bedrooms: r.bedrooms ?? 0,
    bathrooms: r.bathrooms ?? 0,
    area: r.area ?? 0,
    status: r.status,
    rating: Number(r.rating) || 0,
    reviews: r.reviews ?? 0,
    amenities: r.amenities || [],
    description: r.description || '',
    image: r.image || (Array.isArray(r.images) ? r.images[0] : ''),
    images: r.images || [],
    ownerName: r.owner_name || '',
    ownerType: r.owner_type || '',
    agentId: r.agent_id || null,
    ownerId: r.owner_id || null,
    featured: !!r.featured,
    verified: !!r.verified,
    postedAt: r.posted_at || null,
    yearBuilt: r.year_built || null,
    floors: r.floors ?? 0,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    paymentStatus: r.payment_status || 'unpaid',
    publishedAt: r.published_at || null,
  };
}

function toRow(p) {
  return {
    title: p.title,
    location: p.location,
    price: p.price,
    type: p.type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    status: p.status,
    rating: p.rating ?? 0,
    reviews: p.reviews ?? 0,
    amenities: p.amenities || [],
    description: p.description || '',
    image: p.image || (p.images && p.images[0]) || '',
    images: p.images || [],
    owner_name: p.ownerName || '',
    owner_type: p.ownerType || '',
    agent_id: p.agentId || null,
    owner_id: p.ownerId || null,
    featured: !!p.featured,
    verified: !!p.verified,
    posted_at: p.postedAt || new Date().toISOString().slice(0, 10),
    year_built: p.yearBuilt || null,
    floors: p.floors ?? 0,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    payment_status: p.paymentStatus || 'unpaid',
  };
}

// --- API publique ---
// Pagination par defaut: page=0, pageSize=20.
// Filtre public : seules les annonces approuvees PAR la moderation ET payees
// sont visibles. Les annonces creees mais non payees restent invisibles.
export async function listProperties({ page = 0, pageSize = 20 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: propertiesSeed, mock: true };
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('moderation_status', 'approved')
    .eq('payment_status', 'paid')
    .order('posted_at', { ascending: false })
    .range(from, to);
  if (error) {
    // Fallback si colonnes pas encore migrees : on filtre uniquement sur payment.
    const r2 = await supabase
      .from(TABLE)
      .select('*')
      .eq('payment_status', 'paid')
      .order('posted_at', { ascending: false })
      .range(from, to);
    if (r2.error) {
      // Dernier recours : tout retourner (DB tres ancienne).
      const r3 = await supabase.from(TABLE).select('*').order('posted_at', { ascending: false }).range(from, to);
      if (r3.error) return { ok: false, error: r3.error.message, data: [] };
      return { ok: true, data: (r3.data || []).map(fromRow), hasMore: (r3.data || []).length === pageSize };
    }
    return { ok: true, data: (r2.data || []).map(fromRow), hasMore: (r2.data || []).length === pageSize };
  }
  return { ok: true, data: (data || []).map(fromRow), hasMore: (data || []).length === pageSize };
}

export async function getProperty(id) {
  if (!isSupabaseConfigured) {
    const found = propertiesSeed.find((p) => p.id === id) || null;
    return { ok: true, data: found, mock: true };
  }
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) return { ok: false, error: error.message, data: null };
  return { ok: true, data: fromRow(data) };
}

export async function createProperty(p) {
  if (!isSupabaseConfigured) {
    const item = { ...p, id: 'mock-' + Date.now(), postedAt: new Date().toISOString().slice(0, 10) };
    return { ok: true, data: item, mock: true };
  }
  const row = toRow(p);
  // Retry jusqu'a 3x sur erreurs reseau transitoires (failed to fetch, timeout, 5xx).
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
      if (!error) return { ok: true, data: fromRow(data) };
      lastErr = error;
      const msg = String(error.message || '').toLowerCase();
      // Erreurs metiers : pas la peine de retry, on traduit
      if (msg.includes('annonce similaire') || msg.includes('p0002')) {
        return { ok: false, error: "Une annonce avec exactement le meme titre, lieu et prix existe deja sur la plateforme. Change un detail (titre plus precis, prix legerement different) puis reessaie.", code: 'DUPLICATE' };
      }
      if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('permission denied')) {
        return { ok: false, error: "Ton compte n'a pas l'autorisation de publier. Reconnecte-toi puis reessaie, ou contacte le support.", code: 'RLS' };
      }
      // Erreurs reseau : on retry
      if (!msg.includes('failed to fetch') && !msg.includes('network') && !msg.includes('timeout')) break;
    } catch (e) {
      lastErr = e;
    }
    // Backoff exponentiel: 600ms, 1200ms
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  const finalMsg = String(lastErr?.message || lastErr || 'Erreur inconnue').toLowerCase();
  if (finalMsg.includes('failed to fetch') || finalMsg.includes('network')) {
    return { ok: false, error: "Connexion instable. Verifie ta connexion Internet et reessaie. Tes infos sont sauvegardees, tu peux republier sans tout retaper.", code: 'NETWORK' };
  }
  return { ok: false, error: lastErr?.message || 'Erreur inconnue', data: null };
}

export async function updateProperty(id, patch) {
  if (!isSupabaseConfigured) return { ok: true, data: { id, ...patch }, mock: true };
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message, data: null };
  return { ok: true, data: fromRow(data) };
}

export async function deleteProperty(id) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Recherche cote serveur (texte + filtres simples).
export async function searchProperties({ query = '', type, status, minPrice, maxPrice, bedrooms, bathrooms } = {}) {
  if (!isSupabaseConfigured) {
    let list = propertiesSeed;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.title + ' ' + p.location).toLowerCase().includes(q));
    if (type && type !== 'Tous') list = list.filter((p) => p.type === type);
    if (status && status !== 'Tous') list = list.filter((p) => p.status === status);
    if (minPrice) list = list.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    if (bedrooms) list = list.filter((p) => p.bedrooms >= Number(bedrooms));
    if (bathrooms) list = list.filter((p) => p.bathrooms >= Number(bathrooms));
    return { ok: true, data: list, mock: true };
  }
  let q = supabase.from(TABLE).select('*').order('posted_at', { ascending: false });
  if (query) q = q.or(`title.ilike.%${query}%,location.ilike.%${query}%`);
  if (type && type !== 'Tous') q = q.eq('type', type);
  if (status && status !== 'Tous') q = q.eq('status', status);
  if (minPrice) q = q.gte('price', Number(minPrice));
  if (maxPrice) q = q.lte('price', Number(maxPrice));
  if (bedrooms) q = q.gte('bedrooms', Number(bedrooms));
  if (bathrooms) q = q.gte('bathrooms', Number(bathrooms));
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, data: [] };
  return { ok: true, data: (data || []).map(fromRow) };
}
