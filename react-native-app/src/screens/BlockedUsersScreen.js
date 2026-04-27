// Ecran de gestion des utilisateurs bloques.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { listBlocked, unblockUser } from '../services/blocksService';

export default function BlockedUsersScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listBlocked();
    setItems(r.ok ? r.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onUnblock = (id) => {
    Alert.alert('Debloquer ?', 'Tu reverras a nouveau les annonces de cet utilisateur.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Debloquer', onPress: async () => {
          const r = await unblockUser(id);
          if (!r.ok) Alert.alert('Erreur', r.error || 'Echec');
          load();
        } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Utilisateurs bloques</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.blocked_id || i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ban-outline" size={42} color={C.muted} />
            <Text style={styles.emptyTxt}>Aucun utilisateur bloque.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        renderItem={({ item }) => {
          const id = item.blocked_id || item;
          return (
            <View style={styles.row}>
              <View style={styles.avatar}><Ionicons name="person" size={18} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{String(id).slice(0, 12)}…</Text>
                {item.reason ? <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text> : null}
              </View>
              <Pressable style={styles.btn} onPress={() => onUnblock(id)}>
                <Text style={styles.btnTxt}>Debloquer</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyTxt: { color: C.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.muted,
    alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: C.text },
  reason: { fontSize: 11, color: C.muted, marginTop: 2 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.primarySoft },
  btnTxt: { fontSize: 12, fontWeight: '700', color: C.primary },
});
