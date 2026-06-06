// Picker bottom-sheet simple, sans dependance externe.
// Web et mobile : ouvre une Modal avec une FlatList de choix filtrables.
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';

export default function PickerField({ label, value, placeholder, options, onChange, disabled, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={[styles.valueTxt, !value && { color: C.muted }]} numberOfLines={1}>
          {value || placeholder || 'Choisir...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? C.muted : C.text} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label || 'Choisir'}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.text} />
            </Pressable>
          </View>
          {searchable && options.length > 8 && (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher..."
                placeholderTextColor={C.muted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(s) => s}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <Pressable
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => { onChange(item); setOpen(false); setQuery(''); }}
                >
                  <Text style={[styles.rowTxt, selected && { color: C.primary, fontWeight: '700' }]}>{item}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color={C.primary} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>Aucun resultat pour "{query}"</Text>
              </View>
            }
            style={{ maxHeight: 420 }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inputDisabled: { opacity: 0.55 },
  valueTxt: { flex: 1, fontSize: 15, color: C.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 0 : 12,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 8, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, height: 40,
    borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },
  row: {
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  rowSelected: { backgroundColor: C.primarySoft || '#F1F5F9' },
  rowTxt: { fontSize: 15, color: C.text },
});
