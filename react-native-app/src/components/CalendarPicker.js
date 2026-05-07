// CalendarPicker - calendrier mensuel simple (sans lib externe).
// Selectionne 1 ou 2 dates (range). Locale FR.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';

const MONTHS_FR = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
const DAYS_FR = ['L','M','M','J','V','S','D'];

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(y, m) { return new Date(y, m, 1); }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

export default function CalendarPicker({ value, onChange, mode = 'single', minDate }) {
  // value: 'YYYY-MM-DD' (single) | { start, end } (range)
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const min = minDate ? new Date(minDate) : today;

  const [cursor, setCursor] = useState(() => {
    const ref = mode === 'single' && value ? new Date(value) : today;
    return { y: ref.getFullYear(), m: ref.getMonth() };
  });

  const goPrev = () => {
    const d = new Date(cursor.y, cursor.m - 1, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goNext = () => {
    const d = new Date(cursor.y, cursor.m + 1, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const onSelect = (d) => {
    if (d < min) return;
    if (mode === 'single') {
      onChange?.(ymd(d));
      return;
    }
    // range
    const v = value || {};
    if (!v.start || (v.start && v.end)) {
      onChange?.({ start: ymd(d), end: null });
    } else if (d < new Date(v.start)) {
      onChange?.({ start: ymd(d), end: null });
    } else {
      onChange?.({ start: v.start, end: ymd(d) });
    }
  };

  const cells = useMemo(() => {
    const first = startOfMonth(cursor.y, cursor.m);
    // weekday: Mon=0..Sun=6
    const wk = (first.getDay() + 6) % 7;
    const total = daysInMonth(cursor.y, cursor.m);
    const arr = [];
    for (let i = 0; i < wk; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(new Date(cursor.y, cursor.m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const isSelected = (d) => {
    if (!d) return false;
    if (mode === 'single') return value === ymd(d);
    if (!value?.start) return false;
    if (!value?.end) return ymd(d) === value.start;
    return ymd(d) >= value.start && ymd(d) <= value.end;
  };
  const isEdge = (d) => {
    if (!d || mode === 'single') return false;
    return ymd(d) === value?.start || ymd(d) === value?.end;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={goPrev} hitSlop={10}><Ionicons name="chevron-back" size={20} color={C.text} /></Pressable>
        <Text style={styles.headerTxt}>{MONTHS_FR[cursor.m]} {cursor.y}</Text>
        <Pressable onPress={goNext} hitSlop={10}><Ionicons name="chevron-forward" size={20} color={C.text} /></Pressable>
      </View>

      <View style={styles.daysHeader}>
        {DAYS_FR.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d, i) => {
          const sel = isSelected(d);
          const edge = isEdge(d);
          const past = d && d < min;
          return (
            <Pressable
              key={i}
              style={[
                styles.cell,
                sel && !edge && styles.cellSel,
                edge && styles.cellEdge,
              ]}
              onPress={() => d && onSelect(d)}
              disabled={!d || past}
            >
              {d ? (
                <Text style={[
                  styles.cellTxt,
                  past && styles.cellPast,
                  sel && !edge && styles.cellTxtSel,
                  edge && styles.cellTxtEdge,
                ]}>{d.getDate()}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = 14.28; // % approx
const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: spacing.lg,
  },
  headerTxt: { fontSize: 16, fontWeight: '700', color: C.text },
  daysHeader: { flexDirection: 'row', paddingHorizontal: spacing.xs, marginBottom: 6 },
  dayLabel: { width: `${CELL}%`, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${CELL}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  cellSel: { backgroundColor: C.primarySoft },
  cellEdge: { backgroundColor: C.primary, borderRadius: radii.pill },
  cellTxt: { fontSize: 14, color: C.text },
  cellTxtSel: { color: C.primary, fontWeight: '700' },
  cellTxtEdge: { color: '#fff', fontWeight: '700' },
  cellPast: { color: C.border },
});
