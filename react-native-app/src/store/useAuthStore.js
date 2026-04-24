import { create } from 'zustand';

// Slice auth: gere user, session token, etat de connexion.
// Pour l'instant, c'est local (mock). Le Patch 4 brancha Supabase ici.
export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  loading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ user: null, session: null, isAuthenticated: false }),
}));
