// Bottom sheet de filtres pour Discover. Inclut: type, statut, prix min/max,
// chambres min, sdb min. Branche sur useProperty.setFilters / resetFilters.
import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { C } from '../theme/colors';
import { useProperty } from '../store/useProperty';
import { propertyTypes } from '../data/mockData';

const STATUSES = ['Tous', 'A vendre', 'A louer'];
const TYPES = ['Tous', ...propertyTypes];

const FilterSheet = forwardRef(function FilterSheet(_, ref) {
  const sheet = useRef(null);
  const filters = useProperty((s) => s.filters);
  const setFilters = useProperty((s) => s.setFilters);
  const resetFilters = useProperty((s) => s.resetFilters);

  const snapPoints = useMemo(() => ['75%'], []);

  useImperativeHandle(ref, () => ({
    open: () => sheet.current?.expand(),
    close: () => sheet.current?.close(),
  }));

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <BottomSheet
      ref={sheet}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#fff' }}
      handleIndicatorStyle={{ backgroundColor: C.border, width: 48 }}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />}
    >
      <BottomSheetView style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.h}>Filtres</Text>
          <Pressable onPress={resetFilters} hitSlop={6}>
            <Text style={styles.reset}>Reinitialiser</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 16, gap: 14 }}>
          <Section label="TYPE">
            <ChipRow values={TYPES} selected={filters.type} onPick={(v) => update('type', v)} />
          </Section>

          <Section label="STATUT">
            <ChipRow values={STATUSES} selected={filters.status} onPick={(v) => update('status', v)} />
          </Section>

          <Section label="PRIX (USD)">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field placeholder="Min" value={filters.minPrice} onChangeText={(v) => update('minPrice', v)} />
              <Field placeholder="Max" value={filters.maxPrice} onChangeText={(v) => update('maxPrice', v)} />
            </View>
          </Section>

          <Section label="CHAMBRES MIN">
            <NumRow value={filters.bedrooms} onPick={(v) => update('bedrooms', v)} />
          </Section>

          <Section label="SDB MIN">
            <NumRow value={filters.bathrooms} onPick={(v) => update('bathrooms', v)} />
          </Section>
        </ScrollView>

        <Pressable style={styles.cta} onPress={() => sheet.current?.close()}>
          <Text style={styles.ctaTxt}>Appliquer</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
});

function Section({ label, children }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ values, selected, onPick }) {
  return (
    <View style={styles.chipWrap}>
      {values.map((v) => {
        const on = selected === v;
        return (
          <Pressable key={v} onPress={() => onPick(v)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{v}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NumRow({ value, onPick }) {
  const choices = ['', '1', '2', '3', '4', '5+'];
  return (
    <View style={styles.chipWrap}>
      {choices.map((v) => {
        const label = v === '' ? 'Tous' : v;
        const on = String(value || '') === v;
        return (
          <Pressable key={label} onPress={() => onPick(v === '5+' ? '5' : v)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field(props) {
  return (
    <TextInput
      keyboardType="number-pad"
      placeholderTextColor={C.muted}
      {...props}
      style={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  h: { fontSize: 16, fontWeight: '800', color: C.text },
  reset: { fontSize: 12, color: C.primary, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff' },
  chipOn: { borderColor: C.accent, backgroundColor: C.primarySoft },
  chipTxt: { fontSize: 11, color: C.muted, fontWeight: '600' },
  chipTxtOn: { color: C.primary },
  field: { flex: 1, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.text },
  cta: { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default FilterSheet;
