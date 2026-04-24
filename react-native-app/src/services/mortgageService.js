// Catalogue des produits hypothecaires bancaires en Haiti.
// Taux indicatifs USD/HTG; a ajuster periodiquement ou a charger depuis Supabase.
export const MORTGAGE_PRODUCTS = [
  { id: 'unibank-usd',  bank: 'Unibank',  currency: 'USD', annualRate: 0.085, maxYears: 20, minDownPct: 0.20, name: 'Pret Habitat USD' },
  { id: 'unibank-htg',  bank: 'Unibank',  currency: 'HTG', annualRate: 0.155, maxYears: 15, minDownPct: 0.20, name: 'Pret Habitat HTG' },
  { id: 'sogebank-usd', bank: 'Sogebank', currency: 'USD', annualRate: 0.090, maxYears: 25, minDownPct: 0.25, name: 'Sogimmo USD' },
  { id: 'sogebank-htg', bank: 'Sogebank', currency: 'HTG', annualRate: 0.160, maxYears: 15, minDownPct: 0.25, name: 'Sogimmo HTG' },
  { id: 'capital-usd',  bank: 'Capital Bank', currency: 'USD', annualRate: 0.095, maxYears: 20, minDownPct: 0.20, name: 'Habitat Plus USD' },
  { id: 'bnc-htg',      bank: 'BNC',      currency: 'HTG', annualRate: 0.140, maxYears: 20, minDownPct: 0.15, name: 'Pret Habitat BNC' },
];

// Mensualite d'un pret amortissable.
// principal: montant emprunte; annualRate: taux annuel (ex 0.085); years: duree.
export function monthlyPayment(principal, annualRate, years) {
  if (!principal || !years) return 0;
  if (!annualRate) return principal / (years * 12);
  const r = annualRate / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function totalCost(principal, annualRate, years) {
  return monthlyPayment(principal, annualRate, years) * years * 12;
}

export function totalInterest(principal, annualRate, years) {
  return Math.max(0, totalCost(principal, annualRate, years) - principal);
}

// Plan d'amortissement (mois par mois). Limite a 'maxRows' pour eviter
// d'en generer 300 si on n'en a besoin que pour aper(c)u.
export function amortizationSchedule(principal, annualRate, years, maxRows) {
  const r = annualRate / 12;
  const n = years * 12;
  const m = monthlyPayment(principal, annualRate, years);
  const rows = [];
  let balance = principal;
  const limit = maxRows ? Math.min(maxRows, n) : n;
  for (let i = 1; i <= limit; i++) {
    const interest = balance * r;
    const principalPart = m - interest;
    balance = Math.max(0, balance - principalPart);
    rows.push({ index: i, payment: m, interest, principal: principalPart, balance });
  }
  return rows;
}

// Helper: simulation pour un produit donne.
// price: prix du bien; downPayment: apport; productId: id du produit; years: duree.
export function simulate({ price, downPayment, productId, years }) {
  const product = MORTGAGE_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;
  const principal = Math.max(0, Number(price) - Number(downPayment || 0));
  const cappedYears = Math.min(Number(years) || product.maxYears, product.maxYears);
  const m = monthlyPayment(principal, product.annualRate, cappedYears);
  return {
    product,
    principal,
    years: cappedYears,
    monthly: m,
    totalCost: m * cappedYears * 12,
    totalInterest: Math.max(0, m * cappedYears * 12 - principal),
    minDownRequired: Math.round(Number(price) * product.minDownPct),
    downPaymentOk: Number(downPayment || 0) >= Number(price) * product.minDownPct,
  };
}
