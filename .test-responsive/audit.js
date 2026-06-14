// Standalone Playwright responsive audit for kayorizon.com
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'mobile-375',   w: 375,  h: 812  },
  { name: 'tablet-768',   w: 768,  h: 1024 },
  { name: 'desktop-1366', w: 1366, h: 800  },
  { name: 'wide-1920',    w: 1920, h: 1080 },
];

const ROUTES = [
  { name: 'login',       url: 'https://kayorizon.com/login',       skipOnboarding: true },
  { name: 'register',    url: 'https://kayorizon.com/register',    skipOnboarding: true },
  { name: 'onboarding',  url: 'https://kayorizon.com/onboarding',  skipOnboarding: false },
];

const OUT_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const summary = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).substring(0, 250)));

    for (const route of ROUTES) {
      try {
        await page.goto(route.url + '?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
        // Accept cookies + dismiss install banner
        await page.evaluate(() => {
          document.getElementById('orizon-cookie-accept')?.click();
          document.getElementById('orizon-install-later')?.click();
        });
        if (route.skipOnboarding) {
          await page.evaluate(() => localStorage.setItem('orizon.onboarded.v1', '1'));
        }
        await page.waitForTimeout(1800);
        const metrics = await page.evaluate(() => ({
          inner: window.innerWidth,
          scroll: document.documentElement.scrollWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          title: document.title,
        }));
        const file = path.join(OUT_DIR, `${route.name}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        summary.push({ route: route.name, viewport: vp.name, ...metrics, errors: errors.length, file });
      } catch (e) {
        summary.push({ route: route.name, viewport: vp.name, error: String(e).substring(0, 200) });
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(summary, null, 2));
})();
