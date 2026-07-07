// otpService - Verification telephone via Supabase Auth Phone OTP.
// Setup : Supabase Dashboard > Authentication > Providers > Phone (Twilio/MessageBird).
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

// Normalise un numero haitien : 50937123456 ou 37123456 -> +50937123456
export function normalizeHTPhone(raw) {
  let n = String(raw || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n;
  if (n.startsWith('509')) return '+' + n;
  if (n.length === 8) return '+509' + n;
  return '+' + n;
}

export async function sendPhoneOtp(rawPhone) {
  const phone = normalizeHTPhone(rawPhone);
  if (!/^\+\d{10,15}$/.test(phone)) {
    return { ok: false, error: 'Numéro invalide' };
  }
  if (!isSupabaseConfigured) {
    if (!__DEV__) return { ok: false, error: 'Service indisponible (configuration manquante).' };
    return { ok: true, mock: true, phone, devCode: '123456' };
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { ok: false, error: error.message };
  return { ok: true, phone };
}

export async function verifyPhoneOtp(rawPhone, code) {
  const phone = normalizeHTPhone(rawPhone);
  if (!isSupabaseConfigured) {
    if (!__DEV__) return { ok: false, error: 'Service indisponible (configuration manquante).' };
    if (code === '123456') return { ok: true, mock: true };
    return { ok: false, error: 'Code incorrect (mock: 123456)' };
  }
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (error) return { ok: false, error: error.message };

  // Met a jour le profil avec le tel verifie
  const uid = data?.user?.id || useAuthStore.getState().user?.id;
  if (uid) {
    await supabase.from('profiles')
      .update({ phone, phone_verified: true, phone_verified_at: new Date().toISOString() })
      .eq('id', uid);
  }
  return { ok: true };
}
