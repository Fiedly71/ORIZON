// Helpers d'accessibilite ORIZON.
// - Touch targets >= 44x44 (Apple/Google guidelines).
// - Labels semantiques pour lecteurs d'ecran (VoiceOver/TalkBack).
// - Tailles de police qui suivent l'echelle systeme (PixelRatio.getFontScale).
import { PixelRatio, Platform } from 'react-native';

export const MIN_TOUCH = 44;

// Taille de police mise a l'echelle (capee pour eviter overflow).
export function fs(size, { max = 1.3 } = {}) {
  const scale = Math.min(PixelRatio.getFontScale(), max);
  return Math.round(size * scale);
}

// Helper pour generer les props a11y standard (label + role + hint).
export function a11y(label, { role = 'button', hint, state } = {}) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: role,
    accessibilityHint: hint,
    accessibilityState: state,
  };
}

// Hit slop minimum pour atteindre 44x44 sur petits boutons.
export function hitSlopFor(currentSize = 32) {
  const pad = Math.max(0, Math.ceil((MIN_TOUCH - currentSize) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
}

// Couleurs WCAG AA: contraste min 4.5:1 pour texte normal.
// Cette fonction renvoie noir ou blanc selon la luminance d'un fond.
export function readableTextOn(bgHex) {
  const h = bgHex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0F172A' : '#FFFFFF';
}

export const A11Y_PLATFORM = Platform.OS;
