// agencyService - CRUD agences + invitations agents.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

export async function getMyAgencies() {
  const uid = useAuthStore.getState().user?.id;
  if (!uid || !isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase.from('agency_members')
    .select('agency_id, role, agencies(*)')
    .eq('user_id', uid)
    .eq('status', 'active');
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []).map((m) => ({ ...m.agencies, _role: m.role })) };
}

export async function createAgency({ name, description, phone, email, address }) {
  const uid = useAuthStore.getState().user?.id;
  if (!uid) return { ok: false, error: 'Non connecte' };
  if (!isSupabaseConfigured) return { ok: true, mock: true, data: { id: 'mock-' + Date.now(), name } };
  const { data, error } = await supabase.from('agencies').insert({
    name, description, phone, email, address, owner_id: uid,
  }).select().single();
  if (error) return { ok: false, error: error.message };
  // Auto-add owner as member
  await supabase.from('agency_members').insert({
    agency_id: data.id, user_id: uid, role: 'owner', status: 'active', joined_at: new Date(),
  });
  return { ok: true, data };
}

export async function listAgents(agencyId) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase.from('agency_members')
    .select('user_id, role, status, invited_email, joined_at, profiles(full_name, avatar_url, email)')
    .eq('agency_id', agencyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function inviteAgent(agencyId, email) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error } = await supabase.rpc('invite_agent', { p_agency_id: agencyId, p_email: email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeAgent(agencyId, userId) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from('agency_members')
    .update({ status: 'removed' })
    .eq('agency_id', agencyId).eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
