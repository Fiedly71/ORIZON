// Generateur de pages preview ORIZON.
// Usage: node web/generate.js
// - Lit toutes les properties depuis Supabase (table public, statut paid).
// - Pour chaque propriete, genere web/p/<id>.html depuis web/templates/property.html.
// - Genere aussi web/index.html avec un sitemap simple.
// Pour ne pas dependre de @supabase/supabase-js a l'install, on utilise fetch direct REST.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.EXPO_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_KEY  = process.env.SUPABASE_KEY  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const PUBLIC_BASE   = process.env.PUBLIC_BASE   || 'https://orizon.app';

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'templates', 'property.html'), 'utf8');
const OUT_DIR  = path.join(__dirname, 'p');
fs.mkdirSync(OUT_DIR, { recursive: true });

function fmtPrice(n) {
  return '$' + Number(n || 0).toLocaleString('fr-FR');
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render(prop) {
  const id = prop.id;
  const title = esc(prop.title || 'Propriete');
  const description = esc((prop.description || prop.location || 'Decouvrez cette propriete sur ORIZON.').slice(0, 200));
  const image = esc(prop.image || (prop.images && prop.images[0]) || `${PUBLIC_BASE}/og-default.jpg`);
  const location = esc(prop.location || '');
  const price = esc(fmtPrice(prop.price));
  const url = `${PUBLIC_BASE}/p/${id}`;
  return TEMPLATE
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{DESCRIPTION\}\}/g, description)
    .replace(/\{\{IMAGE\}\}/g, image)
    .replace(/\{\{URL\}\}/g, url)
    .replace(/\{\{ID\}\}/g, id)
    .replace(/\{\{LOCATION\}\}/g, location)
    .replace(/\{\{PRICE\}\}/g, price)
    .replace(/\{\{BEDROOMS\}\}/g, String(prop.bedrooms || 0))
    .replace(/\{\{BATHROOMS\}\}/g, String(prop.bathrooms || 0))
    .replace(/\{\{AREA\}\}/g, String(prop.area || 0));
}

async function fetchAllProperties() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('SUPABASE_URL/KEY manquants -> mode mock 1 page de demo');
    return [{
      id: 'demo',
      title: 'Maison Petionville (demo)',
      location: 'Petion-Ville, Haiti',
      price: 250000,
      bedrooms: 3, bathrooms: 2, area: 180,
      image: 'https://picsum.photos/seed/orizon/1200/600',
      description: 'Belle maison familiale dans un quartier securise.',
    }];
  }
  const url = `${SUPABASE_URL}/rest/v1/properties?select=id,title,location,price,bedrooms,bathrooms,area,image,images,description&payment_status=eq.paid`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  const props = await fetchAllProperties();
  console.log(`Generation de ${props.length} pages...`);
  for (const p of props) {
    const html = render(p);
    fs.writeFileSync(path.join(OUT_DIR, `${p.id}.html`), html, 'utf8');
  }
  // Sitemap minimal
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${props.map((p) => `  <url><loc>${PUBLIC_BASE}/p/${p.id}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
  console.log('OK -> web/p/*.html + web/sitemap.xml');
})().catch((e) => { console.error(e); process.exit(1); });
