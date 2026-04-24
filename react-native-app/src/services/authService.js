// Service d'authentification ORIZON.
// Fonctionne en deux modes:
// - Mode reel: si .env contient EXPO_PUBLIC_SUPABASE_URL/ANON_KEY -> Supabase auth.
// - Mode mock: sinon, un faux user est cree localement (pour developper sans Supabase).
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const ROLES = ['Acheteur / Locataire', 'Proprietaire', 'Agence', 'Investisseur'];

// --- helpers internes ---
function setSessionFromSupabase(data) {
  const { setUser, setSession } = useAuthStore.getState();
  setSession(data?.session ?? null);
  const u = data?.user ?? data?.session?.user ?? null;
  if (u) {
    setUser({
      id: u.id,
      email: u.email,
      fullName: u.user_metadata?.fullName || u.email,
      phone: u.user_metadata?.phone || '',
      role: u.user_metadata?.role || ROLES[0],
    });
  } else {
    setUser(null);
  }
}

function mockUser({ email, fullName, phone, role }) {
  return {
    id: 'mock-' + Date.now(),
    email,
    fullName: fullName || email,
    phone: phone || '',
    role: role || ROLES[0],
  };
}

// --- API publique ---
export async function signInWithPassword({ email, password }) {
  const { setLoading, setUser } = useAuthStore.getState();
  setLoading(true);
  try {
    if (!isSupabaseConfigured) {
      // mode mock
      setUser(mockUser({ email, fullName: email }));
      return { ok: true, mock: true };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    setSessionFromSupabase(data);
    return { ok: true };
  } finally {
    setLoading(false);
  }
}

export async function signUp({ email, password, fullName, phone, role }) {
  const { setLoading, setUser } = useAuthStore.getState();
  setLoading(true);
  try {
    if (!isSupabaseConfigured) {
      setUser(mockUser({ email, fullName, phone, role }));
      return { ok: true, mock: true };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { fullName, phone, role } },
    });
    if (error) return { ok: false, error: error.message };
    setSessionFromSupabase(data);
    return { ok: true, needsEmailConfirm: !data.session };
  } finally {
    setLoading(false);
  }
}

export async function signOut() {
  const { signOut: clear } = useAuthStore.getState();
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  clear();
}

// Restaure la session au demarrage (Supabase) ou ne fait rien (mock).
export async function restoreSession() {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  setSessionFromSupabase(data);
  supabase.auth.onAuthStateChange((_event, session) => {
    setSessionFromSupabase({ session });
  });
}

export const AUTH_ROLES = ROLES;
