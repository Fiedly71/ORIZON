// Service de gestion du compte (suppression / export RGPD).
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { signOut } from './authService';
import { track, EVT } from './analyticsService';

// Apple App Store guideline 5.1.1(v) - obligatoire depuis 2022.
// L'utilisateur doit pouvoir supprimer son compte depuis l'app.
export async function deleteMyAccount(reason) {
  const user = useAuthStore.getState().user;
  if (!user?.id) return { ok: false, error: 'Non connecte' };

  if (!isSupabaseConfigured) {
    track(EVT.startPayment, { mock: true });
    await signOut();
    return { ok: true, mock: true };
  }

  // Appelle la RPC qui anonymise + archive
  const { error } = await supabase.rpc('request_account_deletion', { p_reason: reason || null });
  if (error) return { ok: false, error: error.message };

  // Deconnecte localement
  await signOut();
  return { ok: true };
}

// Export RGPD basique (donnees de profil + paiements + visites).
export async function exportMyData() {
  const user = useAuthStore.getState().user;
  if (!user?.id) return { ok: false, error: 'Non connecte' };
  if (!isSupabaseConfigured) {
    return { ok: true, data: { profile: user, mock: true } };
  }
  const [{ data: profile }, { data: payments }, { data: visits }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('payments').select('*').eq('user_id', user.id),
    supabase.from('visits').select('*').eq('user_id', user.id),
  ]);
  return { ok: true, data: { profile, payments, visits, exportedAt: new Date().toISOString() } };
}
