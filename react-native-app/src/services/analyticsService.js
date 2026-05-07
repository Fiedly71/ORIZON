// Wrapper analytics ORIZON. Utilise PostHog si la cle EXPO_PUBLIC_POSTHOG_KEY est definie,
// sinon mode no-op pour ne rien casser en dev.
import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let client = null;
let trackingAllowed = true; // par defaut true (Android + iOS<14.5)

// iOS 14.5+ App Tracking Transparency - obligatoire avant tout SDK analytics.
async function requestIosTrackingIfNeeded() {
  if (Platform.OS !== 'ios') return true;
  try {
    const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
    const { status } = await requestTrackingPermissionsAsync();
    return status === 'granted';
  } catch {
    return true; // module non installe -> on continue sans bloquer le build
  }
}

export async function initAnalytics() {
  if (!KEY) return null;
  trackingAllowed = await requestIosTrackingIfNeeded();
  if (!trackingAllowed) return null; // respect du choix utilisateur
  try {
    client = new PostHog(KEY, { host: HOST, flushAt: 20, flushInterval: 30000 });
    return client;
  } catch {
    return null;
  }
}

export function track(event, props = {}) {
  if (!trackingAllowed) return;
  try { client?.capture(event, props); } catch {}
}

// Helpers shortcuts pour les events ORIZON courants
export const trackSearch = (q, filters = {}) => track('search', { q, ...filters });
export const trackViewProperty = (id, extra = {}) => track('view_property', { id, ...extra });
export const trackContact = (id, channel) => track('contact_property', { id, channel });
export const trackBookVisit = (id) => track('book_visit', { id });
export const trackSaveSearch = (name) => track('saved_search', { name });
export const trackBoost = (id, days) => track('boost_listing', { id, days });
export const trackFavorite = (id, state) => track('favorite', { id, state });


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
