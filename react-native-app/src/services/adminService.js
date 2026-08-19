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

    const { data: kycs } = await supabase.from('kyc_submissions').select('status');
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
export async function listUsers({ role = null, limit = 500, from = null, to = null } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  // Essai 1 : avec email + banned + publish_free (apres migrations)
  let q = supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, verified, can_publish, banned, publish_free, current_plan_id, plan_expires_at, verified_badge, whatsapp_link, website, city, department, agency_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (role) q = q.eq('role', role);
  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to);
  let { data, error } = await q;
  if (error) {
    // Fallback 2 : sans publish_free
    let q2 = supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, verified, can_publish, banned, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (role) q2 = q2.eq('role', role);
    const r2 = await q2;
    if (r2.error) {
      // Fallback 3 : colonnes email/banned/publish_free pas encore deployees
      let q3 = supabase
        .from('profiles')
        .select('id, full_name, phone, role, verified, can_publish, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (role) q3 = q3.eq('role', role);
      const r3 = await q3;
      if (r3.error) return { ok: false, error: r3.error.message };
      data = (r3.data || []).map((u) => ({ ...u, email: '', banned: false, publish_free: false }));
    } else {
      data = (r2.data || []).map((u) => ({ ...u, publish_free: false }));
    }
  }
  return { ok: true, data: data || [] };
}

export async function setUserBanned(userId, banned) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', userId);
  if (error) return { ok: false, error: 'Migration manquante : execute db/admin_user_columns.sql' };
  return { ok: true };
}

// Active/desactive le droit de publier sans payer (exemption MonCash)
export async function setUserPublishFree(userId, free) {
  if (!isSupabaseConfigured) return { ok: true };
  const patch = { publish_free: !!free };
  if (free) { patch.verified = true; patch.can_publish = true; }
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return { ok: false, error: 'Migration manquante : execute db/free_publishers.sql' };
  return { ok: true };
}

// ============================================
// PROPERTIES
// ============================================
export async function listProperties({ filter = 'all', limit = 500, from = null, to = null } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('properties')
    .select('*, owner:profiles!properties_owner_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter === 'pending') q = q.eq('moderation_status', 'pending');
  if (filter === 'rejected') q = q.eq('moderation_status', 'rejected');
  if (filter === 'live') q = q.eq('payment_status', 'paid').neq('moderation_status', 'rejected');
  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to);
  const { data, error } = await q;
  if (error) {
    // Fallback sans jointure (au cas ou la contrainte FK ne porte pas le nom attendu)
    const r2 = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (r2.error) return { ok: false, error: r2.error.message };
    return { ok: true, data: (r2.data || []).map(normalizeProperty) };
  }
  return { ok: true, data: (data || []).map(normalizeProperty) };
}

