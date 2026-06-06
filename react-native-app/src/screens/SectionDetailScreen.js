// SectionDetailScreen - "Voir tout" sur une section ORIZON (grille verticale).
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, spacing } from '../theme/colors';
import PropertyCardAirbnb from '../components/PropertyCardAirbnb';
import { useFavorites } from '../store/useFavorites';
import { getSectionById, getAllSectionItems, loadAllForSections } from '../services/sectionsService';
import { getCurrentPosition } from '../services/locationService';

export default function SectionDetailScreen({ route, navigation }) {
  const { sectionId } = route.params || {};
  const section = getSectionById(sectionId);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);

  useEffect(() => {
    (async () => {
      const all = await loadAllForSections();
      let pos = null;
      if (section?.requiresGeo || section?.id === 'nearby') {
        const r = await getCurrentPosition();
        if (r.ok) pos = r.coords;
      }
      setItems(getAllSectionItems(section, all, pos));
      setLoading(false);
    })();
  }, [sectionId]);

  if (!section) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.iconCircle, { backgroundColor: section.color + '22' }]}>
            <Ionicons name={section.icon} size={14} color={section.color} />
          </View>
          <Text style={styles.title}>{section.label}</Text>
        </View>
        <Text style={styles.count}>{items.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingBottom: spacing.xxl, paddingTop: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <PropertyCardAirbnb
                item={item}
                isFavorite={favIds.includes(item.id)}
                onFavorite={(id) => toggleFav(id)}
                onOpen={(it) => navigation.navigate('PropertyDetail', { id: it.id, item: it })}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={48} color={C.muted} />
              <Text style={{ color: C.muted, marginTop: 8 }}>Aucune annonce dans cette section</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: spacing.md,
  },
  iconCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  count: { fontSize: 13, color: C.muted, fontWeight: '600' },
  cardWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
});
