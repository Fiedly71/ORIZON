// Generateur d'assets ORIZON (icone + splash + adaptive + favicon)
// Design : fond bleu #1D4ED8, lettre "O" stylisee blanche avec accent oriental (mini soleil levant)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'react-native-app', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const BLUE = '#1D4ED8';
const BLUE_DARK = '#1E3A8A';
const WHITE = '#FFFFFF';
const ORANGE = '#F59E0B'; // accent soleil levant (orizon = horizon)

// SVG icone principale - O stylise + soleil levant
function iconSvg(size, withBackground = true) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.32;
  const rInner = size * 0.20;
  const sunY = cy + size * 0.05;
  const sunR = size * 0.08;
  const horizonY = cy + size * 0.10;

  const bg = withBackground
    ? `<rect width="${size}" height="${size}" fill="${BLUE}"/>`
    : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <!-- O exterieur -->
  <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="${WHITE}" stroke-width="${size * 0.06}"/>
  <!-- Soleil levant orange -->
  <circle cx="${cx}" cy="${sunY}" r="${sunR}" fill="${ORANGE}"/>
  <!-- Ligne d'horizon blanche qui coupe le O -->
  <rect x="${cx - rInner * 1.4}" y="${horizonY}" width="${rInner * 2.8}" height="${size * 0.025}" fill="${WHITE}"/>
</svg>`;
}

// Splash : logo centre + texte ORIZON
function splashSvg(width, height) {
  const cx = width / 2;
  const cy = height / 2 - height * 0.05;
  const logoSize = Math.min(width, height) * 0.35;
  const textY = cy + logoSize * 0.85;
  const taglineY = textY + height * 0.04;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BLUE}"/>
  <g transform="translate(${cx - logoSize / 2}, ${cy - logoSize / 2})">
    ${iconSvg(logoSize, false).replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
  <text x="${cx}" y="${textY}" font-family="Helvetica, Arial, sans-serif" font-size="${width * 0.10}" font-weight="bold" fill="${WHITE}" text-anchor="middle" letter-spacing="${width * 0.008}">ORIZON</text>
  <text x="${cx}" y="${taglineY}" font-family="Helvetica, Arial, sans-serif" font-size="${width * 0.028}" fill="${WHITE}" fill-opacity="0.85" text-anchor="middle">Immobilier nouvelle generation</text>
</svg>`;
}

async function generate() {
  const tasks = [
    { name: 'icon.png',          size: 1024, svg: iconSvg(1024) },
    { name: 'adaptive-icon.png', size: 1024, svg: iconSvg(1024) },
    { name: 'favicon.png',       size: 48,   svg: iconSvg(48) },
    { name: 'splash.png',        size: null, svg: splashSvg(1284, 2778) },
    { name: 'splash-icon.png',   size: 1024, svg: iconSvg(1024) }, // expo-splash-screen plugin
    { name: 'notification-icon.png', size: 96, svg: iconSvg(96) }, // notif Android
  ];

  for (const t of tasks) {
    const buf = Buffer.from(t.svg);
    await sharp(buf).png().toFile(path.join(OUT, t.name));
    console.log('OK ', t.name);
  }
  console.log('\nTous les assets generes dans:', OUT);
}

generate().catch((e) => { console.error(e); process.exit(1); });
