// AdvancedFilterSheet - Modal filtres avances : prix, chambres, sdb, surface, type bien.
import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';

const TYPES = ['Villa','Appartement','Maison','Penthouse','Studio','Terrain','Commercial'];

export default function AdvancedFilterSheet({ visible, onClose, value, onApply }) {
  const [f, setF] = useState(value || {
    minPrice: '', maxPrice: '',
    minBeds: 0, minBaths: 0,
    minArea: '', maxArea: '',
    types: [],
    superhostOnly: false,
  });

  const toggleType = (t) => {
    setF((prev) => ({
      ...prev,
      types: prev.types.includes(t) ? prev.types.filter(x => x !== t) : [...prev.types, t],
    }));
  };

  const reset = () => setF({
    minPrice: '', maxPrice: '', minBeds: 0, minBaths: 0,
    minArea: '', maxArea: '', types: [], superhostOnly: false,
  });

  const apply = () => {
    onApply?.(f);
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Filtres</Text>
          <Pressable onPress={reset} hitSlop={10}>
            <Text style={styles.resetTxt}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.h2}>Prix (USD)</Text>
          <View style={styles.row}>
            <TextInput
              value={f.minPrice} onChangeText={(v) => setF({...f, minPrice: v})}
              placeholder="Min" placeholderTextColor={C.muted}
              keyboardType="numeric" style={styles.input}
            />
            <Text style={styles.dash}>â€”</Text>
            <TextInput
              value={f.maxPrice} onChangeText={(v) => setF({...f, maxPrice: v})}
              placeholder="Max" placeholderTextColor={C.muted}
              keyboardType="numeric" style={styles.input}
            />
          </View>

          <Text style={styles.h2}>Chambres min</Text>
          <Stepper value={f.minBeds} onChange={(v) => setF({...f, minBeds: v})} />

          <Text style={styles.h2}>Salles de bain min</Text>
          <Stepper value={f.minBaths} onChange={(v) => setF({...f, minBaths: v})} />

          <Text style={styles.h2}>Surface (mÂ²)</Text>
          <View style={styles.row}>
            <TextInput
              value={f.minArea} onChangeText={(v) => setF({...f, minArea: v})}
              placeholder="Min" placeholderTextColor={C.muted}
              keyboardType="numeric" style={styles.input}
            />
            <Text style={styles.dash}>â€”</Text>
            <TextInput
              value={f.maxArea} onChangeText={(v) => setF({...f, maxArea: v})}
              placeholder="Max" placeholderTextColor={C.muted}
              keyboardType="numeric" style={styles.input}
            />
          </View>

          <Text style={styles.h2}>Type de bien</Text>
          <View style={styles.chipsRow}>
            {TYPES.map((t) => {
              const active = f.types.includes(t);
              return (
                <Pressable key={t} onPress={() => toggleType(t)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.toggleRow}
            onPress={() => setF({...f, superhostOnly: !f.superhostOnly})}
          >
            <Ionicons
              name={f.superhostOnly ? 'checkbox' : 'square-outline'}
              size={22} color={f.superhostOnly ? C.primary : C.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Hotes Superhost uniquement</Text>
              <Text style={styles.toggleSub}>Note â‰¥ 4.7 et profil verifie</Text>
            </View>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.cta} onPress={apply}>
            <Text style={styles.ctaTxt}>Voir les resultats</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Stepper({ value, onChange }) {
  return (
    <View style={styles.stepper}>
      {['Tout', 1, 2, 3, '4+'].map((opt, i) => {
        const v = opt === 'Tout' ? 0 : (opt === '4+' ? 4 : opt);
        const active = value === v;
        return (
          <Pressable
            key={i}
            style={[styles.stepBtn, active && styles.stepBtnActive]}
            onPress={() => onChange(v)}
          >
            <Text style={[styles.stepTxt, active && styles.stepTxtActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  resetTxt: { color: C.text, fontSize: 14, textDecorationLine: 'underline' },
  body: { padding: spacing.xxl, paddingBottom: 100 },
  h2: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: spacing.xxl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: C.text,
  },
  dash: { color: C.muted, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { color: C.text, fontWeight: '600', fontSize: 13 },
  chipTxtActive: { color: '#fff' },
  stepper: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  stepBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: C.border, minWidth: 50, alignItems: 'center',
  },
  stepBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  stepTxt: { color: C.text, fontWeight: '600' },
  stepTxtActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.lg, marginTop: spacing.xxl,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  toggleSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.xxl, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: {
    backgroundColor: C.primary, paddingVertical: spacing.lg,
    borderRadius: radii.md, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
