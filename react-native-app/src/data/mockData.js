// ─────────────────────────────────────────────────────────────
// ORIZON - Donnees de reference (pas de contenu fictif).
// Toutes les listes "exemple" sont vides : la vraie source est Supabase.
// On conserve uniquement les CONSTANTES de domaine (types, equipements,
// services, plans, slides onboarding).
// ─────────────────────────────────────────────────────────────

export const propertyTypes = ['Maison', 'Appartement', 'Hotel', 'Terrain', 'Commercial'];

export const propertyAmenities = [
  'Piscine', 'Parking', 'Securite 24/7', 'Energie solaire', 'Climatisation',
  'Jardin', 'Balcon', 'Terrasse', 'Garage', 'Reserve eau', 'Generatrice',
  'Internet fibre', 'Ascenseur', 'Vue mer', 'Meuble', 'Titre clair',
  'Cuisine equipee', 'Borne EV', 'Buanderie', 'Salle de sport',
];

// Aucune annonce predefinie - alimentation via Supabase.
export const propertiesSeed = [];

// Aucun agent predefini.
export const agentsSeed = [];

// Aucune notification predefinie.
export const notificationsSeed = [];

// Catalogue des services ORIZON (statique, pas une donnee utilisateur).
export const servicesList = [
  { id: 's1', icon: 'home', title: 'Vente & Location', desc: 'Publiez ou trouvez un bien. Maisons, appartements, terrains, hotels et espaces commerciaux.' },
  { id: 's2', icon: 'clipboard', title: 'Gestion locative', desc: 'Confiez votre bien a nos gestionnaires: loyers, entretien, locataires, comptabilite.' },
  { id: 's3', icon: 'chart', title: 'Estimation & Evaluation', desc: 'Obtenez une estimation precise de la valeur de votre propriete par nos experts certifies.' },
  { id: 's4', icon: 'shield', title: 'Accompagnement juridique', desc: 'Contrats, actes notaries, due diligence. Nos partenaires juridiques securisent chaque transaction.' },
  { id: 's5', icon: 'card', title: 'Financement', desc: 'Acces aux meilleures offres de credit immobilier via nos partenaires bancaires locaux.' },
  { id: 's6', icon: 'trend-up', title: 'Investissement', desc: 'Portefeuille, rendement locatif, promotions immobilieres. Maximisez votre patrimoine.' },
];

// Aucune actualite predefinie - alimentation via Supabase / CMS.
export const marketNewsSeed = [];

// Catalogue des plans d'abonnement (statique, configurable backend plus tard).
export const plans = [
  { id: 'plan-starter', name: 'Starter', priceMonthly: 25, color: '#7A8899', benefits: ['3 annonces actives', 'Messagerie illimitee', 'Statistiques de base', 'Support standard'] },
  { id: 'plan-pro', name: 'Pro', priceMonthly: 65, color: '#1A3C5E', benefits: ['20 annonces actives', 'Mise en avant hebdomadaire', 'Statistiques avancees', 'Support prioritaire', 'Badge Agent verifie'] },
  { id: 'plan-premium', name: 'Premium', priceMonthly: 120, color: '#C8A84B', benefits: ['Annonces illimitees', 'Mise en avant permanente', 'Badge Premium + Logo', 'Tableau analytique complet', 'Account manager dedie', 'API acces'] },
];

// Aucun historique de paiement predefini.
export const paymentHistorySeed = [];

// Aucune conversation predefinie.
export const threadsSeed = [];

// Aucun rendez-vous predefini.
export const appointmentsSeed = [];

// Slides d'onboarding (illustrations neutres - a remplacer par tes visuels).
export const onboardingSlides = [
  { id: 's1', titleKey: 'onboarding1Title', textKey: 'onboarding1Text', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80' },
  { id: 's2', titleKey: 'onboarding2Title', textKey: 'onboarding2Text', image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80' },
  { id: 's3', titleKey: 'onboarding3Title', textKey: 'onboarding3Text', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80' },
];
