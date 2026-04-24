// Service KYC ORIZON.
// - submitKyc({ fullName, docType, docNumber, selfieUri, docFrontUri, docBackUri })
//   uploade les images dans le bucket 'kyc-docs' (prive) et insere une demande.
// - getMyKycStatus() / isUserVerified(userId)
//
// Mode mock: stocke localement en memoire.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { uploadImage } from './storageService';

const TABLE = 'kyc_submissions';
const mockStore = { items: [] };

export const KYC_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
export const DOC_TYPES = ['cin', 'passport', 'driver_license'];

export async function submitKyc({ fullName, docType, docNumber, selfieUri, docFrontUri, docBackUri }) {
  const user = useAuthStore.getState().user;
  if (!user?.id) return { ok: false, error: 'Non connecte' };

  // Upload des pieces (bucket 'property-images' utilise par defaut, ideal serait 'kyc-docs' prive).
  const folder = `kyc/${user.id}`;
  const uploads = await Promise.all([
    selfieUri ? uploadImage(selfieUri, { folder: `${folder}/selfie`, mime: 'image/jpeg' }) : { ok: true, url: null },
    docFrontUri ? uploadImage(docFrontUri, { folder: `${folder}/front`, mime: 'image/jpeg' }) : { ok: true, url: null },
    docBackUri ? uploadImage(docBackUri, { folder: `${folder}/back`, mime: 'image/jpeg' }) : { ok: true, url: null },
  ]);
  for (const u of uploads) if (!u.ok) return { ok: false, error: u.error };

  const row = {
    user_id: user.id,
    full_name: fullName,
    doc_type: docType,
    doc_number: docNumber,
    selfie_url: uploads[0].url,
    doc_front_url: uploads[1].url,
    doc_back_url: uploads[2].url,
    status: KYC_STATUS.PENDING,
  };

  if (!isSupabaseConfigured) {
    const item = { id: 'kyc-' + Date.now(), ...row, created_at: new Date().toISOString() };
    mockStore.items.unshift(item);
    return { ok: true, data: item, mock: true };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function getMyKycStatus() {
  const user = useAuthStore.getState().user;
  if (!user?.id) return { ok: false, error: 'Non connecte' };
  if (!isSupabaseConfigured) {
    const last = mockStore.items.find((i) => i.user_id === user.id);
    return { ok: true, data: last || null, mock: true };
  }
  const { data, error } = await supabase
    .from(TABLE).select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data || null };
}

export async function isUserVerified(userId) {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase.from('profiles').select('verified').eq('id', userId).maybeSingle();
  return !!data?.verified;
}
