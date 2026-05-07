// MessagesScreen - placeholder messagerie (Phase 3 ajoutera realtime)
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, spacing } from '../theme/colors';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Messages</Text>

        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={36} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun message pour l'instant</Text>
          <Text style={styles.emptyTxt}>
            Quand tu contacteras un proprietaire ou une agence, la conversation apparaitra ici.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: spacing.xxl, gap: spacing.xxl },
  h1: { fontSize: 28, fontWeight: '700', color: C.text },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center', maxWidth: 280 },
});
