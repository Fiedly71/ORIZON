// scripts/generate-feature-graphic.mjs
// Compose le feature graphic Google Play (1024x500) avec le logo officiel ORIZON,
// un gradient sombre, et 3 pastilles de features.
// Usage : node scripts/generate-feature-graphic.mjs

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve(process.cwd(), 'tools/package.json'));
const sharp = require('sharp');

const OUT = resolve('play-store/feature-graphic.png');
const LOGO = resolve('logo3.png'); // logo horizontal officiel

const W = 1024, H = 500;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1220"/>
      <stop offset="55%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1F2937"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#FBBF24" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FBBF24" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="850" cy="120" r="220" fill="url(#glow)"/>
  <circle cx="850" cy="120" r="160" fill="#1F2937" opacity="0.45"/>
  <circle cx="100" cy="450" r="140" fill="#1F2937" opacity="0.35"/>

  <!-- Tagline + accent -->
  <text x="60" y="100" font-family="Helvetica, Arial, sans-serif"
        font-size="20" font-weight="700" fill="#FBBF24" letter-spacing="6">
    L'IMMOBILIER EN HAITI
  </text>

  <text x="60" y="225" font-family="Helvetica, Arial, sans-serif"
        font-size="56" font-weight="800" fill="#FFFFFF" letter-spacing="1">
    Acheter, louer, vendre
  </text>
  <text x="60" y="280" font-family="Helvetica, Arial, sans-serif"
        font-size="56" font-weight="800" fill="#FBBF24" letter-spacing="1">
    en quelques clics.
  </text>

  <!-- Pastilles features -->
  <g transform="translate(60,335)">
    <rect x="0" y="0" width="225" height="46" rx="23" fill="#1F2937" stroke="#374151" stroke-width="1"/>
    <text x="22" y="30" font-size="22" fill="#FBBF24" font-weight="900">✓</text>
    <text x="50" y="30" font-size="18" fill="#E5E7EB" font-weight="600">Annonces verifiees</text>

    <rect x="240" y="0" width="195" height="46" rx="23" fill="#1F2937" stroke="#374151" stroke-width="1"/>
    <text x="262" y="30" font-size="22" fill="#FBBF24" font-weight="900">✓</text>
    <text x="290" y="30" font-size="18" fill="#E5E7EB" font-weight="600">Carte interactive</text>

    <rect x="445" y="0" width="220" height="46" rx="23" fill="#1F2937" stroke="#374151" stroke-width="1"/>
    <text x="467" y="30" font-size="22" fill="#FBBF24" font-weight="900">✓</text>
    <text x="495" y="30" font-size="18" fill="#E5E7EB" font-weight="600">Paiement MonCash</text>
  </g>

  <!-- Badge bas -->
  <g transform="translate(60,420)">
    <rect x="0" y="0" width="250" height="44" rx="22" fill="url(#accent)"/>
    <text x="125" y="29" font-family="Helvetica, Arial, sans-serif"
          font-size="18" font-weight="900" fill="#0B1220" text-anchor="middle">
      100% LOCAL · 2026
    </text>
  </g>
</svg>
`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();

// Charge logo horizontal officiel, le redimensionne pour passer dans la "card" droite
const logoBuf = await sharp(LOGO)
  .resize({ width: 380, height: 130, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(base)
  .composite([
    { input: logoBuf, left: W - 380 - 60, top: 90 }, // top-right
  ])
  .toFile(OUT);

console.log('OK feature-graphic.png ecrit :', OUT);
const meta = await sharp(OUT).metadata();
console.log('Dimensions :', meta.width, 'x', meta.height, '(taille:', (meta.size || 'n/a'), ')');
