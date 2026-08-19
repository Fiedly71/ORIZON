// Service KYC ORIZON.
// - submitKyc({ fullName, docType, docNumber, selfieUri, docFrontUri, docBackUri })
//   uploade les images dans le bucket 'kyc-docs' (prive, voir db/kyc_private_bucket.sql)
//   et insere une demande. Les colonnes selfie_url/doc_front_url/doc_back_url stockent
//   le PATH de stockage (pas une URL publique) : l'affichage passe par une URL signee
//   generee a la demande (voir getKycSignedUrl / adminService.listPendingKyc).
// - getMyKycStatus() / isUserVerified(userId)
//
// Mode mock: stocke localement en memoire.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { uploadImage } from './storageService';

const TABLE = 'kyc_submissions';
const KYC_BUCKET = 'kyc-docs';
const mockStore = { items: [] };

export const KYC_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
export const DOC_TYPES = ['cin', 'passport', 'driver_license'];

export async function submitKyc({ fullName, docType, docNumber, selfieUri, docFrontUri, docBackUri }) {
  const user = useAuthStore.getState().user;
  if (!user?.id) return { ok: false, error: 'Non connecte' };

  // Bucket prive dedie aux documents d'identite (jamais dans property-images,
  // qui est public et donc inadapte a des donnees personnelles sensibles).
  const folder = `kyc/${user.id}`;
  const uploads = await Promise.all([
    selfieUri ? uploadImage(selfieUri, { folder: `${folder}/selfie`, mime: 'image/jpeg', bucket: KYC_BUCKET, isPrivate: true }) : { ok: true, path: null },
    docFrontUri ? uploadImage(docFrontUri, { folder: `${folder}/front`, mime: 'image/jpeg', bucket: KYC_BUCKET, isPrivate: true }) : { ok: true, path: null },
    docBackUri ? uploadImage(docBackUri, { folder: `${folder}/back`, mime: 'image/jpeg', bucket: KYC_BUCKET, isPrivate: true }) : { ok: true, path: null },
  ]);
  for (const u of uploads) if (!u.ok) return { ok: false, error: u.error };

  const row = {
    user_id: user.id,
    full_name: fullName,
    doc_type: docType,
    doc_number: docNumber,
    selfie_url: uploads[0].path,
    doc_front_url: uploads[1].path,
    doc_back_url: uploads[2].path,
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

// Genere une URL signee (temporaire) pour afficher un document KYC prive.
// `pathOrUrl` peut etre soit un path de storage (nouveaux dossiers), soit une
// ancienne URL publique complete (dossiers soumis avant la migration vers le
// bucket prive) - dans ce cas on la retourne telle quelle.
export async function getKycSignedUrl(pathOrUrl, expiresInSec = 3600) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // ancienne URL publique
  if (!isSupabaseConfigured) return pathOrUrl;
  const { data, error } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(pathOrUrl, expiresInSec);
  if (error) return null;
  return data?.signedUrl || null;
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
