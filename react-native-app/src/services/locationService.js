// Service de geolocalisation ORIZON.
import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition() {
  const ok = await requestLocationPermission();
  if (!ok) return { ok: false, error: 'Permission refusee' };
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Distance Haversine en km entre 2 points {lat,lng}.
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1));
}

// Valeurs par defaut pour Haiti (Cap-Haitien - lancement initial).
export const HAITI_DEFAULT = { lat: 19.7592, lng: -72.2002, latitudeDelta: 0.25, longitudeDelta: 0.25 };
