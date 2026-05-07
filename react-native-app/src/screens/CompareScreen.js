// CompareScreen - Compare 2 ou 3 annonces cote a cote.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import { getProperty } from '../services/propertiesService';

const ROWS = [
  { key: 'price', label: 'Prix', fmt: (v) => `$${Number(v || 0).toLocaleString()}` },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Statut' },
  { key: 'location', label: 'Localisation' },
  { key: 'bedrooms', label: 'Chambres' },
  { key: 'bathrooms', label: 'SDB' },
  { key: 'area', label: 'Surface (m2)' },
  { key: 'amenities', label: 'Equipements', fmt: (v) => Array.isArray(v) ? `${v.length} elem.` : '-' },
];

export default function CompareScreen({ route, navigation }) {
  const { ids = [] } = route.params || {};
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all(ids.slice(0, 3).map((id) => getProperty(id)))
      .then((results) => setItems(results.filter((r) => r.ok).map((r) => r.data)));
  }, [ids]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Comparer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.row}>
          {items.map((it) => (
            <View key={it.id} style={styles.col}>
              <Image source={{ uri: it.image }} style={styles.thumb} />
              <Text style={styles.name} numberOfLines={2}>{it.title}</Text>
            </View>
          ))}
        </View>

        {ROWS.map((r) => (
          <View key={r.key} style={styles.dataRow}>
            <Text style={styles.lbl}>{r.label}</Text>
            <View style={styles.row}>
              {items.map((it) => (
                <Text key={it.id} style={styles.val}>
                  {r.fmt ? r.fmt(it[r.key]) : (it[r.key] ?? '-')}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  thumb: { width: '100%', height: 120, borderRadius: radii.md, backgroundColor: C.surface },
  name: { fontSize: 12.5, fontWeight: '700', color: C.text, marginTop: spacing.md, textAlign: 'center' },
  dataRow: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: C.border },
  lbl: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5, marginBottom: 6 },
  val: { flex: 1, fontSize: 13, color: C.text, textAlign: 'center', fontWeight: '600' },
});
