// sectionsService - Definit les sections de l'Explorer ORIZON.
// Chaque section a un id, label, icone, predicate (filtre), et tri optionnel.
// On charge une fois la liste complete des proprietes approuvees, puis on
// derive chaque section client-side pour minimiser le nombre d'appels DB.
import { listProperties } from './propertiesService';
import { distanceKm } from './locationService';

export const SECTIONS = [
  {
    id: 'featured',
    label: 'A la une',
    subtitle: 'Coups de coeur ORIZON',
    icon: 'star',
    color: '#F5B301',
    predicate: (p) => p.featured || p.isPremium || p.is_premium,
    sort: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0),
  },
  {
    id: 'nearby',
    label: 'A proximite',
    subtitle: 'Pres de toi',
    icon: 'navigate',
    color: '#1D4ED8',
    requiresGeo: true,
    predicate: (p) => p.lat && p.lng,
    sort: (a, b) => (a._dist || 0) - (b._dist || 0),
  },
  {
    id: 'recent',
    label: 'Nouveautes',
    subtitle: 'Publies recemment',
    icon: 'time',
    color: '#10B981',
    predicate: () => true,
    sort: (a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0),
    limit: 12,
  },
  {
    id: 'sale',
    label: 'A vendre',
    subtitle: 'Trouve ton chez-toi',
    icon: 'pricetag',
    color: '#7C3AED',
    predicate: (p) => /vente|vendre|sale|vann/i.test(p.status || ''),
  },
  {
    id: 'rent',
    label: 'A louer',
    subtitle: 'Locations disponibles',
    icon: 'key',
    color: '#0EA5E9',
    predicate: (p) => /louer|rent|lwe/i.test(p.status || ''),
  },
  {
    id: 'luxury',
    label: 'Villas de luxe',
    subtitle: 'Plus de 200k$',
    icon: 'diamond',
    color: '#EC4899',
    predicate: (p) => /villa|penthouse/i.test(p.type || '') && Number(p.price) >= 200000,
  },
  {
    id: 'apartments',
    label: 'Appartements modernes',
    subtitle: 'Vie urbaine',
    icon: 'business',
    color: '#6366F1',
    predicate: (p) => /appartement|apartment/i.test(p.type || ''),
  },
  {
    id: 'good_deals',
    label: 'Bonnes affaires',
    subtitle: 'Moins de 50k$',
    icon: 'flame',
    color: '#EF4444',
    predicate: (p) => Number(p.price) > 0 && Number(p.price) <= 50000 && /vente|vendre|sale/i.test(p.status || ''),
    sort: (a, b) => Number(a.price) - Number(b.price),
  },
  {
    id: 'land',
    label: 'Terrains a batir',
    subtitle: 'Investis dans ton avenir',
    icon: 'leaf',
    color: '#84CC16',
    predicate: (p) => /terrain|land/i.test(p.type || ''),
  },
  {
    id: 'commercial',
    label: 'Espaces commerciaux',
    subtitle: 'Bureaux, locaux, entrepots',
    icon: 'storefront',
    color: '#F97316',
    predicate: (p) => /commercial|bureau/i.test(p.type || ''),
  },
  {
    id: 'verified',
    label: 'Vendeurs verifies',
    subtitle: 'Annonces de confiance',
    icon: 'shield-checkmark',
    color: '#059669',
    predicate: (p) => p.verified === true,
  },
  {
    id: 'studios',
    label: 'Studios & T1',
    subtitle: 'Petits espaces',
    icon: 'bed',
    color: '#A855F7',
    predicate: (p) => /studio/i.test(p.type || '') || (Number(p.bedrooms) === 1 && Number(p.area) <= 50),
  },
];

// Renvoie toutes les proprietes approuvees (un seul appel DB).
export async function loadAllForSections() {
  const r = await listProperties({ page: 0, pageSize: 200 });
  return r.ok ? (r.data || []) : [];
}

// Filtre une section en memoire. Retourne au max `previewCount` items pour l'apercu.
// `myPos` (optionnel) sert pour la section "A proximite".
export function getSectionItems(section, allItems, myPos = null, previewCount = 8) {
  let out = allItems.filter(section.predicate);

  if (section.id === 'nearby' && myPos) {
    out = out.map((p) => ({ ...p, _dist: distanceKm(myPos, { lat: p.lat, lng: p.lng }) }));
  }

  if (section.sort) out = [...out].sort(section.sort);

  return out.slice(0, section.limit || previewCount);
}

export function getSectionById(id) {
  return SECTIONS.find((s) => s.id === id);
}

// Pour la page detail "Voir plus" - retourne tous les items (sans limite).
export function getAllSectionItems(section, allItems, myPos = null) {
  let out = allItems.filter(section.predicate);
  if (section.id === 'nearby' && myPos) {
    out = out.map((p) => ({ ...p, _dist: distanceKm(myPos, { lat: p.lat, lng: p.lng }) }));
  }
  if (section.sort) out = [...out].sort(section.sort);
  return out;
}
