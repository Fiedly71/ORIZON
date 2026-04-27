// CheckoutScreen — Choix du mode de paiement pour publier une annonce.
// Recoit en params: { propertyId, propertyTitle?, onSuccess? }
// Si pas de propertyId (mode pre-creation), on simule juste le paiement et on
// renvoie le resultat via navigation.navigate('SellWizard', { paid: true, ... }).

import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import {
  PROVIDERS,
  LISTING_FEE_USD,
  LISTING_FEE_HTG,
  payListingWithStripe,
  payListingWithMonCash,
} from '../services/paymentsService';

export default function CheckoutScreen({ navigation, route }) {
  const propertyId = route?.params?.propertyId || null;
  const propertyTitle = route?.params?.propertyTitle || 'Nouvelle annonce';

  const [provider, setProvider] = useState(PROVIDERS.MONCASH);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const isMonCash = provider === PROVIDERS.MONCASH;

  const submit = async () => {
    if (isMonCash && phone.trim().length < 8) {
      Alert.alert('MonCash', 'Entre ton numéro MonCash (8 chiffres).');
      return;
    }
    setBusy(true);
    try {
      const r = isMonCash
        ? await payListingWithMonCash({ propertyId, phone })
        : await payListingWithStripe({ propertyId });

      if (!r.ok) {
        Alert.alert('Paiement échoué', r.error || 'Réessaie.');
        return;
      }
      Alert.alert(
        'Paiement confirmé ✓',
        `Ton annonce est maintenant publiée et visible par tous les utilisateurs ORIZON.\n\nRéférence : ${r.reference}`,
        [
          {
            text: 'Voir mes annonces',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'App' }, { name: 'MyListings' }],
            }),
          },
        ],
      );
    } finally {
      setBusy(false);
    }
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

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.summary}>
          <Text style={styles.sumLabel}>Récapitulatif</Text>
          <Text style={styles.sumTitle}>{propertyTitle}</Text>
          <View style={styles.sumRow}>
            <Text style={styles.sumKey}>Frais de publication</Text>
            <Text style={styles.sumVal}>
              {isMonCash ? `${LISTING_FEE_HTG} HTG` : `${LISTING_FEE_USD} USD`}
            </Text>
          </View>
          <Text style={styles.sumNote}>
            Ton annonce sera publiée immédiatement après confirmation du paiement
            et restera visible jusqu'à 60 jours.
          </Text>
        </View>

        <Text style={styles.section}>Méthode de paiement</Text>

        <Pressable
          style={[styles.method, isMonCash && styles.methodOn]}
          onPress={() => setProvider(PROVIDERS.MONCASH)}
        >
          <View style={[styles.logo, { backgroundColor: '#F26B21' }]}>
            <Text style={styles.logoTxt}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>MonCash</Text>
            <Text style={styles.methodSub}>2 500 HTG • Recommandé en Haïti</Text>
          </View>
          <View style={[styles.radio, isMonCash && styles.radioOn]}>
            {isMonCash && <View style={styles.radioDot} />}
          </View>
        </Pressable>

        <Pressable
          style={[styles.method, !isMonCash && styles.methodOn]}
          onPress={() => setProvider(PROVIDERS.STRIPE)}
        >
          <View style={[styles.logo, { backgroundColor: '#635BFF' }]}>
            <Ionicons name="card" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>Carte bancaire (Stripe)</Text>
            <Text style={styles.methodSub}>20 USD • Visa, MasterCard</Text>
          </View>
          <View style={[styles.radio, !isMonCash && styles.radioOn]}>
            {!isMonCash && <View style={styles.radioDot} />}
          </View>
        </Pressable>

        {isMonCash && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>NUMÉRO MONCASH</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="ex: 37123456"
              keyboardType="phone-pad"
              style={styles.input}
              maxLength={12}
            />
            <Text style={styles.hint}>
              Tu vas recevoir une demande de paiement sur ton portefeuille MonCash.
            </Text>
          </View>
        )}

        <View style={styles.sandboxBox}>
          <Ionicons name="construct-outline" size={16} color="#92400E" />
          <Text style={styles.sandboxTxt}>
            Mode SANDBOX : aucun paiement réel n'est effectué. Le clic sur le bouton
            simule une confirmation immédiate (pour tests).
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, busy && { opacity: 0.6 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaTxt}>
              {isMonCash
                ? `Payer ${LISTING_FEE_HTG} HTG avec MonCash`
                : `Payer ${LISTING_FEE_USD} USD avec Stripe`}
            </Text>
          )}
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
