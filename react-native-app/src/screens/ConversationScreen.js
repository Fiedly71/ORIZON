// ConversationScreen - Thread view avec realtime.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import {
  listMessages, sendMessage, subscribeMessages, markRead,
} from '../services/messagingService';
import { useAuthStore } from '../store/useAuthStore';

export default function ConversationScreen({ navigation, route }) {
  const { conversationId, title, role, verified } = route.params || {};
  const myId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listMessages(conversationId);
    if (r.ok) setMessages(r.data || []);
    setLoading(false);
    markRead(conversationId, role || 'buyer');
  }, [conversationId, role]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeMessages(conversationId, (m) => {
      setMessages((prev) => prev.find((x) => x.id === m.id) ? prev : [...prev, m]);
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const onSend = async () => {
    const txt = input.trim();
    if (!txt) return;
    setInput('');
    setSending(true);
    const r = await sendMessage(conversationId, txt);
    setSending(false);
    if (r.ok && !messages.find((x) => x.id === r.data.id)) {
      setMessages((prev) => [...prev, r.data]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Conversation'}</Text>
          {verified ? (
            <Ionicons name="checkmark-circle" size={15} color="#1D4ED8" style={{ marginLeft: 4 }} />
          ) : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md, width: '100%', maxWidth: 880, alignSelf: 'center' }}
            renderItem={({ item }) => {
              const mine = item.senderId === myId;
              return (
                <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleTxt, mine && styles.bubbleTxtMine]}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ paddingTop: 80, alignItems: 'center' }}>
                <Text style={{ color: C.muted }}>Envoie le premier message.</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Écris un message..."
            placeholderTextColor={C.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.surface, borderBottomLeftRadius: 4 },
  bubbleTxt: { color: C.text, fontSize: 14.5 },
  bubbleTxtMine: { color: '#fff' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxHeight: 120, color: C.text,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
