import { create } from 'zustand';

// Slice favoris (ids des biens favoris du user)
export const useFavorites = create((set, get) => ({
  ids: [],
  toggle: (id) =>
    set((state) => ({
      ids: state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [...state.ids, id],
    })),
  remove: (id) => set((state) => ({ ids: state.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
  has: (id) => get().ids.includes(id),
}));
