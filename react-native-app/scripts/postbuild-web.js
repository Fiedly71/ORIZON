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

// Override viewport meta to add viewport-fit=cover so env(safe-area-inset-*) returns
// real values on devices with notches / gesture bars (iOS, recent Android).
html = html.replace(
  /<meta\s+name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />'
);

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
      html, body { margin: 0; padding: 0; background: var(--orizon-frame-bg); height: 100vh; height: 100svh; }
      body { overflow: hidden; overscroll-behavior: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      #root {
        display: flex; flex-direction: column; flex: 1;
        width: 100vw;
        height: 100vh; height: 100svh;
        max-height: 100vh; max-height: 100svh;
        background: #FFFFFF;
        overflow: hidden;
        padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
        box-sizing: border-box;
      }
      /* Force tab bar containers (React Navigation web) a ne PAS clipper les labels */
      div[role="tablist"], div[role="tablist"] * { overflow: visible !important; }

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
        body { display: flex; align-items: center; justify-content: center; padding: 24px 0; box-sizing: border-box; overflow: auto; height: 100vh; height: 100svh; }
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
          if (!root) { setTimeout(watchRoot, 50); return; }
          if (root.childElementCount > 0) { hideSplash(); return; }
          var mo = new MutationObserver(function () {
            if (root.childElementCount > 0) { mo.disconnect(); hideSplash(); }
          });
          mo.observe(root, { childList: true, subtree: true });
          setTimeout(function () {
            if (root.childElementCount > 0) { mo.disconnect(); hideSplash(); }
          }, 500);
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
    </script>
    <style id="orizon-prompts">
      .orizon-banner {
        position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 10000;
        background: #FFFFFF; color: #0F172A;
        border-radius: 16px; padding: 16px 18px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px; line-height: 1.5;
        display: none; animation: orizon-slideup 0.35s ease-out;
        max-width: 480px; margin: 0 auto;
      }
      .orizon-banner.visible { display: block; }
      .orizon-banner-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #0F172A; }
      .orizon-banner-text { color: #475569; font-size: 13px; margin-bottom: 12px; }
      .orizon-banner-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .orizon-btn {
        flex: 1; min-width: 100px; padding: 10px 14px; border-radius: 10px;
        font-weight: 600; font-size: 13px; cursor: pointer; border: none;
        font-family: inherit; transition: opacity 0.15s;
      }
      .orizon-btn:active { opacity: 0.7; }
      .orizon-btn-primary { background: #1D4ED8; color: #FFFFFF; }
      .orizon-btn-secondary { background: #F1F5F9; color: #475569; }
      .orizon-btn-link { background: transparent; color: #1D4ED8; padding: 6px 8px; min-width: auto; flex: 0; font-size: 12px; }
      .orizon-ios-steps { margin: 8px 0 12px; padding-left: 18px; color: #475569; font-size: 13px; }
      .orizon-ios-steps li { margin-bottom: 4px; }
      .orizon-ios-icon { display: inline-block; width: 16px; height: 16px; vertical-align: -3px; margin: 0 2px; }
      @keyframes orizon-slideup { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @media (min-width: 900px) {
        .orizon-banner { left: 24px; right: auto; bottom: 24px; max-width: 360px; margin: 0; }
      }
    </style>
    <div id="orizon-cookie-banner" class="orizon-banner" role="dialog" aria-label="Consentement aux cookies">
      <div class="orizon-banner-title">Cookies & confidentialite</div>
      <div class="orizon-banner-text">
        ORIZON utilise des cookies essentiels pour ton compte et des cookies de mesure d'audience anonyme pour ameliorer l'app.
        Tu peux changer d'avis a tout moment dans Parametres.
      </div>
      <div class="orizon-banner-actions">
        <button class="orizon-btn orizon-btn-secondary" id="orizon-cookie-reject" type="button">Refuser</button>
        <button class="orizon-btn orizon-btn-primary" id="orizon-cookie-accept" type="button">Accepter</button>
      </div>
    </div>
    <div id="orizon-install-banner" class="orizon-banner" role="dialog" aria-label="Installer ORIZON">
      <div class="orizon-banner-title">Installer ORIZON</div>
      <div class="orizon-banner-text" id="orizon-install-text">
        Ajoute ORIZON a ton ecran d'accueil pour un acces rapide, comme une vraie app.
      </div>
      <div id="orizon-ios-instructions" style="display:none;">
        <ol class="orizon-ios-steps">
          <li>Touche l'icone <strong>Partager</strong> en bas de Safari (carre avec une fleche).</li>
          <li>Fais defiler et touche <strong>« Sur l'ecran d'accueil »</strong>.</li>
          <li>Touche <strong>Ajouter</strong> en haut a droite.</li>
        </ol>
      </div>
      <div class="orizon-banner-actions">
        <button class="orizon-btn orizon-btn-secondary" id="orizon-install-later" type="button">Plus tard</button>
        <button class="orizon-btn orizon-btn-primary" id="orizon-install-go" type="button">Installer</button>
      </div>
    </div>
    <script>
      (function () {
        var COOKIE_KEY = 'orizon-cookie-consent';
        var INSTALL_KEY = 'orizon-install-dismissed';
        var ua = navigator.userAgent || '';
        var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        var isAndroid = /Android/i.test(ua);
        var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        var deferredPrompt = null;

        // ===== Cookie banner =====
        function showCookieBanner() {
          var el = document.getElementById('orizon-cookie-banner');
          if (!el) return;
          el.classList.add('visible');
        }
        function hideCookieBanner(consent) {
          var el = document.getElementById('orizon-cookie-banner');
          if (el) el.classList.remove('visible');
          try { localStorage.setItem(COOKIE_KEY, consent + '|' + Date.now()); } catch (_) {}
          // After cookie choice, eventually show install prompt
          setTimeout(maybeShowInstall, 20000);
        }
        try {
          var saved = localStorage.getItem(COOKIE_KEY);
          if (!saved) {
            setTimeout(showCookieBanner, 1500);
          } else {
            setTimeout(maybeShowInstall, 25000);
          }
        } catch (_) {
          setTimeout(showCookieBanner, 1500);
        }
        document.addEventListener('click', function (e) {
          if (e.target && e.target.id === 'orizon-cookie-accept') hideCookieBanner('accepted');
          else if (e.target && e.target.id === 'orizon-cookie-reject') hideCookieBanner('rejected');
          else if (e.target && e.target.id === 'orizon-install-later') dismissInstall();
          else if (e.target && e.target.id === 'orizon-install-go') triggerInstall();
        });

        // ===== Install prompt =====
        window.addEventListener('beforeinstallprompt', function (e) {
          e.preventDefault();
          deferredPrompt = e;
        });

        function dismissInstall() {
          var el = document.getElementById('orizon-install-banner');
          if (el) el.classList.remove('visible');
          try { localStorage.setItem(INSTALL_KEY, Date.now().toString()); } catch (_) {}
        }
        function triggerInstall() {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () {
              deferredPrompt = null;
              dismissInstall();
            });
          } else if (isIOS) {
            var steps = document.getElementById('orizon-ios-instructions');
            var go = document.getElementById('orizon-install-go');
            var txt = document.getElementById('orizon-install-text');
            if (steps) steps.style.display = 'block';
            if (go) go.style.display = 'none';
            if (txt) txt.textContent = 'Suis ces 3 etapes dans Safari :';
          } else {
            dismissInstall();
          }
        }
        function maybeShowInstall() {
          if (isStandalone) return;
          var cookieEl = document.getElementById('orizon-cookie-banner');
          if (cookieEl && cookieEl.classList.contains('visible')) {
            // Re-try after cookies handled
            setTimeout(maybeShowInstall, 5000);
            return;
          }
          try {
            var dismissed = localStorage.getItem(INSTALL_KEY);
            if (dismissed) {
              // Don't show again for 7 days
              if (Date.now() - parseInt(dismissed, 10) < 7 * 24 * 3600 * 1000) return;
            }
          } catch (_) {}
          if (!isIOS && !isAndroid && !deferredPrompt) return; // desktop: only if browser allows
          if (isIOS || deferredPrompt || isAndroid) {
            var el = document.getElementById('orizon-install-banner');
            if (el) el.classList.add('visible');
          }
        }
      })();
    </script>`;

html = html.replace(/<body>/i, '<body>' + SPLASH_HTML);

fs.writeFileSync(indexPath, html, 'utf8');

// BUILD_ID change a chaque deploiement -> nouveau cache + ancien invalide.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || String(Date.now());
const SW_JS = `// ORIZON service worker - versionne par BUILD_ID = ${BUILD_ID}
const BUILD_ID = '${BUILD_ID}';
const CACHE = 'orizon-' + BUILD_ID;
const PRECACHE = ['/', '/index.html'${bundleUrl ? `, '${bundleUrl}'` : ''}];

self.addEventListener('install', (event) => {
  // NE PAS skipWaiting automatiquement: on attend que l'utilisateur clique
  // "Recharger" via le banner UpdateBanner (postMessage SKIP_WAITING).
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Bundles JS et chunks: network-first (en cas d'ancien hash en cache, on prefere le reseau).
  if (url.pathname.startsWith('/_expo/static/js/') || /\\.js$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Assets statiques (images, fonts, css): cache-first.
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/') || /\\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // Navigation HTML: TOUJOURS network-first (sinon vieille version visible).
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
console.log('[postbuild-web] SW versionne: BUILD_ID =', BUILD_ID);

// Copie les assets PWA (public/) vers dist/ pour qu'ils soient servis a la racine.
const publicDir = path.resolve(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  for (const f of fs.readdirSync(publicDir)) {
    try { fs.copyFileSync(path.join(publicDir, f), path.join(distDir, f)); } catch {}
  }
}

const MANIFEST = {
  name: 'ORIZON - Immobilier Haiti',
  short_name: 'ORIZON',
  description: 'Achete, loue, vends ton bien immobilier en Haiti. Annonces verifiees, paiement MonCash.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#1D4ED8',
  theme_color: '#1D4ED8',
  lang: 'fr',
  categories: ['business', 'lifestyle', 'shopping'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(MANIFEST, null, 2), 'utf8');

const faviconSrc = path.resolve(__dirname, '..', 'assets', 'favicon.png');
const faviconDest = path.join(distDir, 'favicon.ico');
if (fs.existsSync(faviconSrc) && !fs.existsSync(faviconDest)) {
  fs.copyFileSync(faviconSrc, faviconDest);
}

console.log('[postbuild-web] OK - splash + SW + manifest + responsive CSS injected. Bundle:', bundleUrl);
