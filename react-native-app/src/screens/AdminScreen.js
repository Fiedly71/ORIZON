// AdminScreen - Back-office moderation in-app pour les admins.
// 3 tabs : Annonces en attente / Signalements / Tout
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  ActivityIndicator, Alert, TextInput, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import {
  listPendingProperties, moderateProperty, listReports,
} from '../services/adminService';

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'rejected', label: 'Rejetees' },
  { key: 'reports', label: 'Signalements' },
];

export default function AdminScreen({ navigation }) {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let r;
    if (tab === 'reports') r = await listReports();
    else r = await listPendingProperties({ status: tab });
    if (r.ok) setItems(r.data || []);
    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const onApprove = async (id) => {
    const r = await moderateProperty(id, 'approved');
    if (r.ok) { load(); }
    else Alert.alert('Erreur', r.error);
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    const r = await moderateProperty(rejectFor.id, 'rejected', reason || 'Non conforme');
    setRejectFor(null); setReason('');
    if (r.ok) load();
    else Alert.alert('Erreur', r.error);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Moderation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: spacing.lg }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Ionicons name="checkmark-done" size={42} color={C.success} />
              <Text style={{ marginTop: spacing.md, color: C.muted }}>Rien a moderer.</Text>
            </View>
          }
          renderItem={({ item }) => (
            tab === 'reports' ? (
              <ReportCard r={item} />
            ) : (
              <ModCard
                p={item}
                showActions={tab === 'pending'}
                onApprove={() => onApprove(item.id)}
                onReject={() => setRejectFor(item)}
              />
            )
          )}
        />
      )}

      <Modal visible={!!rejectFor} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Raison du rejet</Text>
            <TextInput
              value={reason} onChangeText={setReason}
              placeholder="Ex: Photos floues, prix incoherent, doublon..."
              placeholderTextColor={C.muted}
              multiline style={styles.modalInput}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: C.surface }]}
                onPress={() => { setRejectFor(null); setReason(''); }}
              >
                <Text style={{ color: C.text, fontWeight: '600' }}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: C.danger }]}
                onPress={submitReject}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Rejeter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ModCard({ p, showActions, onApprove, onReject }) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {p.photos?.[0] || p.image ? (
          <Image source={{ uri: p.photos?.[0] || p.image }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="image-outline" size={28} color={C.muted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{p.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{p.location}</Text>
          <Text style={styles.cardPrice}>${Number(p.price).toLocaleString()}</Text>
          {p.moderation_reason && (
            <Text style={styles.cardReason}>Raison : {p.moderation_reason}</Text>
          )}
        </View>
      </View>
      {showActions && (
        <View style={styles.cardActions}>
          <Pressable style={[styles.actBtn, { backgroundColor: C.success }]} onPress={onApprove}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.actTxt}>Approuver</Text>
          </Pressable>
          <Pressable style={[styles.actBtn, { backgroundColor: C.danger }]} onPress={onReject}>
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.actTxt}>Rejeter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ReportCard({ r }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Signalement #{String(r.id).slice(0, 8)}</Text>
      <Text style={styles.cardSub}>Cible : {r.target_type} {r.target_id}</Text>
      <Text style={styles.cardSub}>Motif : {r.reason}</Text>
      {r.note && <Text style={styles.cardReason}>{r.note}</Text>}
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
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  tabsRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.pill, backgroundColor: C.surface },
  tabActive: { backgroundColor: C.primary },
  tabTxt: { color: C.text, fontWeight: '600', fontSize: 13 },
  tabTxtActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: radii.lg, borderWidth: 1, borderColor: C.border,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  cardImg: { width: 80, height: 80, borderRadius: radii.md },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  cardPrice: { fontSize: 14, color: C.primary, fontWeight: '700', marginTop: 4 },
  cardReason: { fontSize: 12, color: C.danger, marginTop: 4, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: spacing.md, borderRadius: radii.md,
  },
  actTxt: { color: '#fff', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xxl },
  modalCard: { backgroundColor: '#fff', borderRadius: radii.lg, padding: spacing.xxl },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    padding: spacing.lg, marginTop: spacing.lg, minHeight: 80, color: C.text, textAlignVertical: 'top',
  },
  modalBtn: { flex: 1, paddingVertical: spacing.lg, borderRadius: radii.md, alignItems: 'center' },
});
