// adminService - Outils moderation et detection role admin.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

export async function isAdmin() {
  const uid = useAuthStore.getState().user?.id;
  if (!uid || !isSupabaseConfigured) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
  return data?.role === 'admin';
}

export async function listPendingProperties({ status = 'pending', limit = 50 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [], mock: true };
  const { data, error } = await supabase
    .from('properties').select('*')
    .eq('moderation_status', status)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function moderateProperty(id, action, reason = null) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error } = await supabase.rpc('moderate_property', {
    p_id: id, p_action: action, p_reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listReports({ limit = 50 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [], mock: true };
  const { data, error } = await supabase
    .from('reports').select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}
