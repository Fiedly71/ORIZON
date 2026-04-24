// Service de notifications push ORIZON.
// - registerForPushAsync() demande la permission, recupere le ExpoPushToken,
//   et l'enregistre dans la table 'push_tokens' (Supabase) si l'utilisateur est connecte.
// - Mode mock: pas de Supabase -> token retourne mais non sauvegarde.
// - notifyLocal() envoie une notif locale immediate (utile pour alertes critere).
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function registerForPushAsync() {
  if (!Device.isDevice) {
    return { ok: false, error: 'Les notifications push necessitent un appareil reel.' };
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return { ok: false, error: 'Permission refusee' };

  let token;
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }

  // Enregistrer cote serveur
  const user = useAuthStore.getState().user;
  if (isSupabaseConfigured && user?.id) {
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
  }

  return { ok: true, token };
}

export async function notifyLocal({ title, body, data }) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {} },
    trigger: null,
  });
}

// Verifie si un nouveau bien matche les criteres d'alerte de l'utilisateur.
// criteria: { type, status, minPrice, maxPrice, bedrooms }
export function matchesCriteria(property, criteria) {
  if (!property || !criteria) return false;
  if (criteria.type && criteria.type !== 'Tous' && property.type !== criteria.type) return false;
  if (criteria.status && criteria.status !== 'Tous' && property.status !== criteria.status) return false;
  if (criteria.minPrice && property.price < Number(criteria.minPrice)) return false;
  if (criteria.maxPrice && property.price > Number(criteria.maxPrice)) return false;
  if (criteria.bedrooms && property.bedrooms < Number(criteria.bedrooms)) return false;
  return true;
}
