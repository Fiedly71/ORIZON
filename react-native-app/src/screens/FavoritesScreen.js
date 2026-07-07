// FavoritesScreen - liste des biens favoris de l'utilisateur connecte.
// Fetche les properties par ids depuis Supabase (independant du cache local).
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { useFavorites } from '../store/useFavorites';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useProperty } from '../store/useProperty';
import EmptyState from '../components/EmptyState';

export default function FavoritesScreen({ navigation }) {
  const ids = useFavorites((s) => s.ids);
  const load = useFavorites((s) => s.load);
  const toggle = useFavorites((s) => s.toggle);
  const cacheProps = useProperty((s) => s.properties);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (currentIds) => {
    if (!currentIds || currentIds.length === 0) { setItems([]); return; }
    // Fallback cache local immediatement pour l'UX
    const fromCache = cacheProps.filter((p) => currentIds.includes(p.id));
    if (fromCache.length > 0) setItems(fromCache);
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id,title,location,price,image,images,status,bedrooms,bathrooms,area')
      .in('id', currentIds);
    setLoading(false);
    if (!error && data) {
      const mapped = data.map((r) => ({
        ...r,
        image: r.image || (Array.isArray(r.images) ? r.images[0] : ''),
      }));
      setItems(mapped);
    }
  }, [cacheProps]);

  useEffect(() => {
    (async () => {
      const r = await load();
      const currentIds = r?.ids || ids;
      fetchItems(currentIds);
    })();
  }, []);

  useEffect(() => {
    fetchItems(ids);
  }, [ids, fetchItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    const r = await load();
    await fetchItems(r?.ids || ids);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Mes favoris</Text>
        {items.length >= 2 ? (
          <Pressable onPress={() => navigation.navigate('Compare', { ids: items.slice(0, 3).map((it) => it.id) })} hitSlop={8}>
            <Ionicons name="git-compare-outline" size={22} color={C.primary} />
          </Pressable>
        ) : <View style={{ width: 22 }} />}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 16, gap: 12, width: '100%', maxWidth: 880, alignSelf: 'center' }}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Aucun favori"
            message="Touche le cœur sur une annonce pour l'enregistrer ici."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.img} />
            ) : (
              <View style={[styles.img, { backgroundColor: C.surface }]} />
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.loc} numberOfLines={1}>
                <Ionicons name="location-outline" size={11} color={C.muted} /> {item.location}
              </Text>
              <Text style={styles.price}>{Number(item.price).toLocaleString('fr-FR')} $</Text>
            </View>
            <Pressable onPress={() => toggle(item.id)} hitSlop={8}>
              <Ionicons name="heart" size={22} color={C.danger} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    backgroundColor: '#fff',
  },
  img: { width: 70, height: 70, borderRadius: 10 },
  name: { fontSize: 14, fontWeight: '700', color: C.text },
  loc: { fontSize: 11, color: C.muted },
  price: { fontSize: 13, fontWeight: '800', color: C.primary, marginTop: 2 },
});
