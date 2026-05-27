// Injecte le manifest + theme-color + apple-touch-icon et enregistre le service worker.
// S'execute une seule fois, cote web uniquement.
let done = false;
export function registerPWA() {
  if (done || typeof document === 'undefined') return;
  done = true;
  try {
    const head = document.head;
    if (!document.querySelector('link[rel="manifest"]')) {
      const l = document.createElement('link');
      l.rel = 'manifest'; l.href = '/manifest.webmanifest';
      head.appendChild(l);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const l = document.createElement('link');
      l.rel = 'apple-touch-icon'; l.href = '/apple-touch-icon.png';
      head.appendChild(l);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const m = document.createElement('meta');
      m.name = 'theme-color'; m.content = '#1D4ED8';
      head.appendChild(m);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const m = document.createElement('meta');
      m.name = 'apple-mobile-web-app-capable'; m.content = 'yes';
      head.appendChild(m);
      const m2 = document.createElement('meta');
      m2.name = 'apple-mobile-web-app-status-bar-style'; m2.content = 'default';
      head.appendChild(m2);
      const m3 = document.createElement('meta');
      m3.name = 'apple-mobile-web-app-title'; m3.content = 'ORIZON';
      head.appendChild(m3);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  } catch {}
}
