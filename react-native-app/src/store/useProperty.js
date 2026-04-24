import { create } from 'zustand';
import { propertiesSeed } from '../data/mockData';
import {
  listProperties,
  createProperty as svcCreate,
  updateProperty as svcUpdate,
  deleteProperty as svcDelete,
} from '../services/propertiesService';
import { isSupabaseConfigured } from '../services/supabase';
import { setCache, getCache, CACHE_KEYS } from '../services/cacheService';

const DEFAULT_FILTERS = {
  type: 'Tous',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  bathrooms: '',
  status: 'Tous',
};

// Slice properties: liste, filtres, tri, CRUD.
// - Sans Supabase: propertiesSeed en memoire, mutations locales.
// - Avec Supabase: loadProperties() pull depuis la BD; mutations via service.
export const useProperty = create((set, get) => ({
  properties: propertiesSeed,
  loading: false,
  loaded: false,
  error: null,
  offline: false,

  query: '',
  filters: { ...DEFAULT_FILTERS },
  sortBy: 'recent',

  setQuery: (query) => set({ query }),
  setFilters: (updater) =>
    set((state) => ({ filters: typeof updater === 'function' ? updater(state.filters) : updater })),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  loadProperties: async () => {
    set({ loading: true, error: null });
    const res = await listProperties();
    if (res.ok) {
      set({ properties: res.data, loading: false, loaded: true });
      // Sauvegarde en cache pour le mode offline.
      setCache(CACHE_KEYS.properties, res.data).catch(() => {});
    } else {
      // Fallback offline: reutiliser le dernier cache disponible.
      const cached = await getCache(CACHE_KEYS.properties, { ignoreTtl: true });
      if (cached && Array.isArray(cached) && cached.length) {
        set({ properties: cached, loading: false, loaded: true, error: null, offline: true });
        return { ok: true, data: cached, offline: true };
      }
      set({ loading: false, error: res.error });
    }
    return res;
  },

  hydrateFromCache: async () => {
    const cached = await getCache(CACHE_KEYS.properties, { ignoreTtl: true });
    if (cached && Array.isArray(cached) && cached.length) {
      set({ properties: cached, loaded: true });
    }
  },

  addProperty: async (item) => {
    if (!isSupabaseConfigured) {
      const local = { ...item, id: item.id || 'local-' + Date.now() };
      set((state) => ({ properties: [local, ...state.properties] }));
      return { ok: true, data: local };
    }
    const res = await svcCreate(item);
    if (res.ok && res.data) {
      set((state) => ({ properties: [res.data, ...state.properties] }));
    }
    return res;
  },

  updateProperty: async (id, patch) => {
    if (!isSupabaseConfigured) {
      set((state) => ({
        properties: state.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      return { ok: true };
    }
    const res = await svcUpdate(id, patch);
    if (res.ok && res.data) {
      set((state) => ({
        properties: state.properties.map((p) => (p.id === id ? { ...p, ...res.data } : p)),
      }));
    }
    return res;
  },

  removeProperty: async (id) => {
    if (!isSupabaseConfigured) {
      set((state) => ({ properties: state.properties.filter((p) => p.id !== id) }));
      return { ok: true };
    }
    const res = await svcDelete(id);
    if (res.ok) {
      set((state) => ({ properties: state.properties.filter((p) => p.id !== id) }));
    }
    return res;
  },
}));
