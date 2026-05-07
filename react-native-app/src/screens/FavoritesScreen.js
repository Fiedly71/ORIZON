// FavoritesScreen - liste des biens favoris de l'utilisateur connecte.
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { useFavorites } from '../store/useFavorites';
import { useProperty } from '../store/useProperty';
import EmptyState from '../components/EmptyState';

export default function FavoritesScreen({ navigation }) {
  const ids = useFavorites((s) => s.ids);
  const load = useFavorites((s) => s.load);
  const toggle = useFavorites((s) => s.toggle);
  const properties = useProperty((s) => s.properties);
  const loadProps = useProperty((s) => s.loadProperties);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
    loadProps?.();
  }, []);

  const items = properties.filter((p) => ids.includes(p.id));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
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
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Aucun favori"
            message="Touche le coeur sur une annonce pour l'enregistrer ici."
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
