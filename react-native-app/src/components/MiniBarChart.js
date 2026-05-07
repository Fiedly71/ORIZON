// MiniBarChart - graphique en barres simple sans dependance externe.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, radii, spacing } from '../theme/colors';

export default function MiniBarChart({ data = [], labels = [], height = 100, color = C.primary }) {
  const max = Math.max(1, ...data);
  return (
    <View>
      <View style={[styles.row, { height }]}>
        {data.map((v, i) => (
          <View key={i} style={styles.colWrap}>
            <Text style={styles.val}>{v > 0 ? v : ''}</Text>
            <View style={[styles.bar, { height: Math.max(2, (v / max) * (height - 20)), backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.lbl}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  colWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm, minHeight: 2 },
  val: { fontSize: 10, color: C.muted, marginBottom: 2 },
  lbl: { flex: 1, textAlign: 'center', fontSize: 10, color: C.muted, marginTop: 4 },
});
