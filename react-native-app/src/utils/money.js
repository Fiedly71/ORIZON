// Conversion et formatage prix USD <-> HTG.
// Taux par defaut. A terme: a alimenter via priceHistoryService / API BRH.
export const USD_TO_HTG = 132;

export function convertPrice(amountUsd, currency = 'USD') {
  const n = Number(amountUsd) || 0;
  if (currency === 'HTG') return Math.round(n * USD_TO_HTG);
  return n;
}

export function formatPrice(amountUsd, currency = 'USD', { compact = false } = {}) {
  const value = convertPrice(amountUsd, currency);
  const symbol = currency === 'HTG' ? 'HTG' : '$';
  if (compact && value >= 1000) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${symbol}`;
    return `${Math.round(value / 1000)}k ${symbol}`;
  }
  return `${value.toLocaleString('fr-FR')} ${symbol}`;
}
