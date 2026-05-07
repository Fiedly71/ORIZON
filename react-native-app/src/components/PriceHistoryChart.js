// PriceHistoryChart - mini courbe de l'evolution du prix d'un bien.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, radii, spacing } from '../theme/colors';
import { listPriceHistory } from '../services/priceHistoryService';
import MiniBarChart from './MiniBarChart';

export default function PriceHistoryChart({ propertyId, currentPrice }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!propertyId) return;
    listPriceHistory(propertyId).then((r) => {
      if (r.ok && r.data?.length > 0) setData(r.data);
    });
  }, [propertyId]);

  if (!data || data.length < 2) return null;

  const sorted = [...data].sort((a, b) => new Date(a.noted_at) - new Date(b.noted_at));
  const last8 = sorted.slice(-8);
  const prices = last8.map((p) => Number(p.price));
  const labels = last8.map((p) => {
    const d = new Date(p.noted_at);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const first = prices[0];
  const last = prices[prices.length - 1];
  const delta = ((last - first) / first) * 100;
  const up = delta >= 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Evolution du prix</Text>
        <Text style={[styles.delta, { color: up ? C.success : C.danger }]}>
          {up ? '+' : ''}{delta.toFixed(1)}%
        </Text>
      </View>
      <MiniBarChart data={prices} labels={labels} color={up ? C.success : C.danger} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.surface, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  delta: { fontSize: 14, fontWeight: '800' },
});
