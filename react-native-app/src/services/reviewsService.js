// Service Avis ORIZON. Modere par defaut: status='pending' a la creation,
// 'approved' visible publiquement.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { moderateText } from './moderationService';

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

export async function leaveReview({ propertyId, agentId, targetUserId, rating, title, comment, content }) {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'Non connecte' };
  if (userId === (targetUserId || agentId)) return { ok: false, error: 'Impossible d\'evaluer soi-meme' };

  // Pre-moderation cote client (defense en profondeur).
  const text = `${title || ''} ${content || comment || ''}`;
  const mod = moderateText(text);
  const initialStatus = mod.ok ? 'pending' : 'flagged';

  const row = {
    property_id: propertyId || null,
    agent_id: agentId || targetUserId || null,
    author_id: userId,
    rating: Number(rating),
    title: title || '',
    content: comment || content || '',
    status: initialStatus, // moderation manuelle (trigger SQL flag aussi)
  };
  if (!isSupabaseConfigured) {
    const item = { id: 'rev-' + Date.now(), ...row, created_at: new Date().toISOString() };
    mockStore.items.unshift(item);
    return { ok: true, data: fromRow(item), mock: true, moderated: !mod.ok, reason: mod.reason };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromRow(data), moderated: !mod.ok, reason: mod.reason };
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

export async function getUserReviews(userId) {
  if (!userId) return { ok: false, error: 'UserId requis' };
  if (!isSupabaseConfigured) {
    const items = mockStore.items.filter((i) => i.agent_id === userId && i.status === 'approved');
    return {
      ok: true,
      data: items.map((i) => ({
        ...fromRow(i),
        reviewer: { id: i.author_id, fullName: 'Utilisateur', avatarUrl: null },
      })),
      mock: true,
    };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      id,
      rating,
      content,
      created_at,
      author_id,
      users!reviews_author_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('agent_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  const reviews = (data || []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.content,
    created_at: r.created_at,
    reviewer: {
      id: r.author_id,
      fullName: r.users?.full_name || 'Anonyme',
      avatarUrl: r.users?.avatar_url || null,
    },
  }));
  return { ok: true, data: reviews };
}

export async function getUserAverageRating(userId) {
  if (!userId) return { ok: false, error: 'UserId requis' };
  if (!isSupabaseConfigured) {
    const items = mockStore.items.filter((i) => i.agent_id === userId && i.status === 'approved');
    const avg = items.length > 0 ? items.reduce((s, i) => s + i.rating, 0) / items.length : 0;
    return { ok: true, data: { avg: Math.round(avg * 10) / 10, count: items.length }, mock: true };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select('rating')
    .eq('agent_id', userId)
    .eq('status', 'approved');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: true, data: { avg: 0, count: 0 } };
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  return { ok: true, data: { avg: Math.round(avg * 10) / 10, count: data.length } };
}