function normalizeProperty(r) {
  const images = Array.isArray(r.images) ? r.images.filter(Boolean) : [];
  const image = r.image || images[0] || null;
  return {
    ...r,
    image,
    images,
    owner_name: r.owner?.full_name || r.owner_name || null,
    owner_phone: r.owner?.phone || null,
  };
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
// On ne montre que les annonces approuvees ou en attente, pas les rejetees.
// ============================================
export async function listPhotosForReview({ limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, owner_id, image, images, created_at, moderation_status')
    .eq('payment_status', 'paid')
    .neq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

// ============================================
// KYC AGENCES
// ============================================
// Liste les dossiers KYC (par défaut : ceux en attente) et hydrate chaque
// dossier avec les infos du profil (nom, email, rôle, agence) + les URLs
// signed pour visualiser les documents (selfie, recto, verso).
export async function listPendingKyc({ status = 'pending', limit = 100, from = null, to = null } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('kyc_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && status !== 'all') q = q.eq('status', status);
  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  const rows = data || [];
  // Hydrate le profil (une seule requête).
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
  let profById = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, agency_name, address, city, department, avatar_url')
      .in('id', userIds);
    profById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }
  // Les documents sont stockes dans le bucket prive 'kyc-docs' : on resout
  // des URLs signees temporaires pour l'affichage admin (les colonnes
  // *_url contiennent un path de storage, pas une URL publique).
  const { getKycSignedUrl } = require('./kycService');
  const enriched = await Promise.all(rows.map(async (r) => ({
    ...r,
    profile: profById[r.user_id] || null,
    selfie_url: await getKycSignedUrl(r.selfie_url),
    doc_front_url: await getKycSignedUrl(r.doc_front_url),
    doc_back_url: await getKycSignedUrl(r.doc_back_url),
  })));
  return { ok: true, data: enriched };
}

export async function decideKyc(kycId, userId, action, reason = null) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error: e1 } = await supabase
    .from('kyc_submissions')
    .update({ status: action, reason, reviewed_at: new Date().toISOString() })
    .eq('id', kycId);
  if (e1) return { ok: false, error: e1.message };

  if (action === 'approved') {
    await supabase.from('profiles').update({ verified: true, can_publish: true }).eq('id', userId);
  } else if (action === 'rejected') {
    await supabase.from('profiles').update({ verified: false }).eq('id', userId);
  }
  return { ok: true };
}

// ============================================
// REVENUS
// ============================================
export async function listPayments({ filter = 'all', limit = 500, from = null, to = null } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter === 'pending') q = q.eq('status', 'pending');
  if (filter === 'succeeded') q = q.eq('status', 'succeeded');
  if (filter === 'failed') q = q.eq('status', 'failed');
  if (filter === 'refunded') q = q.eq('refunded', true);
  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  const payments = data || [];
  // Enrichir avec proprio (via user_id) + titre annonce (via property_id) en
  // batch pour eviter N+1.
  const userIds = Array.from(new Set(payments.map((p) => p.user_id).filter(Boolean)));
  const propIds = Array.from(new Set(payments.map((p) => p.property_id).filter(Boolean)));
  const [profilesRes, propsRes] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id,full_name,phone').in('id', userIds)
      : Promise.resolve({ data: [] }),
    propIds.length
      ? supabase.from('properties').select('id,title,image,images').in('id', propIds)
      : Promise.resolve({ data: [] }),
  ]);
  const profById = Object.fromEntries((profilesRes.data || []).map((p) => [p.id, p]));
  const propById = Object.fromEntries((propsRes.data || []).map((p) => [p.id, p]));
  const enriched = payments.map((p) => {
    const prof = profById[p.user_id] || {};
    const prop = propById[p.property_id] || {};
    return {
      ...p,
      payer_name: prof.full_name || null,
      payer_phone: prof.phone || null,
      property_title: prop.title || null,
      property_image: prop.image || (Array.isArray(prop.images) ? prop.images[0] : null),
    };
  });
  return { ok: true, data: enriched };
}

// Approuve un paiement MonCash manuel (active la propriete liee)
export async function approveMonCashPayment(paymentId) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.rpc('approve_payment', { p_payment_id: paymentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Rejette un paiement MonCash manuel (avec raison)
export async function rejectMonCashPayment(paymentId, reason) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.rpc('reject_payment', {
    p_payment_id: paymentId,
    p_reason: reason || 'Référence introuvable',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
export async function listReports({ limit = 500, from = null, to = null, status = null } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || [] };
}

// ============================================
// EXPORT CSV (utilisé par tous les onglets admin)
// ============================================
// Convertit un tableau de rows en CSV (RFC 4180 : virgule + quotes doublees).
// Colonnes : première row échantillonée (ou columns explicite).
export function toCsv(rows, columns = null) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const cols = columns || Array.from(
    rows.reduce((set, r) => { Object.keys(r || {}).forEach((k) => set.add(k)); return set; }, new Set())
  );
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') v = JSON.stringify(v);
    const s = String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

// Déclenche le téléchargement d'un CSV (uniquement sur web).
// Sur mobile natif, on peut réutiliser Sharing/RN-Share plus tard.
export function downloadCsv(filename, csv) {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
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
// ALERTES ADMIN (voir db/admin_alerts.sql)
// - many_reports        : 10+ signalements sur une même annonce
// - many_reports_user   : 10+ signalements sur un même utilisateur
// - many_low_reviews    : 10+ avis <= 2 étoiles sur une même annonce
// ============================================
export async function listAdminAlerts({ resolved = false, limit = 100 } = {}) {
  if (!isSupabaseConfigured) return { ok: true, data: [] };
  let q = supabase
    .from('admin_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (resolved === false) q = q.is('resolved_at', null);
  if (resolved === true)  q = q.not('resolved_at', 'is', null);
  const { data, error } = await q;
  if (error) {
    // Table pas encore migrée → tableau vide (soft-fail).
    return { ok: true, data: [], missingMigration: true };
  }
  return { ok: true, data: data || [] };
}

export async function resolveAdminAlert(alertId, notes = null) {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.rpc('resolve_admin_alert', {
    p_alert_id: alertId,
    p_notes: notes,
  });
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
