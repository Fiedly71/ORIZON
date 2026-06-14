// Mes visites - regroupe les visites en tant que visiteur ET en tant que proprietaire.
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';
import EmptyState from '../components/EmptyState';
import { listMyVisits, cancelVisit, confirmVisit, declineVisit } from '../services/visitsService';
import { openConversation } from '../services/messagingService';
import { useAuthStore } from '../store/useAuthStore';
import { canPublish } from '../services/authService';

export default function MyVisitsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const showOwnerTab = canPublish(user);
  const [tab, setTab] = useState('visitor'); // 'visitor' | 'owner'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    const r = await listMyVisits({ as: tab });
    setItems(r.ok ? r.data : []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [tab]);

  const action = async (fn, id) => { await fn(id); reload(); };

  const goChat = async (item) => {
    const otherId = tab === 'visitor' ? item.ownerId : item.visitorId;
    if (!item.propertyId || !otherId) return;
    const r = await openConversation({ propertyId: item.propertyId, ownerId: otherId });
    if (r.ok) navigation.navigate('Conversation', { conversationId: r.data?.id || r.id, otherUserId: otherId, propertyId: item.propertyId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Mes visites" onBack={() => navigation.goBack()} />
      {showOwnerTab && (
        <View style={styles.tabs}>
          {['visitor', 'owner'].map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{t === 'visitor' ? 'Demandes envoyees' : 'A confirmer'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        refreshing={loading}
        onRefresh={reload}
        contentContainerStyle={{ padding: 16, gap: 10, width: '100%', maxWidth: 880, alignSelf: 'center' }}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title={tab === 'visitor' ? 'Aucune visite demandee' : 'Aucune demande recue'} message={tab === 'visitor' ? 'Reserve une visite depuis une annonce.' : 'Tu verras ici les demandes des visiteurs.'} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>Visite #{String(item.id).slice(0, 6)}</Text>
            <Text style={styles.sub}>Prevue le {new Date(item.scheduledAt).toLocaleString('fr-FR')}</Text>
            <Text style={[styles.status, statusColor(item.status)]}>{labelStatus(item.status)}</Text>
            <Pressable style={styles.btnGhost} onPress={() => goChat(item)}>
              <Text style={styles.btnGhostTxt}>{tab === 'visitor' ? 'Discuter avec le proprietaire' : 'Discuter avec le visiteur'}</Text>
            </Pressable>
            {tab === 'visitor' && item.status === 'requested' && (
              <Pressable style={styles.btnGhost} onPress={() => action(cancelVisit, item.id)}>
                <Text style={styles.btnGhostTxt}>Annuler</Text>
              </Pressable>
            )}
            {tab === 'owner' && item.status === 'requested' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Pressable style={[styles.btn, { backgroundColor: C.accent }]} onPress={() => action(confirmVisit, item.id)}>
                  <Text style={styles.btnTxt}>Confirmer</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: C.danger }]} onPress={() => action(declineVisit, item.id)}>
                  <Text style={styles.btnTxt}>Refuser</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function labelStatus(s) {
  return ({ requested:'En attente', confirmed:'Confirmee', declined:'Refusee', checked_in:'En cours', completed:'Terminee', cancelled:'Annulee', no_show:'Absent' })[s] || s;
}
function statusColor(s) {
  if (s === 'confirmed' || s === 'completed' || s === 'checked_in') return { color: C.success };
  if (s === 'declined' || s === 'cancelled' || s === 'no_show') return { color: C.danger };
  return { color: C.gold };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.primarySoft, borderColor: C.accent },
  tabTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
  tabTxtOn: { color: C.primary, fontWeight: '700' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  title: { fontSize: 13, fontWeight: '700', color: C.text },
  sub: { fontSize: 11, color: C.muted, marginTop: 4 },
  status: { fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnGhost: { marginTop: 8, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
  btnGhostTxt: { color: C.muted, fontWeight: '700', fontSize: 12 },
});
