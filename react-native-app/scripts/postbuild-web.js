/**
 * Post-build script for Expo Web export.
 * Injects responsive "phone frame" CSS into dist/index.html so the app
 * looks good on desktop while remaining full-screen on mobile/tablet.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[postbuild-web] dist/index.html not found at', indexPath);
  process.exit(1);
}

const RESPONSIVE_CSS = `
    <meta name="theme-color" content="#1D4ED8" />
    <meta name="description" content="ORIZON - Trouvez, visitez et achetez des biens immobiliers en Haiti." />
    <link rel="icon" type="image/png" href="/assets/assets/icon.b5b22e1e1c4a4d8c.png" />
    <style id="orizon-responsive">
      :root { --orizon-frame-bg: #EEF2F7; --orizon-frame-shadow: 0 24px 60px rgba(15, 23, 42, 0.18); }
      html, body { margin: 0; padding: 0; background: var(--orizon-frame-bg); }
      body { overflow: hidden; }
      #root { display: flex; flex: 1; height: 100vh; width: 100vw; background: #FFFFFF; }
      @media (min-width: 900px) {
        body { display: flex; align-items: center; justify-content: center; padding: 24px 0; box-sizing: border-box; overflow: auto; }
        #root {
          width: min(480px, calc(100vw - 32px));
          height: min(900px, calc(100vh - 48px));
          max-height: 900px;
          border-radius: 32px;
          box-shadow: var(--orizon-frame-shadow);
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
      }
      @media (min-width: 1280px) {
        body::before {
          content: 'ORIZON';
          position: fixed; left: 48px; top: 32px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 800; font-size: 28px; letter-spacing: 0.5px; color: #1D4ED8;
        }
        body::after {
          content: 'Disponible bientot sur App Store et Google Play';
          position: fixed; left: 48px; top: 72px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px; color: #475569;
        }
      }
    </style>`;

let html = fs.readFileSync(indexPath, 'utf8');

// Replace the default expo-reset style block (and ensure our CSS is loaded once).
const expoResetRegex = /<style id="expo-reset">[\s\S]*?<\/style>/;
if (expoResetRegex.test(html)) {
  html = html.replace(expoResetRegex, RESPONSIVE_CSS.trim());
} else if (!html.includes('id="orizon-responsive"')) {
  html = html.replace('</head>', `${RESPONSIVE_CSS}\n  </head>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[postbuild-web] Injected responsive CSS into dist/index.html');
