// TripsScreen - Voyages : visites a venir + historique. Charge via visitsService.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, spacing, radii } from '../theme/colors';
import { listMyVisits, cancelVisit } from '../services/visitsService';

function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' a ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL = {
  requested: { txt: 'En attente', color: C.muted },
  confirmed: { txt: 'Confirmee', color: C.success },
  declined:  { txt: 'Refusee', color: C.danger },
  cancelled: { txt: 'Annulee', color: C.muted },
  completed: { txt: 'Terminee', color: C.primary },
  checked_in:{ txt: 'En cours', color: C.primary },
  no_show:   { txt: 'Non venu', color: C.danger },
};

export default function TripsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listMyVisits({ as: 'visitor' });
    if (r.ok) setItems(r.data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const upcoming = items.filter((v) => new Date(v.scheduledAt).getTime() >= now && !['cancelled','completed','no_show','declined'].includes(v.status));
  const past = items.filter((v) => !upcoming.includes(v));

  const onCancel = async (id) => {
    await cancelVisit(id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />
        }
      >
        <Text style={styles.h1}>Voyages</Text>

        {loading && items.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="airplane-outline" size={36} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune visite a venir</Text>
            <Text style={styles.emptyTxt}>
              Quand tu demanderas une visite, elle apparaitra ici.
            </Text>
            <Pressable style={styles.cta} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.ctaTxt}>Decouvrir des biens</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>A venir</Text>
                {upcoming.map((v) => (<VisitRow key={v.id} v={v} onCancel={onCancel} />))}
              </View>
            )}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Historique</Text>
                {past.map((v) => (<VisitRow key={v.id} v={v} />))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VisitRow({ v, onCancel }) {
  const st = STATUS_LABEL[v.status] || { txt: v.status, color: C.muted };
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Ionicons name="calendar" size={18} color={C.primary} />
        <Text style={styles.cardDate}>{fmt(v.scheduledAt)}</Text>
        <View style={[styles.statusPill, { borderColor: st.color }]}>
          <Text style={[styles.statusTxt, { color: st.color }]}>{st.txt}</Text>
        </View>
      </View>
      {v.notes ? <Text style={styles.cardNotes}>{v.notes}</Text> : null}
      {onCancel && v.status === 'requested' && (
        <Pressable style={styles.cancelBtn} onPress={() => onCancel(v.id)}>
          <Text style={styles.cancelTxt}>Annuler</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: spacing.xxl, gap: spacing.xxl, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '700', color: C.text },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl * 2, gap: spacing.lg },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center', maxWidth: 280 },
  cta: {
    marginTop: spacing.lg, backgroundColor: C.primary,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, borderRadius: radii.md,
  },
  ctaTxt: { color: '#fff', fontWeight: '700' },
  section: { gap: spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  card: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.lg,
    padding: spacing.lg, gap: spacing.md, backgroundColor: '#fff',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardDate: { flex: 1, fontWeight: '600', color: C.text },
  cardNotes: { color: C.muted, fontSize: 13 },
  statusPill: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radii.pill, borderWidth: 1,
  },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  cancelBtn: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.md, borderWidth: 1, borderColor: C.danger,
  },
  cancelTxt: { color: C.danger, fontWeight: '600' },
});
