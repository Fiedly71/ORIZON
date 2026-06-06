/**
 * One-shot demojibake pass for the entire src/ tree.
 * Reads each text file in UTF-8 and replaces common UTF-8-decoded-as-Latin-1
 * mojibake sequences with their proper characters.
 *
 * Run from react-native-app/: `node scripts/fix-mojibake.js`
 */
const fs = require('fs');
const path = require('path');

// Ordre important : patterns multi-bytes d'abord (3 chars -> 1), puis 2->1.
// Les sequences mojibake UTF-8-lu-comme-CP1252 sont ecrites en \u escapes pour
// eviter toute ambiguite d'encodage du fichier de script lui-meme.
const REPLACEMENTS = [
  // E2 80 XX (curly punctuation) -> â € + char CP1252(XX)
  ['\u00E2\u20AC\u02DC', '\u2018'],  // left single quote '
  ['\u00E2\u20AC\u2122', '\u2019'],  // right single quote / apostrophe '
  ['\u00E2\u20AC\u0153',  '\u201C'], // left double quote "
  ['\u00E2\u20AC\u009D', '\u201D'],  // right double quote "
  ['\u00E2\u20AC\u201C', '\u2013'],  // en-dash -
  ['\u00E2\u20AC\u201D', '\u2014'],  // em-dash --
  ['\u00E2\u20AC\u00A6', '\u2026'],  // ellipsis ...
  ['\u00E2\u20AC\u00A2', '\u2022'],  // bullet *
  ['\u00E2\u20AC\u00B0', '\u2030'],  // per mille
  ['\u00E2\u20AC\u00B9', '\u2039'],  // single left angle
  ['\u00E2\u20AC\u00BA', '\u203A'],  // single right angle
  ['\u00E2\u201A\u00AC', '\u20AC'],  // euro
  ['\u00E2\u201E\u00A2', '\u2122'],  // trademark
  // Also handle the ASCII-quote fallback in case some files were partially fixed
  ['\u00E2\u20AC"', '\u2014'],
  ['\u00E2\u20AC\u0027', '\u2019'],
  // Latin-1 letters: C3 XX -> Ã + char(XX)
  ['\u00C3\u20AC', '\u00C0'], ['\u00C3\u0081', '\u00C1'], ['\u00C3\u201A', '\u00C2'], ['\u00C3\u0192', '\u00C3'],
  ['\u00C3\u201E', '\u00C4'], ['\u00C3\u2026', '\u00C5'], ['\u00C3\u2020', '\u00C6'], ['\u00C3\u2021', '\u00C7'],
  ['\u00C3\u02C6', '\u00C8'], ['\u00C3\u2030', '\u00C9'], ['\u00C3\u0160', '\u00CA'], ['\u00C3\u2039', '\u00CB'],
  ['\u00C3\u0152', '\u00CC'], ['\u00C3\u008D', '\u00CD'], ['\u00C3\u017D', '\u00CE'], ['\u00C3\u008F', '\u00CF'],
  ['\u00C3\u0090', '\u00D0'], ['\u00C3\u2018', '\u00D1'], ['\u00C3\u2019', '\u00D2'], ['\u00C3\u201C', '\u00D3'],
  ['\u00C3\u201D', '\u00D4'], ['\u00C3\u2022', '\u00D5'], ['\u00C3\u2013', '\u00D6'], ['\u00C3\u2014', '\u00D7'],
  ['\u00C3\u02DC', '\u00D8'], ['\u00C3\u2122', '\u00D9'], ['\u00C3\u0161', '\u00DA'], ['\u00C3\u203A', '\u00DB'],
  ['\u00C3\u0153', '\u00DC'], ['\u00C3\u009D', '\u00DD'], ['\u00C3\u017E', '\u00DE'], ['\u00C3\u0178', '\u00DF'],
  ['\u00C3\u00A0', '\u00E0'], ['\u00C3\u00A1', '\u00E1'], ['\u00C3\u00A2', '\u00E2'], ['\u00C3\u00A3', '\u00E3'],
  ['\u00C3\u00A4', '\u00E4'], ['\u00C3\u00A5', '\u00E5'], ['\u00C3\u00A6', '\u00E6'], ['\u00C3\u00A7', '\u00E7'],
  ['\u00C3\u00A8', '\u00E8'], ['\u00C3\u00A9', '\u00E9'], ['\u00C3\u00AA', '\u00EA'], ['\u00C3\u00AB', '\u00EB'],
  ['\u00C3\u00AC', '\u00EC'], ['\u00C3\u00AD', '\u00ED'], ['\u00C3\u00AE', '\u00EE'], ['\u00C3\u00AF', '\u00EF'],
  ['\u00C3\u00B0', '\u00F0'], ['\u00C3\u00B1', '\u00F1'], ['\u00C3\u00B2', '\u00F2'], ['\u00C3\u00B3', '\u00F3'],
  ['\u00C3\u00B4', '\u00F4'], ['\u00C3\u00B5', '\u00F5'], ['\u00C3\u00B6', '\u00F6'], ['\u00C3\u00B7', '\u00F7'],
  ['\u00C3\u00B8', '\u00F8'], ['\u00C3\u00B9', '\u00F9'], ['\u00C3\u00BA', '\u00FA'], ['\u00C3\u00BB', '\u00FB'],
  ['\u00C3\u00BC', '\u00FC'], ['\u00C3\u00BD', '\u00FD'], ['\u00C3\u00BE', '\u00FE'], ['\u00C3\u00BF', '\u00FF'],
  // C2 XX -> Â + char(XX)  (sup latin punctuation / symbols)
  ['\u00C2\u00A0', '\u00A0'], // non-breaking space
  ['\u00C2\u00A1', '\u00A1'], ['\u00C2\u00A2', '\u00A2'], ['\u00C2\u00A3', '\u00A3'],
  ['\u00C2\u00A4', '\u00A4'], ['\u00C2\u00A5', '\u00A5'], ['\u00C2\u00A6', '\u00A6'],
  ['\u00C2\u00A7', '\u00A7'], ['\u00C2\u00A8', '\u00A8'], ['\u00C2\u00A9', '\u00A9'],
  ['\u00C2\u00AA', '\u00AA'], ['\u00C2\u00AB', '\u00AB'], ['\u00C2\u00AC', '\u00AC'],
  ['\u00C2\u00AE', '\u00AE'], ['\u00C2\u00AF', '\u00AF'], ['\u00C2\u00B0', '\u00B0'],
  ['\u00C2\u00B1', '\u00B1'], ['\u00C2\u00B2', '\u00B2'], ['\u00C2\u00B3', '\u00B3'],
  ['\u00C2\u00B4', '\u00B4'], ['\u00C2\u00B5', '\u00B5'], ['\u00C2\u00B6', '\u00B6'],
  ['\u00C2\u00B7', '\u00B7'], ['\u00C2\u00B8', '\u00B8'], ['\u00C2\u00B9', '\u00B9'],
  ['\u00C2\u00BA', '\u00BA'], ['\u00C2\u00BB', '\u00BB'], ['\u00C2\u00BC', '\u00BC'],
  ['\u00C2\u00BD', '\u00BD'], ['\u00C2\u00BE', '\u00BE'], ['\u00C2\u00BF', '\u00BF'],
];

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.sql']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.expo', '.git', 'build', 'android', 'ios']);

