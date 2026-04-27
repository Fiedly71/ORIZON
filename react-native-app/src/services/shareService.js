// Service de partage ORIZON.
// - shareProperty(prop): tente WhatsApp en priorite, sinon Share natif RN.
// - shareViaSMS(text, phone?): ouvre l'app SMS.
// - copyLink(prop): copie un lien deep-link orizon:// dans le presse-papiers.
import { Share, Linking } from 'react-native';
import { formatPrice } from '../utils/money';

const APP_URL = 'https://orizon.app'; // landing publique (a deployer)
const DEEP_LINK = 'orizon://property';

export function buildPropertyLink(propertyId) {
  return `${APP_URL}/p/${propertyId}`;
}

export function buildPropertyMessage(prop, { language = 'fr', currency = 'USD' } = {}) {
  if (!prop) return '';
  const price = formatPrice(prop.price, currency);
  const link = buildPropertyLink(prop.id);
  const lines = {
    fr: [
      `${prop.title} - ${price}`,
      `${prop.location || ''}`,
      `${prop.bedrooms || 0} ch | ${prop.bathrooms || 0} sdb | ${prop.area || 0} m2`,
      `Voir sur ORIZON: ${link}`,
    ],
    ht: [
      `${prop.title} - ${price}`,
      `${prop.location || ''}`,
      `${prop.bedrooms || 0} chanm | ${prop.bathrooms || 0} twalet | ${prop.area || 0} m2`,
      `Gade sou ORIZON: ${link}`,
    ],
    en: [
      `${prop.title} - ${price}`,
      `${prop.location || ''}`,
      `${prop.bedrooms || 0} bed | ${prop.bathrooms || 0} bath | ${prop.area || 0} sqm`,
      `View on ORIZON: ${link}`,
    ],
    es: [
      `${prop.title} - ${price}`,
      `${prop.location || ''}`,
      `${prop.bedrooms || 0} hab | ${prop.bathrooms || 0} ban | ${prop.area || 0} m2`,
      `Ver en ORIZON: ${link}`,
    ],
  };
  return (lines[language] || lines.fr).filter(Boolean).join('\n');
}

export async function shareViaWhatsApp(message, phone = '') {
  const phoneClean = String(phone || '').replace(/[^0-9]/g, '');
  const url = phoneClean
    ? `whatsapp://send?phone=${phoneClean}&text=${encodeURIComponent(message)}`
    : `whatsapp://send?text=${encodeURIComponent(message)}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) return { ok: false, error: 'WhatsApp non installe' };
  await Linking.openURL(url);
  return { ok: true };
}

export async function shareViaSMS(message, phone = '') {
  const phoneClean = String(phone || '').replace(/[^0-9+]/g, '');
  const sep = /android/i.test(String(globalThis?.navigator?.userAgent || '')) ? '?' : '&';
  const url = phoneClean ? `sms:${phoneClean}${sep}body=${encodeURIComponent(message)}` : `sms:?body=${encodeURIComponent(message)}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) return { ok: false, error: 'SMS non disponible' };
  await Linking.openURL(url);
  return { ok: true };
}

export async function shareNative(message, title = 'ORIZON') {
  try {
    await Share.share({ message, title });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export async function copyLink(prop) {
  const link = buildPropertyLink(prop.id);
  // Sans expo-clipboard, on delegue au Share natif (l'utilisateur peut "Copier").
  try {
    await Share.share({ message: link, title: 'Lien ORIZON' });
    return { ok: true, link };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Fallback intelligent: WhatsApp si dispo, sinon Share natif.
export async function shareProperty(prop, opts = {}) {
  const message = buildPropertyMessage(prop, opts);
  const wa = await shareViaWhatsApp(message, opts.phone);
  if (wa.ok) return wa;
  return shareNative(message);
}
