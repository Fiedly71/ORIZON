import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Slice UI transverse (langue, devise, overlay).
// Langue + devise persistees via AsyncStorage.
const PREFS_KEY = 'orizon.prefs.v1';

async function persist(partial) {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {}
}

export const useUI = create((set, get) => ({
  language: 'fr',
  languageManuallySet: false,
  currency: 'USD', // 'USD' | 'HTG'
  theme: 'light', // 'light' | 'dark' | 'system'
  notifPush: true,
  notifEmail: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        set({
          language: p.language || 'fr',
          languageManuallySet: !!p.languageManuallySet,
          currency: p.currency || 'USD',
          theme: p.theme || 'light',
          notifPush: p.notifPush !== false,
          notifEmail: p.notifEmail !== false,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  setLanguage: (language, opts = { manual: true }) => {
    const manual = opts.manual !== false;
    set({ language, languageManuallySet: manual });
    persist({ language, languageManuallySet: manual });
  },

  setCurrency: (currency) => {
    set({ currency });
    persist({ currency });
  },

  setTheme: (theme) => { set({ theme }); persist({ theme }); },
  setNotifPush: (notifPush) => { set({ notifPush }); persist({ notifPush }); },
  setNotifEmail: (notifEmail) => { set({ notifEmail }); persist({ notifEmail }); },

  overlay: { name: null, payload: null },
  openOverlay: (name, payload = null) => set({ overlay: { name, payload } }),
  closeOverlay: () => set({ overlay: { name: null, payload: null } }),

  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),
}));
