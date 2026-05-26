/**
 * Post-build script for Expo Web export.
 * - Injects responsive "phone frame" CSS for desktop
 * - Injects an inline splash screen (ORIZON logo) shown INSTANTLY before the JS bundle finishes downloading
 * - Adds <link rel="preload"> hints to start downloading the JS bundle in parallel with HTML parsing
 * - Registers a service worker for instant repeat loads (offline-first cache for the JS bundle + assets)
 * - Optimized for slow networks (Haiti, 2G/3G).
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[postbuild-web] dist/index.html not found at', indexPath);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
const scriptMatch = html.match(/<script\s+src="(\/_expo\/static\/js\/web\/[^"]+\.js)"[^>]*><\/script>/);
const bundleUrl = scriptMatch ? scriptMatch[1] : null;

const HEAD_INJECTION = `
    <meta name="theme-color" content="#1D4ED8" />
    <meta name="description" content="ORIZON - Trouvez, visitez et achetez des biens immobiliers en Haiti." />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="ORIZON" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.webmanifest" />
    ${bundleUrl ? `<link rel="preload" as="script" href="${bundleUrl}" />` : ''}
    <style id="orizon-responsive">
      :root { --orizon-frame-bg: #EEF2F7; --orizon-frame-shadow: 0 24px 60px rgba(15, 23, 42, 0.18); --orizon-primary: #1D4ED8; }
      html, body { margin: 0; padding: 0; background: var(--orizon-frame-bg); height: 100%; }
      body { overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      #root { display: flex; flex: 1; height: 100vh; width: 100vw; background: #FFFFFF; }

      #orizon-splash {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(160deg, #1D4ED8 0%, #1E40AF 60%, #1E3A8A 100%);
        color: #FFFFFF; transition: opacity 0.45s ease-out;
      }
      #orizon-splash.hidden { opacity: 0; pointer-events: none; }
      .orizon-splash-logo { font-weight: 800; font-size: 44px; letter-spacing: 4px; text-shadow: 0 4px 20px rgba(0,0,0,0.25); }
      .orizon-splash-tagline { margin-top: 12px; font-size: 14px; opacity: 0.85; letter-spacing: 0.5px; }
      .orizon-splash-spinner {
        margin-top: 32px; width: 36px; height: 36px;
        border: 3px solid rgba(255,255,255,0.3); border-top-color: #FFFFFF;
        border-radius: 50%; animation: orizon-spin 0.9s linear infinite;
      }
      .orizon-splash-progress { margin-top: 24px; font-size: 12px; opacity: 0.75; letter-spacing: 0.5px; min-height: 16px; text-align: center; padding: 0 24px; }
      @keyframes orizon-spin { to { transform: rotate(360deg); } }

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
          font-weight: 800; font-size: 28px; letter-spacing: 0.5px; color: var(--orizon-primary);
        }
        body::after {
          content: 'Disponible bientot sur App Store et Google Play';
          position: fixed; left: 48px; top: 72px;
          font-size: 14px; color: #475569;
        }
      }
    </style>`;

const expoResetRegex = /<style id="expo-reset">[\s\S]*?<\/style>/;
if (expoResetRegex.test(html)) {
  html = html.replace(expoResetRegex, HEAD_INJECTION.trim());
} else if (!html.includes('id="orizon-responsive"')) {
  html = html.replace('</head>', `${HEAD_INJECTION}\n  </head>`);
}

const SPLASH_HTML = `
    <div id="orizon-splash" role="status" aria-label="Chargement de ORIZON">
      <div class="orizon-splash-logo">ORIZON</div>
      <div class="orizon-splash-tagline">Immobilier en Haiti</div>
      <div class="orizon-splash-spinner" aria-hidden="true"></div>
      <div class="orizon-splash-progress" id="orizon-splash-progress">Chargement...</div>
    </div>
    <script>
      (function () {
        function hideSplash() {
          var s = document.getElementById('orizon-splash');
          if (!s) return;
          s.classList.add('hidden');
          setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 500);
        }
        function watchRoot() {
          var root = document.getElementById('root');
          if (!root) return;
          var mo = new MutationObserver(function () {
            if (root.childElementCount > 0) { mo.disconnect(); hideSplash(); }
          });
          mo.observe(root, { childList: true });
          setTimeout(hideSplash, 25000);
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', watchRoot);
        } else { watchRoot(); }

        var progress = document.getElementById('orizon-splash-progress');
        var msgs = [
          { at: 3000, text: 'Connexion lente detectee, patiente...' },
          { at: 8000, text: 'Chargement de l\\'application...' },
          { at: 15000, text: 'Presque pret...' },
        ];
        msgs.forEach(function (m) {
          setTimeout(function () {
            var splash = document.getElementById('orizon-splash');
            if (progress && splash && !splash.classList.contains('hidden')) {
              progress.textContent = m.text;
            }
          }, m.at);
        });

        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () {});
          });
        }
      })();
    </script>`;

html = html.replace(/<body>/i, '<body>' + SPLASH_HTML);

fs.writeFileSync(indexPath, html, 'utf8');

const SW_JS = `// ORIZON service worker - optimized for slow networks
const CACHE = 'orizon-v1';
const PRECACHE = ['/', '/index.html'${bundleUrl ? `, '${bundleUrl}'` : ''}];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
    );
  }
});
`;
fs.writeFileSync(path.join(distDir, 'sw.js'), SW_JS, 'utf8');

const MANIFEST = {
  name: 'ORIZON - Immobilier Haiti',
  short_name: 'ORIZON',
  description: 'Trouvez, visitez et achetez des biens immobiliers en Haiti.',
  start_url: '/',
  display: 'standalone',
  background_color: '#1D4ED8',
  theme_color: '#1D4ED8',
  lang: 'fr',
  icons: [
    { src: '/assets/assets/icon.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/assets/adaptive-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(MANIFEST, null, 2), 'utf8');

const faviconSrc = path.resolve(__dirname, '..', 'assets', 'favicon.png');
const faviconDest = path.join(distDir, 'favicon.ico');
if (fs.existsSync(faviconSrc) && !fs.existsSync(faviconDest)) {
  fs.copyFileSync(faviconSrc, faviconDest);
}

console.log('[postbuild-web] OK - splash + SW + manifest + responsive CSS injected. Bundle:', bundleUrl);
