// SavedSearchesScreen - Liste des recherches enregistrees + alerte d'activite.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import {
  listSavedSearches, deleteSavedSearch, countMatches,
} from '../services/savedSearchesService';

export default function SavedSearchesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listSavedSearches();
    if (r.ok) {
      setItems(r.data);
      const cs = {};
      for (const s of r.data) {
        const c = await countMatches(s.id);
        if (c.ok) cs[s.id] = c.count;
      }
      setCounts(cs);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette recherche sauvegardee ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const r = await deleteSavedSearch(id);
        if (r.ok) load();
      } },
    ]);
  };

  const openSearch = (s) => {
    navigation.navigate('App', { screen: 'Explore', params: { initialFilters: s.criteria } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Mes alertes</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={48} color={C.muted} />
              <Text style={{ marginTop: spacing.lg, color: C.muted, textAlign: 'center', paddingHorizontal: 30 }}>
                Aucune recherche sauvegardee. Lance une recherche dans Explorer puis touche
                "Sauvegarder" pour recevoir une alerte des nouvelles annonces.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={{ flex: 1 }} onPress={() => openSearch(item)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {summarize(item.criteria)}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.chip, { backgroundColor: counts[item.id] > 0 ? '#DCFCE7' : C.surface }]}>
                    <Text style={[styles.chipTxt, { color: counts[item.id] > 0 ? '#15803D' : C.muted }]}>
                      {counts[item.id] || 0} resultat{(counts[item.id] || 0) > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: C.surface }]}>
                    <Text style={[styles.chipTxt, { color: C.text }]}>
                      Frequence : {item.frequency}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Pressable style={styles.del} onPress={() => onDelete(item.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={C.danger} />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function summarize(c = {}) {
  const parts = [];
  if (c.q) parts.push(`"${c.q}"`);
  if (c.type) parts.push(c.type);
  if (c.status) parts.push(c.status);
  if (c.minPrice || c.maxPrice) parts.push(`$${c.minPrice || 0} - $${c.maxPrice || '∞'}`);
  if (c.beds) parts.push(`${c.beds}+ ch`);
  if (c.city) parts.push(c.city);
  return parts.join(' · ') || 'Tous les biens';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: radii.lg,
    borderWidth: 1, borderColor: C.border, padding: spacing.lg, marginBottom: spacing.lg,
    alignItems: 'center', gap: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },
  chipTxt: { fontSize: 11.5, fontWeight: '600' },
  del: { padding: spacing.md },
});
