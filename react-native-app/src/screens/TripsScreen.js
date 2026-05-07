// TripsScreen - Voyages : visites et reservations
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, spacing, radii } from '../theme/colors';

export default function TripsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Voyages</Text>

        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="airplane-outline" size={36} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucune visite a venir</Text>
          <Text style={styles.emptyTxt}>
            Quand tu demanderas une visite ou reservation, elle apparaitra ici.
          </Text>

          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.ctaTxt}>Decouvrir des biens</Text>
          </Pressable>
        </View>

        {/* Section visites passees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visites passees</Text>
          <Pressable
            style={styles.linkRow}
            onPress={() => navigation.navigate('MyVisits')}
          >
            <Ionicons name="calendar-outline" size={20} color={C.text} />
            <Text style={styles.linkTxt}>Voir l'historique de mes visites</Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
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
  cta: {
    marginTop: spacing.lg,
    backgroundColor: C.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  ctaTxt: { color: '#fff', fontWeight: '700' },
  section: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  linkTxt: { flex: 1, color: C.text, fontSize: 14.5 },
});
