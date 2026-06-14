// Audit: liste les icones referencees dans src/ qui n'existent PAS dans le glyphmap Ionicons.
const fs = require('fs');
const path = require('path');
const glyphMap = require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const srcDir = path.resolve(__dirname, '..', 'src');

const used = new Set();
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { walk(p); continue; }
    if (!/\.(js|jsx|ts|tsx)$/.test(f.name)) continue;
    const code = fs.readFileSync(p, 'utf8');
    const re1 = /\bname\s*=\s*['"`]([a-z0-9-]+)['"`]/gi;
    const re2 = /\bname\s*=\s*\{[^}]*?['"`]([a-z0-9-]+)['"`][^}]*?\}/gi;
    const re3 = /\bicon\s*:\s*['"`]([a-z0-9-]+)['"`]/gi;
    let m;
    while ((m = re1.exec(code))) used.add(m[1]);
    while ((m = re2.exec(code))) {
      const inner = m[0]; const sr = /['"`]([a-z0-9-]+)['"`]/gi; let s;
      while ((s = sr.exec(inner))) used.add(s[1]);
    }
    while ((m = re3.exec(code))) used.add(m[1]);
  }
}
walk(srcDir);

const missing = [];
const present = [];
for (const n of [...used].sort()) {
  if (glyphMap[n] != null) present.push(n);
  else missing.push(n);
}
console.log('TOTAL used:', used.size, '| present:', present.length, '| missing:', missing.length);
if (missing.length) {
  console.log('\n=== MISSING (probably typos or removed icons) ===');
  missing.forEach(n => console.log(' -', n));
}
