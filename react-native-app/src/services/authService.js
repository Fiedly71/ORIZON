// Service d'authentification ORIZON.
// Fonctionne en deux modes:
// - Mode reel: si .env contient EXPO_PUBLIC_SUPABASE_URL/ANON_KEY -> Supabase auth.
// - Mode mock: sinon, un faux user est cree localement (pour developper sans Supabase).
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const ROLES = ['Acheteur / Locataire', 'Proprietaire', 'Agence'];
const PUBLISHER_ROLES = ['Proprietaire', 'Agence'];

export function canPublish(role) {
  return PUBLISHER_ROLES.includes(role);
}

// --- helpers internes ---
function setSessionFromSupabase(data) {
  const { setUser, setSession } = useAuthStore.getState();
  setSession(data?.session ?? null);
  const u = data?.user ?? data?.session?.user ?? null;
  if (u) {
    setUser({
      id: u.id,
      email: u.email,
      emailConfirmedAt: u.email_confirmed_at || null,
      fullName: u.user_metadata?.fullName || u.email,
      phone: u.user_metadata?.phone || '',
      role: u.user_metadata?.role || ROLES[0],
      avatarUrl: u.user_metadata?.avatarUrl || null,
      // Champs profil enrichis (rechargés via hydrateProfile())
      agencyName: null,
      address: null,
      bio: null,
      verified: false,
      canPublish: false,
    });
    // Hydrate la table profiles en arriere-plan (pas bloquant).
    hydrateProfile().catch(() => {});
  } else {
    setUser(null);
  }
}

// Charge la ligne public.profiles correspondant au user connecte
// et fusionne dans le store. Cree la ligne si elle n'existe pas.
export async function hydrateProfile() {
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const { user, setUser } = useAuthStore.getState();
  if (!user?.id) return { ok: false, error: 'no user' };
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    // Cree la ligne (au cas ou le trigger handle_new_user n'a pas tourne).
    await supabase.from('profiles').insert({
      id: user.id,
      full_name: user.fullName,
      phone: user.phone,
      role: user.role,
    });
    return { ok: true, created: true };
  }
  setUser({
    ...user,
    fullName: data.full_name || user.fullName,
    phone: data.phone || user.phone,
    role: data.role || user.role,
    avatarUrl: data.avatar_url || user.avatarUrl,
    agencyName: data.agency_name || null,
    address: data.address || null,
    bio: data.bio || null,
    verified: !!data.verified,
    canPublish: !!data.can_publish,
  });
  return { ok: true, data };
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
  const { signOut: clear, user } = useAuthStore.getState();
  if (isSupabaseConfigured && user?.id) {
    try { await supabase.from('push_tokens').delete().eq('user_id', user.id); } catch {}
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
export const PUBLISHER_AUTH_ROLES = PUBLISHER_ROLES;

// --- Reset / change password ---

// Etape 1: envoie un email avec un lien magique de reinitialisation.
// Le lien doit pointer vers un deep link de l'app: orizon://reset-password
// (a configurer dans Supabase > Auth > URL Configuration > Redirect URLs).
export async function requestPasswordReset(email) {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 800));
    return { ok: true, mock: true };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'orizon://reset-password',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Etape 2: change effectivement le mot de passe (utilisateur deja en session
// apres avoir clique sur le lien magique).
export async function updatePassword(newPassword) {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, mock: true };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Renvoie l'email de verification pour l'utilisateur courant.
export async function resendEmailVerification() {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, mock: true };
  }
  const user = useAuthStore.getState().user;
  if (!user?.email) return { ok: false, error: 'Aucun email en session' };
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// --- Mise a jour du profil ---

// patch peut contenir: { fullName, phone, agencyName, address, bio, avatarUrl }
export async function updateProfile(patch) {
  const { user, setUser } = useAuthStore.getState();
  if (!user?.id) return { ok: false, error: 'Non connecte' };

  if (!isSupabaseConfigured) {
    setUser({ ...user, ...patch });
    return { ok: true, mock: true };
  }

  // 1) Met a jour la table profiles.
  const row = {
    full_name: patch.fullName ?? user.fullName,
    phone: patch.phone ?? user.phone,
    agency_name: patch.agencyName ?? user.agencyName ?? null,
    address: patch.address ?? user.address ?? null,
    bio: patch.bio ?? user.bio ?? null,
    avatar_url: patch.avatarUrl ?? user.avatarUrl ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error: pErr } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', user.id);
  if (pErr) return { ok: false, error: pErr.message };

  // 2) Met a jour les metadonnees auth (utile pour rester coherent).
  await supabase.auth.updateUser({
    data: {
      fullName: row.full_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
    },
  });

  // 3) Reflete dans le store local.
  setUser({
    ...user,
    fullName: row.full_name,
    phone: row.phone,
    agencyName: row.agency_name,
    address: row.address,
    bio: row.bio,
    avatarUrl: row.avatar_url,
  });
  return { ok: true };
}