let totalFiles = 0;
let touchedFiles = 0;
let totalReplacements = 0;

function processFile(p) {
  totalFiles++;
  let buf;
  try { buf = fs.readFileSync(p); } catch { return; }
  // Strip UTF-8 BOM if present.
  let hasBom = false;
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    hasBom = true;
    buf = buf.subarray(3);
  }
  let text;
  try { text = buf.toString('utf8'); } catch { return; }
  const before = text;
  let count = 0;
  for (const [bad, good] of REPLACEMENTS) {
    if (text.indexOf(bad) === -1) continue;
    const parts = text.split(bad);
    count += parts.length - 1;
    text = parts.join(good);
  }
  if (text !== before || hasBom) {
    fs.writeFileSync(p, text, 'utf8'); // no BOM
    touchedFiles++;
    totalReplacements += count;
    if (count > 0) console.log(`  ${path.relative(process.cwd(), p)}: ${count} fixes${hasBom ? ' (+removed BOM)' : ''}`);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!EXTS.has(path.extname(entry.name))) continue;
    processFile(p);
  }
}

const root = process.argv[2] || path.resolve(__dirname, '..');
console.log(`[fix-mojibake] scanning ${root}`);
walk(root);
console.log(`[fix-mojibake] scanned ${totalFiles} files, fixed ${touchedFiles}, ${totalReplacements} total replacements`);
