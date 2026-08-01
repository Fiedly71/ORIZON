// Catalogue des plans de publication ORIZON.
// Pendant la promo de lancement (isLaunchFreeActive), tous les plans sont
// affichés à titre informatif, mais aucun paiement n'est requis.
// À la fin de la promo, Stripe / MonCash prod seront branchés côté paiement.
//
// Règles produit :
//   - 3 plans standards : mensuel, trimestriel (3 mois), annuel (12 mois)
//   - Badge "Vérifié" achetable à part pour 5 USD/an
//   - Le plan ANNUEL inclut la badge vérifiée automatiquement (économie 5$)
//   - Rappel de renouvellement 3 jours avant expiration (bannière rouge + push)

export const PLANS = [
  {
    id: 'monthly',
    label: 'Mensuel',
    priceUsd: 20,
    durationDays: 30,
    tagline: 'Idéal pour tester',
    badgeIncluded: false,
    features: [
      'Annonces illimitées pendant 1 mois',
      'Messagerie ORIZON illimitée',
      'Statistiques de vues + contacts',
      'Support standard',
    ],
    color: '#0EA5E9',
    icon: 'calendar-outline',
  },
  {
    id: 'quarterly',
    label: '3 mois',
    priceUsd: 50,
    durationDays: 92,
    tagline: 'Le plus populaire — économie de 10$',
    badgeIncluded: false,
    features: [
      'Annonces illimitées pendant 3 mois',
      'Messagerie ORIZON illimitée',
      'Statistiques détaillées',
      'Support prioritaire',
      'Mise en avant hebdomadaire',
    ],
    color: '#7C3AED',
    icon: 'calendar',
    popular: true,
  },
  {
    id: 'yearly',
    label: 'Annuel',
    priceUsd: 160,
    durationDays: 365,
    tagline: 'Meilleure offre — économie de 80$ + badge vérifié inclus',
    badgeIncluded: true,
    features: [
      'Annonces illimitées pendant 1 an',
      'Badge "Vérifié" inclus (valeur 5$)',
      'Messagerie ORIZON illimitée',
      'Statistiques avancées',
      'Support prioritaire',
      'Mise en avant permanente',
      'Boost gratuit x2 dans l\'année',
    ],
    color: '#DC2626',
    icon: 'diamond-outline',
    best: true,
  },
];

// Badge "Vérifié" achetable indépendamment (hors plan annuel).
// Le badge apparaît en bleu à côté du nom du propriétaire sur ses annonces.
export const VERIFIED_BADGE = {
  id: 'verified_badge',
  label: 'Badge Vérifié',
  priceUsd: 5,
  durationDays: 365,
  description:
    'Badge bleu de confiance affiché sur ton profil et à côté de ton nom sur toutes tes annonces. '
    + 'Renforce la crédibilité auprès des acheteurs / locataires.',
  color: '#2563EB',
  icon: 'shield-checkmark',
};

// Renouvellement — nombre de jours AVANT expiration où l'on affiche la bannière
// rouge sur le profil + envoie un push de rappel.
export const RENEWAL_REMINDER_DAYS = 3;

export function findPlan(id) {
  return PLANS.find((p) => p.id === id) || null;
}

// Formatte une date d'expiration en français court (ex : "15 août 2026").
export function formatExpiry(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

// Jours restants avant expiration (négatif = expiré).
export function daysUntilExpiry(iso, now = new Date()) {
  if (!iso) return null;
  try {
    const exp = new Date(iso).getTime();
    return Math.ceil((exp - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
