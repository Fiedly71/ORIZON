// Petit cache JSON sur AsyncStorage pour le mode offline.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'orizon.cache.';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h par defaut

export async function setCache(key, data, ttlMs = TTL_MS) {
  try {
    const payload = { t: Date.now(), ttl: ttlMs, data };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(payload));
  } catch {}
}

export async function getCache(key, { ignoreTtl = false } = {}) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, ttl, data } = JSON.parse(raw);
    if (!ignoreTtl && ttl && Date.now() - t > ttl) return null;
    return data;
  } catch {
    return null;
  }
}

export async function clearCache(key) {
  try { await AsyncStorage.removeItem(PREFIX + key); } catch {}
}

export const CACHE_KEYS = {
  properties: 'properties.v1',
};
