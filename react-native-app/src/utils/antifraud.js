// Helper anti-fraude cote client (double protection avec triggers SQL)
const PATTERNS = [
  /\+?\d[\d\s\-.()]{6,}\d/,                             // tel
  /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/,  // email
  /(wa\.me|whatsapp|viber|telegram|signal|messenger)/i, // apps
  /(facebook|instagram|tiktok)\.com\/[^\s]+/i,          // social
];

export function detectContactInfo(text) {
  const s = String(text || '');
  for (const p of PATTERNS) {
    if (p.test(s)) return true;
  }
  return false;
}

export function sanitizeMessage(text) {
  if (detectContactInfo(text)) {
    return {
      ok: false,
      error: 'Echange de coordonnées externes interdit. Utilise la messagerie ORIZON pour ta sécurité.',
    };
  }
  return { ok: true, body: String(text || '').trim() };
}
