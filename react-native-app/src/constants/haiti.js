// Decoupage administratif d'Haiti : 10 departements et leurs villes principales.
// Source : decoupage officiel (MICT). Liste non exhaustive mais couvre les
// villes ou se concentre l'activite immobiliere.

export const DEPARTMENTS = [
  'Ouest',
  'Nord',
  'Nord-Est',
  'Nord-Ouest',
  'Sud',
  'Sud-Est',
  'Artibonite',
  'Centre',
  'Grand\u2019Anse',
  'Nippes',
];

export const CITIES_BY_DEPT = {
  'Ouest': [
    'Port-au-Prince', 'Petion-Ville', 'Delmas', 'Carrefour', 'Cite Soleil',
    'Tabarre', 'Croix-des-Bouquets', 'Kenscoff', 'Thomazeau', 'Cabaret',
    'Arcahaie', 'Leogane', 'Petit-Goave', 'Grand-Goave', 'Gressier',
    'Anse-a-Galets', 'Pointe-a-Raquette', 'Ganthier', 'Fonds-Verrettes',
  ],
  'Nord': [
    'Cap-Haïtien', 'Limonade', 'Quartier-Morin', 'Plaine-du-Nord', 'Milot',
    'Grande-Riviere-du-Nord', 'Bahon', 'Acul-du-Nord', 'Plaisance',
    'Pilate', 'Borgne', 'Port-Margot', 'Limbe', 'Bas-Limbe',
    'Saint-Raphael', 'Dondon', 'Ranquitte', 'La Victoire', 'Pignon',
  ],
  'Nord-Est': [
    'Fort-Liberte', 'Ouanaminthe', 'Trou-du-Nord', 'Caracol', 'Limonade',
    'Sainte-Suzanne', 'Vallieres', 'Carice', 'Mont-Organise',
    'Mombin-Crochu', 'Capotille', 'Ferrier', 'Perches',
  ],
  'Nord-Ouest': [
    'Port-de-Paix', 'Saint-Louis-du-Nord', 'Anse-a-Foleur', 'Jean-Rabel',
    'Mole-Saint-Nicolas', 'Bombardopolis', 'Baie-de-Henne', 'Bassin-Bleu',
    'Chansolme', 'La Tortue',
  ],
  'Sud': [
    'Les Cayes', 'Aquin', 'Cavaillon', 'Saint-Louis-du-Sud', 'Maniche',
    'Camp-Perrin', 'Chantal', 'Torbeck', 'Chardonnieres', 'Les Anglais',
    'Tiburon', 'Port-Salut', 'Saint-Jean-du-Sud', 'Ile-a-Vache',
    'Roche-a-Bateau', 'Coteaux', 'Arniquet',
  ],
  'Sud-Est': [
    'Jacmel', 'Marigot', 'Cayes-Jacmel', 'La Vallee', 'Bainet',
    'Cote-de-Fer', 'Belle-Anse', 'Anse-a-Pitres', 'Grand-Gosier',
    'Thiotte', 'Banane',
  ],
  'Artibonite': [
    'Gonaives', 'Saint-Marc', 'Gros-Morne', 'Verrettes', 'Petite-Riviere',
    'Marchand-Dessalines', 'Anse-Rouge', 'Terre-Neuve', 'Ennery',
    'Desdunes', 'Grande-Saline', 'L\u2019Estere', 'La Chapelle', 'Saint-Michel',
  ],
  'Centre': [
    'Hinche', 'Mirebalais', 'Lascahobas', 'Belladere', 'Cerca-Carvajal',
    'Cerca-la-Source', 'Maissade', 'Thomonde', 'Thomassique',
    'Saut-d\u2019Eau', 'Boucan-Carre',
  ],
  'Grand\u2019Anse': [
    'Jeremie', 'Anse-d\u2019Hainault', 'Dame-Marie', 'Les Irois', 'Abricots',
    'Bonbon', 'Roseaux', 'Beaumont', 'Pestel', 'Corail',
    'Chambellan', 'Moron',
  ],
  'Nippes': [
    'Miragoane', 'Baraderes', 'Anse-a-Veau', 'Petit-Trou-de-Nippes',
    'Petite-Riviere-de-Nippes', 'Arnaud', 'Fonds-des-Negres',
    'L\u2019Asile', 'Plaisance-du-Sud', 'Paillant',
  ],
};

export function formatLocation(city, dept) {
  if (city && dept) return `${city}, ${dept}`;
  return city || dept || '';
}

export function parseLocation(loc) {
  if (!loc) return { city: '', dept: '' };
  const parts = loc.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    const dept = parts[parts.length - 1];
    const city = parts.slice(0, -1).join(', ');
    if (DEPARTMENTS.includes(dept)) return { city, dept };
  }
  // Fallback : si la chaine entiere matche une ville, retrouve son departement.
  for (const d of DEPARTMENTS) {
    const cities = CITIES_BY_DEPT[d] || [];
    if (cities.includes(loc)) return { city: loc, dept: d };
  }
  return { city: loc, dept: '' };
}
