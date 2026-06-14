// CheckoutScreen — Choix du mode de paiement pour publier une annonce.
// Recoit en params: { propertyId, propertyTitle?, onSuccess? }
// Si pas de propertyId (mode pre-creation), on simule juste le paiement et on
// renvoie le resultat via navigation.navigate('SellWizard', { paid: true, ... }).

import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import {
  LISTING_FEE_HTG,
} from '../services/paymentsService';

export default function CheckoutScreen({ navigation, route }) {
  const propertyId = route?.params?.propertyId || null;
  const propertyTitle = route?.params?.propertyTitle || 'Nouvelle annonce';

  const proceed = () => {
    navigation.replace('MonCashManual', { propertyId, amount: LISTING_FEE_HTG, purpose: 'listing' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Paiement</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <View style={styles.summary}>
          <Text style={styles.sumLabel}>Resume / Rezime</Text>
          <Text style={styles.sumTitle}>{propertyTitle}</Text>
          <View style={styles.sumRow}>
            <Text style={styles.sumKey}>Frais de publication</Text>
            <Text style={styles.sumVal}>{LISTING_FEE_HTG.toLocaleString('fr-FR')} HTG</Text>
          </View>
          <Text style={styles.sumNote}>
            Ton annonce sera publiee des que ton paiement sera valide (quelques minutes a quelques heures) et restera visible 60 jours.
          </Text>
          <Text style={[styles.sumNote, { marginTop: 4 }]}>
            Anons ou ap pibliye le yo verifye peman an. Li ap rete vizib pou 60 jou.
          </Text>
        </View>

        <View style={styles.methodCard}>
          <View style={[styles.logo, { backgroundColor: '#F26B21' }]}>
            <Text style={styles.logoTxt}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>MonCash</Text>
            <Text style={styles.methodSub}>Sel mwayen peman pou kounye a / Seul moyen de paiement pour l'instant</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={C.success || '#00C901'} />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTxt}>
              Apre w klike sou bouton an, n ap montre w ki nimewo MonCash pou voye lajan an ak kijan pou w fe sa, etap pa etap.
            </Text>
            <Text style={[styles.infoTxt, { marginTop: 4, fontStyle: 'italic', color: C.muted }]}>
              Apres avoir clique, nous t'indiquons le numero MonCash et la procedure etape par etape.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={proceed}>
          <Text style={styles.ctaTxt}>
            Kontinye ak MonCash - {LISTING_FEE_HTG.toLocaleString('fr-FR')} HTG
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },

  summary: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, gap: 6,
  },
  sumLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  sumTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  sumRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  sumKey: { fontSize: 13, color: C.muted },
  sumVal: { fontSize: 16, fontWeight: '800', color: C.primary },
  sumNote: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 15 },

  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.muted, marginTop: 4 },

  method: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff',
  },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primarySoft,
  },
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.primarySoft, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.primary,
  },
  infoTxt: { fontSize: 12, color: C.text, lineHeight: 17 },
  methodOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  logo: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  logoTxt: { color: '#fff', fontWeight: '900', fontSize: 18 },
  methodTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  methodSub: { fontSize: 11, color: C.muted, marginTop: 2 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },
  hint: { fontSize: 11, color: C.muted, marginTop: 2 },

  sandboxBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginTop: 8,
  },
  sandboxTxt: { flex: 1, fontSize: 11, color: '#78350F', lineHeight: 15 },

  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff',
  },
  cta: {
    backgroundColor: C.accent, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
