// Formattage prix + suffixe de p\u00e9riode tarifaire.
// Utilise partout : PropertyCard, PropertyDetail, ExploreSection, etc.

const SUFFIX_BY_PERIOD = {
  total: '',
  per_night: '/ nuit',
  per_day: '/ jour',
  per_month: '/ mois',
  per_year: '/ an',
};

// Fallback : si l'annonce n'a pas de pricePeriod (ancienne DB), on d\u00e9duit
// depuis le statut (location => /mois, vente => vide).
function inferPeriod(status) {
  const s = String(status || '').toLowerCase();
  if (/louer|lwe|rent/.test(s)) return 'per_month';
  return 'total';
}

export function priceSuffix(item) {
  if (!item) return '';
  const p = item.pricePeriod || inferPeriod(item.status);
  return SUFFIX_BY_PERIOD[p] || '';
}

export function formatPrice(item, currency = 'HTG') {
  if (!item) return '';
  const n = Number(item.price) || 0;
  const suffix = priceSuffix(item);
  const num = n.toLocaleString('fr-FR');
  return suffix ? `${num} ${currency} ${suffix}` : `${num} ${currency}`;
}

export function formatPriceUsd(item) {
  if (!item) return '';
  const n = Number(item.price) || 0;
  const suffix = priceSuffix(item);
  const num = n.toLocaleString('en-US');
  return suffix ? `$${num} ${suffix}` : `$${num}`;
}
