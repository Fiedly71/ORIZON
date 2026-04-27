// Service Avis ORIZON. Modere par defaut: status='pending' a la creation,
// 'approved' visible publiquement.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const TABLE = 'reviews';
const mockStore = { items: [] };

function fromRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    agentId: r.agent_id,
    authorId: r.author_id,
    rating: r.rating,
    title: r.title || '',
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function leaveReview({ propertyId, agentId, rating, title, content }) {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'Non connecte' };
  const row = {
    property_id: propertyId || null,
    agent_id: agentId || null,
    author_id: userId,
    rating: Number(rating),
    title: title || '',
    content,
    status: 'approved', // sandbox: auto-approuve (cf. db/reviews.sql)
  };
  if (!isSupabaseConfigured) {
    const item = { id: 'rev-' + Date.now(), ...row, created_at: new Date().toISOString() };
    mockStore.items.unshift(item);
    return { ok: true, data: fromRow(item), mock: true };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromRow(data) };
}

export async function listReviewsForProperty(propertyId) {
  if (!isSupabaseConfigured) {
    const items = mockStore.items.filter((i) => i.property_id === propertyId && i.status !== 'rejected');
    return { ok: true, data: items.map(fromRow), mock: true };
  }
  const { data, error } = await supabase
    .from(TABLE).select('*').eq('property_id', propertyId).eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []).map(fromRow) };
}

export async function deleteReview(id) {
  if (!isSupabaseConfigured) {
    mockStore.items = mockStore.items.filter((i) => i.id !== id);
    return { ok: true, mock: true };
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
