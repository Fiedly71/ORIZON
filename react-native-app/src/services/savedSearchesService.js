// savedSearchesService - CRUD recherches sauvegardees.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

export async function listSavedSearches() {
  const uid = useAuthStore.getState().user?.id;
  if (!uid || !isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('saved_searches').select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function saveSearch({ name, criteria, frequency = 'daily' }) {
  const uid = useAuthStore.getState().user?.id;
  if (!uid) return { ok: false, error: 'Non connecte' };
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { data, error } = await supabase.from('saved_searches').insert({
    user_id: uid, name, criteria, frequency,
  }).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteSavedSearch(id) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countMatches(id) {
  if (!isSupabaseConfigured) return { ok: true, count: 0 };
  const { data, error } = await supabase.rpc('match_saved_search', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: data || 0 };
}
