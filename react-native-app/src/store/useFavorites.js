import { create } from 'zustand';
import * as svc from '../services/favoritesService';

// Slice favoris (ids des biens favoris du user) avec persistance
// Supabase / AsyncStorage via favoritesService.
export const useFavorites = create((set, get) => ({
  ids: [],
  loaded: false,

  load: async () => {
    const r = await svc.listFavorites();
    if (r.ok) set({ ids: r.ids, loaded: true });
    return r;
  },

  toggle: async (id) => {
    const has = get().ids.includes(id);
    // Optimistic UI
    set((state) => ({
      ids: has ? state.ids.filter((x) => x !== id) : [...state.ids, id],
    }));
    const r = await svc.toggleFavorite(id, has);
    if (!r.ok) {
      // rollback
      set((state) => ({
        ids: has ? [...state.ids, id] : state.ids.filter((x) => x !== id),
      }));
    }
    return r;
  },

  remove: async (id) => {
    set((state) => ({ ids: state.ids.filter((x) => x !== id) }));
    return svc.removeFavorite(id);
  },

  clear: () => set({ ids: [], loaded: false }),
  has: (id) => get().ids.includes(id),
}));
