// Service de signalement ORIZON.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const TABLE = 'reports';
const mockStore = { items: [] };

export const REPORT_REASONS = [
  { id: 'fake',          label: 'Fausse annonce' },
  { id: 'fraud',         label: 'Tentative de fraude' },
  { id: 'spam',          label: 'Spam ou doublon' },
  { id: 'inappropriate', label: 'Contenu inapproprie' },
  { id: 'other',         label: 'Autre' },
];

export async function reportTarget({ targetType, targetId, reason, details }) {
  const userId = useAuthStore.getState().user?.id || null;
  const row = {
    reporter_id: userId,
    target_type: targetType,
    target_id: String(targetId),
    reason,
    details: details || '',
    status: 'open',
  };
  if (!isSupabaseConfigured) {
    const item = { id: 'rep-' + Date.now(), ...row, created_at: new Date().toISOString() };
    mockStore.items.unshift(item);
    return { ok: true, data: item, mock: true };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function listMyReports() {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, data: [] };
  if (!isSupabaseConfigured) {
    return { ok: true, data: mockStore.items.filter((i) => i.reporter_id === userId), mock: true };
  }
  const { data, error } = await supabase
    .from(TABLE).select('*').eq('reporter_id', userId).order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}
