// ORIZON - Service de moderation cote client.
// Premier rempart: filtre mots interdits + score basique.
// Le serveur re-applique via trigger SQL pour les reviews.

const BANNED = [
  'arnaque', 'escroquerie', 'voleur', 'fraude',
  'insulte', 'connard', 'salope', 'pute',
  'scam', 'fraud', 'thief',
];

const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Renvoie { ok, reason? }. ok=false si le texte doit etre bloque ou flagge.
export function moderateText(text) {
  if (!text) return { ok: true };
  const lower = String(text).toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
      return { ok: false, reason: `mot_interdit:${w}` };
    }
  }
  // Trop court / spam.
  if (lower.trim().length < 3) return { ok: false, reason: 'trop_court' };
  // Trop de liens / contacts -> a moderer.
  const phones = (lower.match(PHONE_RE) || []).length;
  const emails = (lower.match(EMAIL_RE) || []).length;
  if (phones > 1 || emails > 1) return { ok: false, reason: 'contacts_externes' };
  return { ok: true };
}

// Sanitize visuel pour l'affichage (echappe simplement le HTML basique).
export function sanitize(text) {
  return String(text || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Soumission photo a la queue admin (table photo_moderation).
// Cote client: on push apres upload pour declencher la review humaine.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

export async function submitPhotoForReview({ propertyId, url }) {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'non_authentifie' };
  const { error } = await supabase.from('photo_moderation').insert({
    property_id: propertyId || null,
    url,
    user_id: userId,
    status: 'pending',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
