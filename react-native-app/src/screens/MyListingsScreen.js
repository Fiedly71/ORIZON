// Section "Mes annonces" - liste les biens dont owner_id = utilisateur courant.
// Fetch direct Supabase pour inclure les annonces non payees / en attente / rejetees.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { deleteProperty } from '../services/propertiesService';
import EmptyState from '../components/EmptyState';

function statusBadge(p) {
  if (p.payment_status !== 'paid') return { label: 'Paiement requis', color: '#92400E', bg: '#FEF3C7' };
  if (p.moderation_status === 'pending') return { label: 'En moderation', color: '#1E40AF', bg: '#DBEAFE' };
  if (p.moderation_status === 'rejected') return { label: 'Rejetee', color: '#991B1B', bg: '#FEE2E2' };
  if (p.moderation_status === 'approved') return { label: 'En ligne', color: '#15803D', bg: '#DCFCE7' };
  return { label: 'Brouillon', color: '#525252', bg: '#F5F5F5' };
}

export default function MyListingsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) {
      setMine((data || []).map((r) => ({
        ...r,
        image: r.image || (Array.isArray(r.images) ? r.images[0] : ''),
      })));
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const onDelete = useCallback((item) => {
    const doDelete = async () => {
      const r = await deleteProperty(item.id);
      if (r.ok) {
        setMine((prev) => prev.filter((x) => x.id !== item.id));
      } else {
        Alert.alert('Suppression impossible', r.error || "Impossible de supprimer l'annonce. Reessaie.");
      }
    };
    if (Platform.OS === 'web') {
      // Alert.alert avec boutons ne fonctionne pas en web -> confirm natif.
      if (typeof window !== 'undefined' && window.confirm(`Supprimer definitivement "${item.title}" ?`)) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      'Supprimer cette annonce ?',
      `"${item.title}" sera definitivement supprimee. Cette action est irreversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ],
    );
  }, []);

  // Realtime : refresh quand une annonce change (paiement valide, moderation, etc.)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    const ch = supabase
      .channel('my-listings-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `owner_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user?.id, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Mes annonces" onBack={() => navigation.goBack()} right={
        <Pressable onPress={() => navigation.navigate('SellWizard')} hitSlop={8}>
          <Ionicons name="add" size={22} color={C.primary} />
        </Pressable>
      } />
      {loading ? (
        <View style={{ paddingTop: 60 }}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          ListEmptyComponent={<EmptyState icon="home-outline" title="Aucune annonce publiee" message="Publie ton premier bien en quelques minutes." ctaLabel="Publier une annonce" onCta={() => navigation.navigate('SellWizard')} />}
          renderItem={({ item }) => {
            const badge = statusBadge(item);
            return (
              <Pressable
                style={styles.card}
                onPress={() => item.payment_status === 'paid'
                  ? navigation.navigate('PropertyDetail', { id: item.id })
                  : navigation.navigate('Checkout', { propertyId: item.id, propertyTitle: item.title })}
              >
                <Image source={{ uri: item.image }} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{item.location}</Text>
                  <Text style={styles.price}>${(item.price || 0).toLocaleString()}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Pressable
                      style={styles.editBtn}
                      onPress={(e) => { e.stopPropagation?.(); navigation.navigate('SellWizard', { editId: item.id }); }}
                    >
                      <Ionicons name="create-outline" size={12} color={C.primary} />
                      <Text style={styles.editTxt}>Modifier</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={(e) => { e.stopPropagation?.(); onDelete(item); }}
                    >
                      <Ionicons name="trash-outline" size={12} color="#B91C1C" />
                      <Text style={styles.deleteTxt}>Supprimer</Text>
                    </Pressable>
                    {item.payment_status === 'paid' && item.moderation_status === 'approved' && (
                      <Pressable
                        style={styles.boostBtn}
                        onPress={(e) => { e.stopPropagation?.(); navigation.navigate('BoostListing', { propertyId: item.id, propertyTitle: item.title }); }}
                      >
                        <Ionicons name="rocket" size={12} color="#F5B301" />
                        <Text style={styles.boostTxt}>{item.is_premium ? 'Boostee' : 'Booster'}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

export function Header({ title, onBack, right }) {
  return (
    <View style={hStyles.h}>
      <Pressable onPress={onBack} hitSlop={8}><Ionicons name="chevron-back" size={22} color={C.text} /></Pressable>
      <Text style={hStyles.t}>{title}</Text>
      <View style={{ width: 22 }}>{right}</View>
    </View>
  );
}

export function Empty({ msg, cta, onCta }) {
  return (
    <View style={{ alignItems: 'center', padding: 36, gap: 12 }}>
      <Ionicons name="folder-open-outline" size={48} color={C.muted} />
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{msg}</Text>
      {cta && (
        <Pressable onPress={onCta} style={{ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: C.accent, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const hStyles = StyleSheet.create({
  h: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  t: { fontSize: 14, fontWeight: '700', color: C.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: C.surface },
  title: { fontSize: 13, fontWeight: '700', color: C.text },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '800', color: C.primary, marginTop: 6 },
  boostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#FEF3C7' },
  boostTxt: { color: '#92400E', fontWeight: '700', fontSize: 11 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#EEF2FF' },
  editTxt: { color: C.primary, fontWeight: '700', fontSize: 11 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#FEE2E2' },
  deleteTxt: { color: '#B91C1C', fontWeight: '700', fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTxt: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
});
