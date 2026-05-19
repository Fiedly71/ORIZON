// build-feature-graphic.mjs
// Genere play-store/feature-graphic.png (1024x500) en composant le logo officiel
// horizontal sur un fond degrade ORIZON, avec tagline.
// Lancer depuis react-native-app/ pour resoudre sharp :
//   node ../scripts/build-feature-graphic.mjs
// OU set NODE_PATH=react-native-app\node_modules avant.

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'play-store', 'feature-graphic.png');
const LOGO = path.join(ROOT, 'logo3.png');

const W = 1024, H = 500;

// SVG : fond + accents + tagline + badge. Le logo PNG est composite par-dessus.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#0B1220"/>
      <stop offset="55%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="60%">
      <stop offset="0%"  stop-color="#F59E0B" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Decorative orbs -->
  <circle cx="900" cy="80"  r="160" fill="#1F2937" opacity="0.45"/>
  <circle cx="80"  cy="450" r="100" fill="#1F2937" opacity="0.35"/>
  <circle cx="500" cy="500" r="180" fill="#F59E0B" opacity="0.05"/>

  <!-- Subtle grid lines -->
  <line x1="0"   y1="380" x2="${W}" y2="380" stroke="#FFFFFF" stroke-opacity="0.04"/>
  <line x1="0"   y1="420" x2="${W}" y2="420" stroke="#FFFFFF" stroke-opacity="0.04"/>

  <!-- Tagline -->
  <text x="60" y="340" font-family="Helvetica, Arial, sans-serif"
        font-size="30" font-weight="500" fill="#E5E7EB" letter-spacing="1">
    Immobilier en Ha&#xEF;ti
  </text>
  <text x="60" y="380" font-family="Helvetica, Arial, sans-serif"
        font-size="22" font-weight="400" fill="#94A3B8">
    Acheter &#xB7; Louer &#xB7; Vendre &#x2014; partout dans le pays
  </text>

  <!-- Badge bottom-left -->
  <g transform="translate(60,420)">
    <rect x="0" y="0" width="230" height="46" rx="23" fill="url(#accent)"/>
    <text x="115" y="31" font-family="Helvetica, Arial, sans-serif"
          font-size="19" font-weight="800" fill="#0B1220" text-anchor="middle">
      100% LOCAL &#xB7; 2026
    </text>
  </g>

  <!-- Right badge: stores -->
  <g transform="translate(${W - 290},420)">
    <rect x="0" y="0" width="230" height="46" rx="23"
          fill="none" stroke="#FBBF24" stroke-width="2"/>
    <text x="115" y="31" font-family="Helvetica, Arial, sans-serif"
          font-size="17" font-weight="700" fill="#FBBF24" text-anchor="middle">
      iOS &#xB7; Android
    </text>
  </g>
</svg>
`;

// Logo size & position : horizontal logo, top-left aligned at y=80
const LOGO_W = 520;
const LOGO_TOP = 90;
const LOGO_LEFT = 60;

const logoResized = await sharp(LOGO)
  .resize({ width: LOGO_W, withoutEnlargement: false })
  .png()
  .toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logoResized, top: LOGO_TOP, left: LOGO_LEFT }])
  .png({ quality: 95 })
  .toFile(OUT);

const { size } = await import('node:fs').then(m => m.promises.stat(OUT));
console.log(`OK ${OUT} (${(size / 1024).toFixed(1)} KB)`);
