// ExploreScreen - Home Airbnb-style avec :
//  - Header sticky : barre de recherche ronde + filtres
//  - Pills de categories scrollables horizontales
//  - Feed vertical de PropertyCardAirbnb
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import PropertyCardAirbnb from '../components/PropertyCardAirbnb';
import AdvancedFilterSheet from '../components/AdvancedFilterSheet';
import SkeletonCard from '../components/SkeletonCard';
import { saveSearch } from '../services/savedSearchesService';
import { useToast } from '../components/Toast';
import { getCurrentPosition, distanceKm } from '../services/locationService';
import { listProperties } from '../services/propertiesService';
import { SECTIONS, getSectionItems } from '../services/sectionsService';
import HorizontalSection from '../components/HorizontalSection';
import { useFavorites } from '../store/useFavorites';
import { isSuperhost } from '../utils/superhost';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import Container from '../components/Container';

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

const SORTS = [
  { key: 'recent', label: 'Plus recent', icon: 'time-outline' },
  { key: 'price_asc', label: 'Prix croissant', icon: 'arrow-up' },
  { key: 'price_desc', label: 'Prix decroissant', icon: 'arrow-down' },
  { key: 'near', label: 'Pres de moi', icon: 'navigate' },
];

export default function ExploreScreen({ navigation }) {
  const toast = useToast();
  const r = useResponsive();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [advFilter, setAdvFilter] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState('recent');
  const [myPos, setMyPos] = useState(null);

  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);

  // Scroll-to-top
  const listRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const onListScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(y > 600);
  }, []);
  const scrollToTop = useCallback(() => {
    try { listRef.current?.scrollToOffset?.({ offset: 0, animated: true }); } catch {}
  }, []);

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

  // Banner "Email confirme" apres clic sur le lien dans l'email de verification.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('email_confirmed') === '1') {
        toast?.show?.('Email confirme. Bienvenue sur ORIZON.');
        url.searchParams.delete('email_confirmed');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    } catch (_) {}
  }, [toast]);

  // Realtime : refresh la liste quand une annonce est cree, modifiee ou supprimee.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ch = supabase
      .channel('properties-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => load())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [load]);

  const filtered = useMemo(() => {
    let out = items;
    if (category !== 'all') {
      out = out.filter((p) =>
        (p.type || '').toLowerCase() === category.toLowerCase()
      );
    }    if (status !== 'all') {
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
    // Tri
    if (sortKey === 'price_asc') out = [...out].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortKey === 'price_desc') out = [...out].sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortKey === 'near' && myPos) {
      out = [...out]
        .filter((p) => p.lat && p.lng)
        .map((p) => ({ ...p, _dist: distanceKm(myPos, { lat: p.lat, lng: p.lng }) }))
        .sort((a, b) => a._dist - b._dist);
    }
    return out;
  }, [items, category, status, search, advFilter, sortKey, myPos]);

  const onSelectSort = async (key) => {
    if (key === 'near') {
      const r = await getCurrentPosition();
      if (!r.ok) { toast.show('Geolocalisation refusee', { type: 'error' }); return; }
      setMyPos(r.coords);
    }
    setSortKey(key);
  };

  // Mode "sections" : actif quand aucun filtre n'est applique.
  const isFiltering =
    !!search.trim() || category !== 'all' || status !== 'all' ||
    (advFilter && Object.keys(advFilter).length > 0) || sortKey !== 'recent';

  const sectionsToShow = useMemo(() => {
    if (isFiltering || items.length === 0) return [];
    return SECTIONS
      .map((s) => ({ section: s, items: getSectionItems(s, items, myPos, 8) }))
      .filter((x) => x.items.length > 0);
  }, [items, isFiltering, myPos]);

  // Au mount, on tente de geolocaliser silencieusement pour activer "A proximite"
  useEffect(() => {
    getCurrentPosition().then((r) => { if (r.ok) setMyPos(r.coords); }).catch(() => {});
  }, []);

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      {/* Logo ORIZON + Search bar ronde */}
      <View style={styles.searchRow}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/logo2.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={C.text} />
          <TextInput
            placeholder="Ou ?  Quand ?  Combien ?"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </Pressable>
          )}
          <Pressable
            style={styles.filterBtn}
            onPress={() => setFilterOpen(true)}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={18} color={C.text} />
          </Pressable>
        </View>
      </View>

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
        {(search || category !== 'all' || status !== 'all' || advFilter) && (
          <Pressable
            style={styles.saveSearchBtn}
            onPress={async () => {
              const criteria = { q: search || undefined, type: category !== 'all' ? category : undefined, status: status !== 'all' ? status : undefined, ...(advFilter || {}) };
              const name = (search || category !== 'all' ? `${search || category}` : 'Mes filtres');
              const r = await saveSearch({ name, criteria, frequency: 'daily' });
              toast.show(r.ok ? 'Recherche sauvegardee' : (r.error || 'Echec'), { type: r.ok ? 'success' : 'error' });
            }}
          >
            <Ionicons name="bookmark-outline" size={14} color={C.primary} />
            <Text style={styles.saveSearchTxt}>Sauvegarder</Text>
          </Pressable>
        )}
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

      {/* Tri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORTS.map((s) => {
          const active = sortKey === s.key;
          return (
            <Pressable key={s.key} onPress={() => onSelectSort(s.key)} style={[styles.sortPill, active && styles.sortPillActive]}>
              <Ionicons name={s.icon} size={13} color={active ? '#fff' : C.text} />
              <Text style={[styles.sortTxt, active && { color: '#fff' }]}>{s.label}</Text>
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
        <View style={{ paddingTop: spacing.lg }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Container padded={false}>{renderHeader()}</Container>
      {!isFiltering && sectionsToShow.length > 0 ? (
        <FlatList
          ref={listRef}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          data={sectionsToShow}
          keyExtractor={(x) => x.section.id}
          renderItem={({ item }) => (
            <Container>
              <HorizontalSection
                section={item.section}
                items={item.items}
                isFavorite={(id) => favIds.includes(id)}
                onFavorite={(id) => toggleFav(id)}
                onItemPress={(it) => navigation.navigate('PropertyDetail', { id: it.id, item: it })}
                onSeeAll={() => navigation.navigate('SectionDetail', { sectionId: item.section.id })}
              />
            </Container>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[C.primary]} tintColor={C.primary} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      ) : (
        <FlatList
          ref={listRef}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          data={filtered}
          key={`grid-${r.columns}`}
          numColumns={r.columns}
          columnWrapperStyle={r.columns > 1 ? { gap: r.gap, paddingHorizontal: r.sidePadding, justifyContent: 'flex-start', alignSelf: 'center', width: r.contentWidth } : undefined}
          keyExtractor={(it) => String(it.id)}
          stickyHeaderIndices={[]}
          renderItem={({ item }) => (
            <View style={r.columns === 1 ? styles.cardWrap : { marginBottom: spacing.xxl }}>
              <PropertyCardAirbnb
                item={item}
                width={r.columns > 1 ? r.cardWidth : undefined}
                isFavorite={favIds.includes(item.id)}
                onFavorite={(id) => toggleFav(id)}
                onOpen={(it) => navigation.navigate('PropertyDetail', { id: it.id, item: it })}
              />
            </View>
          )}
          ListEmptyComponent={
            isFiltering ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={48} color={C.muted} />
                <Text style={styles.emptyTitle}>Aucun bien trouve</Text>
                <Text style={styles.emptyTxt}>Modifie tes filtres ou ta recherche.</Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => {
                    setSearch(''); setCategory('all'); setStatus('all');
                    setAdvFilter(null); setSortKey('recent');
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.emptyBtnTxt}>Reinitialiser les filtres</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="home-outline" size={56} color={C.primary} />
                <Text style={styles.emptyTitle}>Bienvenue sur ORIZON</Text>
                <Text style={styles.emptyTxt}>
                  De nouvelles annonces arrivent chaque jour. Reviens bientot ou publie ta propre annonce en 2 minutes.
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('SellWizard')}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.emptyBtnTxt}>Publier mon annonce</Text>
                </Pressable>
              </View>
            )
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
          contentContainerStyle={{ paddingBottom: spacing.xxl, alignItems: r.columns === 1 ? 'stretch' : 'center' }}
        />
      )}

      <AdvancedFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={advFilter}
        onApply={setAdvFilter}
      />

      {showScrollTop && (
        <Pressable
          onPress={scrollToTop}
          style={styles.scrollTopBtn}
          accessibilityLabel="Remonter en haut"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
        </Pressable>
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchBar: {
    flex: 1,
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
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
    paddingVertical: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  clearBtn: {
    padding: 2,
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
  saveSearchBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: C.primary,
  },
  saveSearchTxt: { color: C.primary, fontSize: 12, fontWeight: '700' },
  sortRow: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, gap: spacing.md, flexDirection: 'row' },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: C.surface },
  sortPillActive: { backgroundColor: C.primary },
  sortTxt: { fontSize: 12, fontWeight: '600', color: C.text },
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
  scrollTopBtn: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl + 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50,
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
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyTxt: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  emptyBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  emptyBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
