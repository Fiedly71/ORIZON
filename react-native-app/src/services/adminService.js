// adminService - Outils moderation admin etendu : stats, revenus, KYC agences, photos.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

export async function isAdmin() {
  const uid = useAuthStore.getState().user?.id;
  if (!uid || !isSupabaseConfigured) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
  return data?.role === 'admin';
}

// ============================================
// DASHBOARD - Statistiques globales
// ============================================
export async function getDashboardStats() {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      data: {
        users: { total: 0, buyers: 0, owners: 0, agencies: 0, admins: 0, newToday: 0 },
        properties: { total: 0, active: 0, sold: 0, pending: 0, rejected: 0, newToday: 0 },
        revenue: { total: 0, thisMonth: 0, today: 0, refunded: 0 },
        kyc: { pending: 0, approved: 0, rejected: 0 },
        reports: { open: 0, resolved: 0 },
      },
      mock: true,
    };
  }

  try {
    const { data: profiles } = await supabase.from('profiles').select('role, created_at');
    const users = {
      total: profiles?.length || 0,
      buyers: profiles?.filter((p) => /acheteur|locataire/i.test(p.role || '')).length || 0,
      owners: profiles?.filter((p) => /proprietaire/i.test(p.role || '')).length || 0,
      agencies: profiles?.filter((p) => /agence/i.test(p.role || '')).length || 0,
      admins: profiles?.filter((p) => p.role === 'admin').length || 0,
      newToday: profiles?.filter((p) => isToday(p.created_at)).length || 0,
    };

    const { data: props } = await supabase
      .from('properties')
      .select('status, moderation_status, payment_status, created_at, price');
    const properties = {
      total: props?.length || 0,
      active: props?.filter((p) => p.payment_status === 'paid' && p.moderation_status !== 'rejected').length || 0,
      sold: props?.filter((p) => /sold|vendu/i.test(p.status || '')).length || 0,
      pending: props?.filter((p) => p.moderation_status === 'pending').length || 0,
      rejected: props?.filter((p) => p.moderation_status === 'rejected').length || 0,
      newToday: props?.filter((p) => isToday(p.created_at)).length || 0,
    };

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status, created_at, refunded');
    const revenue = {
      total: sum(payments?.filter((p) => p.status === 'succeeded').map((p) => p.amount)),
      thisMonth: sum(payments?.filter((p) => p.status === 'succeeded' && isThisMonth(p.created_at)).map((p) => p.amount)),
      today: sum(payments?.filter((p) => p.status === 'succeeded' && isToday(p.created_at)).map((p) => p.amount)),
      refunded: sum(payments?.filter((p) => p.refunded).map((p) => p.amount)),
    };

    const { data: kycs } = await supabase.from('kyc_documents').select('status');
    const kyc = {
      pending: kycs?.filter((k) => k.status === 'pending').length || 0,
      approved: kycs?.filter((k) => k.status === 'approved').length || 0,
      rejected: kycs?.filter((k) => k.status === 'rejected').length || 0,
    };

    const { data: reports } = await supabase.from('reports').select('status');
    const reportStats = {
      open: reports?.filter((r) => r.status !== 'resolved').length || 0,
      resolved: reports?.filter((r) => r.status === 'resolved').length || 0,
    };

    return { ok: true, data: { users, properties, revenue, kyc, reports: reportStats } };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ============================================
// USERS
// ============================================
export async function listUsers({ role = null, limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, verified, can_publish, banned, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (role) q = q.eq('role', role);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function setUserBanned(userId, banned) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// PROPERTIES
// ============================================
export async function listProperties({ filter = 'all', limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter === 'pending') q = q.eq('moderation_status', 'pending');
  if (filter === 'rejected') q = q.eq('moderation_status', 'rejected');
  if (filter === 'live') q = q.eq('payment_status', 'paid').neq('moderation_status', 'rejected');
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function listPendingProperties({ status = 'pending', limit = 50 } = {}) {
  return listProperties({ filter: status, limit });
}

export async function moderateProperty(id, action, reason = null) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { error: rpcErr } = await supabase.rpc('moderate_property', {
    p_id: id, p_action: action, p_reason: reason,
  });
  if (rpcErr) {
    const { error } = await supabase
      .from('properties')
      .update({ moderation_status: action, moderation_reason: reason })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ============================================
// PHOTOS - reject only (annonces deja live apres paiement)
// ============================================
export async function listPhotosForReview({ limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, owner_id, image, images, created_at, moderation_status')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

// ============================================
// KYC AGENCES
// ============================================
export async function listPendingKyc({ limit = 50 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function decideKyc(kycId, userId, action, reason = null) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error: e1 } = await supabase
    .from('kyc_documents')
    .update({ status: action, reason, reviewed_at: new Date().toISOString() })
    .eq('id', kycId);
  if (e1) return { ok: false, error: e1.message };

  if (action === 'approved') {
    await supabase.from('profiles').update({ verified: true, can_publish: true }).eq('id', userId);
  } else if (action === 'rejected') {
    // L'utilisateur peut re-soumettre apres rejet
    await supabase.from('profiles').update({ verified: false }).eq('id', userId);
  }
  return { ok: true };
}

// ============================================
// REVENUS
// ============================================
export async function listPayments({ filter = 'all', limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter === 'succeeded') q = q.eq('status', 'succeeded');
  if (filter === 'failed') q = q.eq('status', 'failed');
  if (filter === 'refunded') q = q.eq('refunded', true);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function refundPayment(paymentId, reason = '') {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase
    .from('payments')
    .update({ refunded: true, refund_reason: reason, refunded_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// REPORTS
// ============================================
export async function listReports({ limit = 50 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

export async function resolveReport(reportId) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase
    .from('reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// HELPERS
// ============================================
function sum(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function isToday(d) {
  if (!d) return false;
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear()
    && dt.getMonth() === now.getMonth()
    && dt.getDate() === now.getDate();
}

function isThisMonth(d) {
  if (!d) return false;
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
}
