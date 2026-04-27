// ORIZON - Wrapper d'erreurs (Sentry-ready).
// Pour activer Sentry en prod:
//   1) yarn add @sentry/react-native
//   2) renseigner EXPO_PUBLIC_SENTRY_DSN dans .env / EAS secrets
//   3) ajouter le plugin EAS dans app.json (sentry-expo si besoin)
// Tant que la lib n'est pas installee, ce wrapper reste un no-op silencieux.

let SentryRef = null;
let initialized = false;

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_ENV || 'sandbox';

export async function initErrorTracking() {
  if (initialized) return;
  initialized = true;
  if (!DSN) return;
  try {
    // Import dynamique pour ne pas casser le build si la lib n'est pas presente.
    // eslint-disable-next-line import/no-unresolved, global-require
    SentryRef = require('@sentry/react-native');
    SentryRef.init({
      dsn: DSN,
      environment: ENV,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0.1,
    });
  } catch {
    SentryRef = null;
  }
}

export function captureException(err, context = {}) {
  try {
    if (SentryRef) {
      SentryRef.withScope((scope) => {
        Object.entries(context || {}).forEach(([k, v]) => scope.setExtra(k, v));
        SentryRef.captureException(err);
      });
    } else if (__DEV__) {
      // En dev sans Sentry, log dans la console.
      // eslint-disable-next-line no-console
      console.warn('[ORIZON error]', err, context);
    }
  } catch {}
}

export function captureMessage(msg, level = 'info') {
  try {
    if (SentryRef) SentryRef.captureMessage(msg, level);
  } catch {}
}

export function setUserContext(user) {
  try {
    if (!SentryRef) return;
    if (!user) {
      SentryRef.setUser(null);
      return;
    }
    SentryRef.setUser({ id: user.id, email: user.email });
  } catch {}
}

// Helper: emballe une promesse async, log et renvoie {ok:false,error}.
export async function safe(promise, context = {}) {
  try {
    const v = await promise;
    return { ok: true, value: v };
  } catch (e) {
    captureException(e, context);
    return { ok: false, error: e.message || String(e) };
  }
}
