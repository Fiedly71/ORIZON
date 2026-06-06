/**
 * Subset the Ionicons TTF font in dist/ to keep only the glyphs actually used
 * by the source code. Scans `src/**\/*.js` for `name="..."` literals used with
 * the Ionicons component, then keeps just those codepoints.
 *
 * Reduces Ionicons.ttf from ~380 KB to ~30-50 KB (critical for slow networks).
 */
const fs = require('fs');
const path = require('path');

async function run() {
  let subsetFont;
  try {
    subsetFont = require('subset-font');
  } catch (e) {
    console.warn('[subset-ionicons] subset-font not installed, skipping.');
    return;
  }

  const distDir = path.resolve(__dirname, '..', 'dist');
  const srcDir = path.resolve(__dirname, '..', 'src');
  if (!fs.existsSync(distDir) || !fs.existsSync(srcDir)) {
    console.warn('[subset-ionicons] dist or src missing, skipping.');
    return;
  }

  // 1. Load Ionicons glyph map (name -> codepoint).
  let glyphMap;
  try {
    glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
  } catch (e) {
    console.warn('[subset-ionicons] cannot load glyphmap:', e.message);
    return;
  }

  // 2. Walk src/ and extract icon names. Pattern matches usages like:
  //    <Ionicons name="heart" .../>      name="heart-outline"
  //    name={'home'}                     name={isOpen ? 'a' : 'b'}
  const usedNames = new Set();
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx|ts|tsx)$/.test(f.name)) continue;
      const code = fs.readFileSync(p, 'utf8');
      // Match string literals after `name=`
      const re = /\bname\s*=\s*['"`]([a-z0-9-]+)['"`]/gi;
      let m;
      while ((m = re.exec(code))) usedNames.add(m[1]);
      // Match string literals inside expressions: name={...'foo'...}
      const re2 = /\bname\s*=\s*\{[^}]*?['"`]([a-z0-9-]+)['"`][^}]*?\}/gi;
      while ((m = re2.exec(code))) {
        const inner = m[0];
        const strRe = /['"`]([a-z0-9-]+)['"`]/gi;
        let s;
        while ((s = strRe.exec(inner))) usedNames.add(s[1]);
      }
      // Match object property `icon: 'foo-outline'` (config tables for menus / tabs)
      const re3 = /\bicon\s*:\s*['"`]([a-z0-9-]+)['"`]/gi;
      while ((m = re3.exec(code))) usedNames.add(m[1]);
    }
  }
  walk(srcDir);

  // Always keep a handful of fallback glyphs to be safe.
  // Inclut aussi les icones critiques de menus / onglets pour eviter les rectangles vides
  // sur des configs dynamiques (cartes, profil, dashboard, etc.).
  [
    'help', 'help-circle', 'alert-circle', 'close', 'menu', 'ellipse',
    'home', 'home-outline', 'heart', 'heart-outline',
    'person-outline', 'person-circle-outline', 'people-outline',
    'search-outline', 'search', 'add', 'add-circle',
    'chatbubbles-outline', 'chatbubble-ellipses-outline', 'chatbubble-outline',
    'calendar-outline', 'calendar', 'stats-chart-outline', 'stats-chart',
    'card-outline', 'wallet-outline', 'cash-outline',
    'notifications-outline', 'notifications', 'star-outline', 'star',
    'shield-checkmark-outline', 'ban-outline', 'lock-closed-outline',
    'document-text-outline', 'information-circle-outline',
    'business-outline', 'grid-outline', 'image-outline',
    'flag-outline', 'flame', 'flame-outline',
    'call-outline', 'call', 'mail-outline', 'mail-open-outline',
    'logo-whatsapp', 'logo-facebook', 'logo-google',
    'chevron-back', 'chevron-forward', 'chevron-down', 'chevron-up',
    'arrow-back', 'arrow-forward',
    'checkmark', 'checkmark-circle', 'close-circle', 'close-outline',
    'pencil-outline', 'trash-outline', 'eye-outline', 'eye-off-outline',
    'share-outline', 'share-social-outline',
    'location-outline', 'location', 'map-outline',
    'calculator-outline',
    'settings-outline', 'log-out-outline',
    'bed-outline', 'water-outline', 'resize-outline',
    'time-outline', 'filter-outline', 'options-outline',
  ].forEach((n) => usedNames.add(n));

  const codepoints = [];
  for (const name of usedNames) {
    const cp = glyphMap[name];
    if (typeof cp === 'number') codepoints.push(cp);
  }
  if (!codepoints.length) {
    console.warn('[subset-ionicons] no glyphs matched, skipping.');
    return;
  }
  const text = codepoints.map((cp) => String.fromCodePoint(cp)).join('');

  // 3. Find Ionicons*.ttf in dist/.
  function findTtf(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) {
        const r = findTtf(p);
        if (r) return r;
      } else if (/^Ionicons\..*\.ttf$/.test(f.name)) {
        return p;
      }
    }
    return null;
  }
  const ttfPath = findTtf(distDir);
  if (!ttfPath) {
    console.warn('[subset-ionicons] no Ionicons.*.ttf in dist/, skipping.');
    return;
  }

  const before = fs.statSync(ttfPath).size;
  const original = fs.readFileSync(ttfPath);
  try {
    const subset = await subsetFont(original, text, { targetFormat: 'truetype' });
    fs.writeFileSync(ttfPath, subset);
    const after = subset.length;
    console.log(
      `[subset-ionicons] ${path.basename(ttfPath)} ${Math.round(before / 1024)} KB -> ${Math.round(
        after / 1024
      )} KB (${usedNames.size} icon names, ${codepoints.length} glyphs)`
    );
  } catch (e) {
    console.warn('[subset-ionicons] subsetting failed:', e.message);
  }
}

run().catch((e) => {
  console.warn('[subset-ionicons] error:', e.message);
});
