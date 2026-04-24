// Wrapper analytics ORIZON. Utilise PostHog si la cle EXPO_PUBLIC_POSTHOG_KEY est definie,
// sinon mode no-op pour ne rien casser en dev.
import { PostHog } from 'posthog-react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let client = null;

export async function initAnalytics() {
  if (!KEY) return null;
  try {
    client = new PostHog(KEY, { host: HOST, flushAt: 20, flushInterval: 30000 });
    return client;
  } catch {
    return null;
  }
}

export function track(event, props = {}) {
  try { client?.capture(event, props); } catch {}
}

export function identify(userId, traits = {}) {
  try { client?.identify(userId, traits); } catch {}
}

export function resetAnalytics() {
  try { client?.reset(); } catch {}
}

// Catalogue d'evenements ORIZON.
export const EVT = {
  signUp: 'auth_sign_up',
  signIn: 'auth_sign_in',
  signOut: 'auth_sign_out',
  viewProperty: 'property_view',
  createListing: 'listing_create',
  requestVisit: 'visit_request',
  startPayment: 'payment_start',
  paymentSuccess: 'payment_success',
  paymentFail: 'payment_fail',
  submitKyc: 'kyc_submit',
  setLanguage: 'set_language',
};
