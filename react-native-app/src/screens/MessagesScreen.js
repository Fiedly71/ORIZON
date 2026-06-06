// MessagesScreen - Liste des conversations utilisateur. Realtime via Supabase.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { listConversations } from '../services/messagingService';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../services/supabase';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'maintenant';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function MessagesScreen({ navigation }) {
  const myId = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listConversations();
    if (r.ok) setItems(r.data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ch = supabase
      .channel('conv-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [load]);

  const renderItem = ({ item }) => {
    const role = item.buyerId === myId ? 'buyer' : 'owner';
    const unread = role === 'buyer' ? item.unreadBuyer : item.unreadOwner;
    const displayName = item.otherName || (role === 'buyer' ? 'Proprietaire' : 'Acheteur');
    const initial = displayName.slice(0, 1).toUpperCase();
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('Conversation', {
          conversationId: item.id,
          title: displayName,
          role,
        })}
      >
        {item.otherAvatar ? (
          <Image source={{ uri: item.otherAvatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.rowTime}>{timeAgo(item.lastMessageAt)}</Text>
          </View>
          {item.propertyTitle ? (
            <Text style={styles.rowProp} numberOfLines={1}>{item.propertyTitle}</Text>
          ) : null}
          <Text style={[styles.rowMsg, unread > 0 && styles.rowMsgUnread]} numberOfLines={1}>
            {item.lastMessage || 'Demarre la conversation...'}
          </Text>
        </View>
        {unread > 0 && (
          <View style={styles.unreadDot}>
            <Text style={styles.unreadTxt}>{unread}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>Messages</Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={36} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun message pour l'instant</Text>
              <Text style={styles.emptyTxt}>
                Quand tu contacteras un proprietaire ou une agence, la conversation apparaitra ici.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  h1: { fontSize: 28, fontWeight: '700', color: C.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: C.primarySoft,
  },
  avatarTxt: { color: C.primary, fontWeight: '800', fontSize: 18 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  rowTime: { fontSize: 12, color: C.muted, marginLeft: spacing.md },
  rowProp: { fontSize: 11, color: C.primary, marginTop: 1, fontWeight: '600' },
  rowMsg: { fontSize: 13.5, color: C.muted, marginTop: 2 },
  rowMsgUnread: { color: C.text, fontWeight: '600' },
  unreadDot: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: C.border, marginLeft: spacing.xxl + 50 + spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.lg, paddingHorizontal: spacing.xxl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center', maxWidth: 280 },
});
