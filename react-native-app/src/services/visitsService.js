// Service Visites ORIZON.
// Workflow: requested -> confirmed/declined -> checked_in -> completed
//                                          -> cancelled / no_show
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const TABLE = 'visits';

export const VISIT_STATUS = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// Mock store en memoire si Supabase indisponible.
const mockStore = { items: [] };

function fromRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    visitorId: r.visitor_id,
    ownerId: r.owner_id,
    scheduledAt: r.scheduled_at,
    status: r.status,
    notes: r.notes || '',
    feedbackRate: r.feedback_rate ?? null,
    feedbackText: r.feedback_text || '',
    createdAt: r.created_at,
  };
}

export async function requestVisit({ propertyId, ownerId, scheduledAt, notes }) {
  const visitorId = useAuthStore.getState().user?.id || null;
  const row = {
    property_id: propertyId,
    visitor_id: visitorId,
    owner_id: ownerId || null,
    scheduled_at: scheduledAt,
    notes: notes || '',
    status: VISIT_STATUS.REQUESTED,
  };
  if (!isSupabaseConfigured) {
    const item = { id: 'visit-' + Date.now(), ...row, created_at: new Date().toISOString() };
    mockStore.items.unshift(item);
    return { ok: true, data: fromRow(item), mock: true };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromRow(data) };
}

export async function listMyVisits({ as = 'visitor' } = {}) {
  const uid = useAuthStore.getState().user?.id || null;
  if (!isSupabaseConfigured) {
    const items = mockStore.items.filter((i) => (as === 'owner' ? i.owner_id === uid : i.visitor_id === uid));
    return { ok: true, data: items.map(fromRow), mock: true };
  }
  const col = as === 'owner' ? 'owner_id' : 'visitor_id';
  const { data, error } = await supabase
    .from(TABLE).select('*').eq(col, uid).order('scheduled_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []).map(fromRow) };
}

export async function updateVisitStatus(id, status, extra = {}) {
  const patch = { status, updated_at: new Date().toISOString(), ...extra };
  if (!isSupabaseConfigured) {
    const i = mockStore.items.findIndex((v) => v.id === id);
    if (i >= 0) mockStore.items[i] = { ...mockStore.items[i], ...patch };
    return { ok: true, data: i >= 0 ? fromRow(mockStore.items[i]) : null, mock: true };
  }
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromRow(data) };
}

export const confirmVisit  = (id) => updateVisitStatus(id, VISIT_STATUS.CONFIRMED);
export const declineVisit  = (id) => updateVisitStatus(id, VISIT_STATUS.DECLINED);
export const cancelVisit   = (id) => updateVisitStatus(id, VISIT_STATUS.CANCELLED);
export const checkInVisit  = (id) => updateVisitStatus(id, VISIT_STATUS.CHECKED_IN);
export const completeVisit = (id) => updateVisitStatus(id, VISIT_STATUS.COMPLETED);
export const markNoShow    = (id) => updateVisitStatus(id, VISIT_STATUS.NO_SHOW);

export async function leaveFeedback(id, rate, text) {
  return updateVisitStatus(id, VISIT_STATUS.COMPLETED, {
    feedback_rate: Number(rate) || 0,
    feedback_text: text || '',
  });
}
