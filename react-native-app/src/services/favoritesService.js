// favoritesService - persistance des favoris.
// Mode reel: table public.favorites (Supabase, RLS user_id=auth.uid()).
// Mode mock: AsyncStorage (cle 'orizon.favorites').
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const STORAGE_KEY = 'orizon.favorites';

export async function listFavorites() {
  if (!isSupabaseConfigured) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return { ok: true, ids: raw ? JSON.parse(raw) : [], mock: true };
  }
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: true, ids: [] };
  const { data, error } = await supabase
    .from('favorites')
    .select('property_id')
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message, ids: [] };
  return { ok: true, ids: (data || []).map((r) => r.property_id) };
}

export async function addFavorite(propertyId) {
  if (!isSupabaseConfigured) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(propertyId)) ids.push(propertyId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    return { ok: true, mock: true };
  }
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'Non connecte' };
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: userId, property_id: propertyId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeFavorite(propertyId) {
  if (!isSupabaseConfigured) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const ids = (raw ? JSON.parse(raw) : []).filter((x) => x !== propertyId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    return { ok: true, mock: true };
  }
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return { ok: false, error: 'Non connecte' };
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleFavorite(propertyId, currentlyFav) {
  return currentlyFav ? removeFavorite(propertyId) : addFavorite(propertyId);
}
