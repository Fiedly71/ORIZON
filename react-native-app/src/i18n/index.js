// Detection automatique de la langue de l'appareil au premier lancement.
// Si l'utilisateur change manuellement, son choix est conserve dans useUI.
import { getLocales } from 'expo-localization';
import { useUI } from '../store/useUI';

const SUPPORTED = ['fr', 'ht', 'en', 'es'];

export function detectAndApplyLanguage() {
  try {
    const state = useUI.getState();
    if (state.languageManuallySet) return state.language;
    const locales = getLocales?.() || [];
    const code = (locales[0]?.languageCode || 'fr').toLowerCase();
    const lang = SUPPORTED.includes(code) ? code : 'fr';
    state.setLanguage?.(lang, { manual: false });
    return lang;
  } catch {
    return 'fr';
  }
}
