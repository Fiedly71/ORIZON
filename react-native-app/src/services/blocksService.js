// Service de blocage d'utilisateurs (Apple guideline 1.2 UGC).
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { track, EVT } from './analyticsService';

const TABLE = 'user_blocks';
const mock = { items: new Set() };

export async function blockUser(targetUserId, reason) {
  const me = useAuthStore.getState().user?.id;
  if (!me) return { ok: false, error: 'Non connecte' };
  if (me === targetUserId) return { ok: false, error: 'Impossible de te bloquer toi-meme' };
  try { track(EVT.report || 'block_user', { targetUserId, reason }); } catch {}
  if (!isSupabaseConfigured) {
    mock.items.add(targetUserId);
    return { ok: true, mock: true };
  }
  const { error } = await supabase.from(TABLE).insert({
    blocker_id: me, blocked_id: targetUserId, reason: reason || null,
  });
  if (error && !String(error.message).includes('duplicate')) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unblockUser(targetUserId) {
  const me = useAuthStore.getState().user?.id;
  if (!me) return { ok: false, error: 'Non connecte' };
  if (!isSupabaseConfigured) {
    mock.items.delete(targetUserId);
    return { ok: true, mock: true };
  }
  const { error } = await supabase.from(TABLE).delete()
    .eq('blocker_id', me).eq('blocked_id', targetUserId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listBlocked() {
  const me = useAuthStore.getState().user?.id;
  if (!me) return { ok: true, data: [] };
  if (!isSupabaseConfigured) return { ok: true, data: Array.from(mock.items), mock: true };
  const { data, error } = await supabase.from(TABLE).select('blocked_id, reason, created_at')
    .eq('blocker_id', me);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function isBlocked(targetUserId) {
  const me = useAuthStore.getState().user?.id;
  if (!me) return false;
  if (!isSupabaseConfigured) return mock.items.has(targetUserId);
  const { data } = await supabase.from(TABLE).select('blocked_id')
    .eq('blocker_id', me).eq('blocked_id', targetUserId).maybeSingle();
  return !!data;
}
