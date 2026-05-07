// ExploreScreen - Home Airbnb-style avec :
//  - Header sticky : barre de recherche ronde + filtres
//  - Pills de categories scrollables horizontales
//  - Feed vertical de PropertyCardAirbnb
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import PropertyCardAirbnb from '../components/PropertyCardAirbnb';
import AdvancedFilterSheet from '../components/AdvancedFilterSheet';
import { listProperties } from '../services/propertiesService';
import { useFavorites } from '../store/useFavorites';
import { isSuperhost } from '../utils/superhost';

const CATEGORIES = [
  { key: 'all',        label: 'Tout',        icon: 'apps-outline' },
  { key: 'Villa',      label: 'Villas',      icon: 'home-outline' },
  { key: 'Appartement',label: 'Appartements',icon: 'business-outline' },
  { key: 'Maison',     label: 'Maisons',     icon: 'home' },
  { key: 'Penthouse',  label: 'Penthouses',  icon: 'star-outline' },
  { key: 'Studio',     label: 'Studios',     icon: 'bed-outline' },
  { key: 'Terrain',    label: 'Terrains',    icon: 'leaf-outline' },
  { key: 'Commercial', label: 'Commercial',  icon: 'storefront-outline' },
];

const STATUS_FILTERS = [
  { key: 'all',  label: 'Tout' },
  { key: 'sale', label: 'A vendre', match: ['A vendre', 'A vann', 'sale', 'For sale'] },
  { key: 'rent', label: 'A louer',  match: ['A louer', 'A lwe', 'rent', 'For rent'] },
];

export default function ExploreScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [advFilter, setAdvFilter] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listProperties({ page: 0, pageSize: 60 });
      if (r.ok) setItems(r.data || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let out = items;
    if (category !== 'all') {
      out = out.filter((p) =>
        (p.type || '').toLowerCase() === category.toLowerCase()
      );
    }
    if (status !== 'all') {
      const sFilter = STATUS_FILTERS.find((s) => s.key === status);
      if (sFilter) {
        out = out.filter((p) => sFilter.match.includes(p.status));
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.type || '').toLowerCase().includes(q)
      );
    }
    if (advFilter) {
      const a = advFilter;
      if (a.minPrice) out = out.filter((p) => Number(p.price) >= Number(a.minPrice));
      if (a.maxPrice) out = out.filter((p) => Number(p.price) <= Number(a.maxPrice));
      if (a.minBeds > 0) out = out.filter((p) => Number(p.bedrooms || 0) >= a.minBeds);
      if (a.minBaths > 0) out = out.filter((p) => Number(p.bathrooms || 0) >= a.minBaths);
      if (a.minArea) out = out.filter((p) => Number(p.area || 0) >= Number(a.minArea));
      if (a.maxArea) out = out.filter((p) => Number(p.area || 0) <= Number(a.maxArea));
      if (a.types?.length > 0) out = out.filter((p) => a.types.includes(p.type));
      if (a.superhostOnly) out = out.filter(isSuperhost);
    }
    return out;
  }, [items, category, status, search, advFilter]);

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      {/* Search bar ronde */}
      <Pressable style={styles.searchBar}>
        <Ionicons name="search" size={20} color={C.text} />
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder="Ou ?  Quand ?  Combien ?"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setFilterOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={18} color={C.text} />
        </Pressable>
        <Pressable
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Map')}
          hitSlop={8}
        >
          <Ionicons name="map-outline" size={18} color={C.text} />
        </Pressable>
      </Pressable>

      {/* Filtres rapides A vendre / A louer */}
      <View style={styles.statusRow}>
        {STATUS_FILTERS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.statusPill, status === s.key && styles.statusPillActive]}
            onPress={() => setStatus(s.key)}
          >
            <Text style={[
              styles.statusTxt,
              status === s.key && styles.statusTxtActive,
            ]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Pills categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsRow}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={styles.catItem}
            >
              <Ionicons
                name={c.icon}
                size={22}
                color={active ? C.primary : C.muted}
              />
              <Text style={[
                styles.catLabel,
                active && styles.catLabelActive,
              ]}>{c.label}</Text>
              {active && <View style={styles.catUnderline} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingTxt}>Chargement des biens...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[]}
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
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color={C.muted} />
            <Text style={styles.emptyTitle}>Aucun bien trouve</Text>
            <Text style={styles.emptyTxt}>Modifie tes filtres ou ta recherche.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />

      <AdvancedFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={advFilter}
        onApply={setAdvFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  searchBar: {
    marginHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  statusPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  statusPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  statusTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  statusTxtActive: {
    color: '#fff',
  },
  catsRow: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.xxl,
    marginTop: spacing.xl,
    paddingBottom: 4,
  },
  catItem: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginTop: 4,
  },
  catLabelActive: {
    color: C.primary,
  },
  catUnderline: {
    height: 2,
    backgroundColor: C.primary,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardWrap: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingTxt: {
    color: C.muted,
    fontSize: 14,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: spacing.lg,
  },
  emptyTxt: {
    fontSize: 14,
    color: C.muted,
  },
});
