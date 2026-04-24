import { create } from 'zustand';

// Slice UI transverse (langue, theme, overlay)
export const useUI = create((set) => ({
  language: 'fr',
  languageManuallySet: false,
  setLanguage: (language, opts = { manual: true }) =>
    set({ language, languageManuallySet: opts.manual !== false }),

  overlay: { name: null, payload: null },
  openOverlay: (name, payload = null) => set({ overlay: { name, payload } }),
  closeOverlay: () => set({ overlay: { name: null, payload: null } }),

  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),
}));
