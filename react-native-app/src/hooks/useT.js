import { useMemo } from 'react';
import { translations } from '../i18n/translations';
import { useUI } from '../store/useUI';

// Hook de traduction. Retourne un Proxy qui:
//  - cherche d'abord dans la langue active,
//  - sinon retombe sur fr,
//  - sinon retombe sur la cle elle-meme (utile en dev).
export function useT() {
  const language = useUI((s) => s.language);
  return useMemo(() => {
    const primary = translations[language] || translations.fr;
    const fallback = translations.fr;
    return new Proxy(primary, {
      get(target, key) {
        if (key in target) return target[key];
        if (key in fallback) return fallback[key];
        return typeof key === 'string' ? key : undefined;
      },
    });
  }, [language]);
}

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Francais' },
  { code: 'ht', label: 'Kreyol' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
];
