// geocodingService - Geocodage adresse -> lat/lng via Nominatim (OSM, gratuit).
// Respecte la rate-limit Nominatim : 1 req/sec, User-Agent obligatoire.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = 'ORIZON-Mobile/1.0 (contact@orizon.ht)';

export async function geocodeAddress(query, { country = 'ht' } = {}) {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: 'Adresse vide' };
  try {
    const url = `${NOMINATIM}/search?format=json&limit=1&countrycodes=${country}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) {
      return { ok: false, error: 'Adresse introuvable' };
    }
    const r = json[0];
    return {
      ok: true,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    return {
      ok: true,
      address: json.display_name,
      city: json.address?.city || json.address?.town || json.address?.village,
      country: json.address?.country,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
