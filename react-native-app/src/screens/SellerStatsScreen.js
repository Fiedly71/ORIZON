// SellerStatsScreen - Dashboard vendeur (vues / contacts / favoris / boost).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { getMyStats } from '../services/statsService';
import { boostListing, BOOST_PLANS } from '../services/premiumService';
import { getEventsLast7Days } from '../services/statsHistoryService';
import MiniBarChart from '../components/MiniBarChart';
import { useUI } from '../store/useUI';

export default function SellerStatsScreen({ navigation }) {
  const currency = useUI((s) => s.currency);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [history, setHistory] = useState(null);

  const load = async () => {
    setLoading(true);
    const r = await getMyStats();
    setItems(r.data || []);
    const h = await getEventsLast7Days();
    if (h.ok) setHistory(h);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const askBoost = (item) => {
    Alert.alert(
      'Booster ' + item.title,
      'Choisis la duree du boost premium (top de liste).',
      [
        { text: 'Annuler', style: 'cancel' },
        ...Object.entries(BOOST_PLANS).map(([key, plan]) => ({
          text: `${plan.label} - ${currency === 'HTG' ? plan.amountHtg + ' HTG' : '$' + plan.amountUsd}`,
          onPress: async () => {
            setBusyId(item.property_id);
            const r = await boostListing({ propertyId: item.property_id, planKey: key, currency });
            setBusyId(null);
            if (r.ok) {
              Alert.alert('ORIZON', `Boost active pour ${r.days} jours.`);
              load();
            } else {
              Alert.alert('Erreur', r.error || 'Echec boost');
            }
          },
        })),
      ]
    );
  };

  const totals = items.reduce((acc, it) => ({
    views: acc.views + (it.views_count || 0),
    contacts: acc.contacts + (it.contacts_count || 0),
    favs: acc.favs + (it.favorites_count || 0),
  }), { views: 0, contacts: 0, favs: 0 });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Statistiques vendeur</Text>
        <Pressable onPress={load} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={C.text} />
        </Pressable>
      </View>

      <View style={styles.kpis}>
        <Kpi icon="eye-outline" value={totals.views} label="Vues" />
        <Kpi icon="call-outline" value={totals.contacts} label="Contacts" />
        <Kpi icon="heart-outline" value={totals.favs} label="Favoris" />
      </View>

      {history && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Vues - 7 derniers jours</Text>
          <MiniBarChart data={history.views} labels={history.labels} color={C.primary} />
          <Text style={[styles.chartTitle, { marginTop: 12 }]}>Contacts - 7 derniers jours</Text>
          <MiniBarChart data={history.contacts} labels={history.labels} color={C.gold || '#F5B301'} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.property_id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Tu n'as pas encore d'annonce publiee.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                {item.is_premium && (
                  <View style={styles.badge}>
                    <Ionicons name="flame" size={11} color="#fff" />
                    <Text style={styles.badgeTxt}>Boost</Text>
                  </View>
                )}
              </View>

              <View style={styles.metrics}>
                <Metric label="Vues" value={item.views_count} />
                <Metric label="Contacts" value={item.contacts_count} />
                <Metric label="Favoris" value={item.favorites_count} />
              </View>

              {item.is_premium && item.premium_until ? (
                <Text style={styles.premiumHint}>
                  Premium jusqu'au {new Date(item.premium_until).toLocaleDateString('fr-FR')}
                </Text>
              ) : null}

              <Pressable
                style={[styles.boostBtn, busyId === item.property_id && { opacity: 0.5 }]}
                disabled={busyId === item.property_id}
                onPress={() => askBoost(item)}
              >
                <Ionicons name="rocket-outline" size={14} color="#fff" />
                <Text style={styles.boostTxt}>
                  {busyId === item.property_id ? 'Traitement...' : 'Booster cette annonce'}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Kpi({ icon, value, label }) {
  return (
    <View style={styles.kpi}>
      <Ionicons name={icon} size={18} color={C.primary} />
      <Text style={styles.kpiVal}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricVal}>{value || 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  chartCard: { margin: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  chartTitle: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, letterSpacing: 0.5 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  empty: { textAlign: 'center', color: C.muted, marginTop: 24 },

  kpis: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
  },
  kpi: {
    flex: 1, alignItems: 'center', gap: 4,
    padding: 12, borderRadius: 12, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  kpiVal: { fontSize: 18, fontWeight: '800', color: C.text },
  kpiLabel: { fontSize: 11, color: C.muted },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: C.gold,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },

  metrics: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: C.surface, borderRadius: 10 },
  metricVal: { fontSize: 16, fontWeight: '800', color: C.text },
  metricLabel: { fontSize: 11, color: C.muted },

  premiumHint: { fontSize: 11, color: C.gold, fontWeight: '600' },

  boostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, paddingVertical: 10, borderRadius: 10,
  },
  boostTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
