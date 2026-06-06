// BoostListingScreen - choix du plan + paiement (Stripe/MonCash) + activation premium.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { BOOST_PLANS, applyBoost, getBoostStatus } from '../services/boostService';
import { useToast } from '../components/Toast';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function BoostListingScreen({ route, navigation }) {
  const { propertyId, propertyTitle } = route.params || {};
  const toast = useToast();
  const [plan, setPlan] = useState('b30');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('stripe');

  useEffect(() => {
    if (propertyId) getBoostStatus(propertyId).then((r) => r.ok && setStatus(r));
  }, [propertyId]);

  const onPay = async () => {
    if (!propertyId) return;
    const p = BOOST_PLANS.find((x) => x.id === plan);
    setBusy(true);
    try {
      // MonCash : on redirige vers l'ecran manuel de soumission (admin valide).
      if (method === 'moncash') {
        navigation.replace('MonCashManual', {
          propertyId,
          amount: Math.round(p.price * 130),
          purpose: 'boost',
          meta: { days: p.days, planId: p.id },
        });
        return;
      }
      // Stripe : creer un payment pending, le boost s'active via webhook serveur (apply_premium_boost).
      if (isSupabaseConfigured) {
        const uid = useAuthStore.getState().user?.id;
        const { error } = await supabase.from('payments').insert({
          user_id: uid,
          property_id: propertyId,
          amount: p.price,
          currency: 'USD',
          provider: 'stripe',
          status: 'pending',
          kind: 'boost',
          meta: { days: p.days, planId: p.id },
        });
        if (error) { Alert.alert('Erreur', error.message); return; }
      }
      Alert.alert(
        'Paiement en cours',
        `Le boost ${p.label} sera active automatiquement apres confirmation du paiement Stripe (quelques secondes).`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally { setBusy(false); }
  };

  const selected = BOOST_PLANS.find((p) => p.id === plan);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Booster l'annonce</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.heroCard}>
          <Ionicons name="rocket" size={40} color="#feac00" />
          <Text style={styles.heroTitle}>Mets ton annonce en haut</Text>
          <Text style={styles.heroSub} numberOfLines={2}>{propertyTitle || 'Ton annonce'}</Text>
          {status?.isPremium && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#15803D" />
              <Text style={styles.activeBadgeTxt}>Deja boostee jusqu'au {new Date(status.until).toLocaleDateString('fr-FR')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.section}>Choisir un plan</Text>
        {BOOST_PLANS.map((p) => (
          <Pressable
            key={p.id} onPress={() => setPlan(p.id)}
            style={[styles.planCard, plan === p.id && styles.planCardActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>{p.label}</Text>
              <Text style={styles.planDesc}>{p.desc}</Text>
            </View>
            <Text style={styles.planPrice}>${p.price}</Text>
            <Ionicons
              name={plan === p.id ? 'radio-button-on' : 'radio-button-off'}
              size={22} color={plan === p.id ? C.primary : C.muted}
              style={{ marginLeft: spacing.md }}
            />
          </Pressable>
        ))}

        <Text style={styles.section}>Methode de paiement</Text>
        <View style={styles.methodRow}>
          {[
            { id: 'stripe', label: 'Carte', icon: 'card' },
            { id: 'moncash', label: 'MonCash', icon: 'phone-portrait' },
          ].map((m) => (
            <Pressable
              key={m.id} onPress={() => setMethod(m.id)}
              style={[styles.methodBtn, method === m.id && styles.methodBtnActive]}
            >
              <Ionicons name={m.icon} size={18} color={method === m.id ? '#fff' : C.text} />
              <Text style={[styles.methodTxt, method === m.id && { color: '#fff' }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Avantages</Text>
          {[
            'Apparait en haut des resultats',
            'Badge "Premium" visible',
            'Plus de contacts (+3x en moyenne)',
            'Statistiques detaillees',
          ].map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark" size={16} color={C.success} />
              <Text style={styles.benefitTxt}>{b}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={onPay} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="rocket" size={18} color="#fff" />
              <Text style={styles.ctaTxt}>Payer ${selected?.price} et activer</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  body: { padding: spacing.xxl, paddingBottom: 60 },
  heroCard: { alignItems: 'center', backgroundColor: '#FEF3C7', padding: spacing.xxl, borderRadius: radii.lg, marginBottom: spacing.xxl },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: spacing.md },
  heroSub: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, marginTop: spacing.md },
  activeBadgeTxt: { color: '#15803D', fontSize: 11.5, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.md },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radii.md, borderWidth: 1, borderColor: C.border, padding: spacing.lg, marginBottom: spacing.md },
  planCardActive: { borderColor: C.primary, borderWidth: 2 },
  planLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  planDesc: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  planPrice: { fontSize: 17, fontWeight: '800', color: C.primary },
  methodRow: { flexDirection: 'row', gap: spacing.md },
  methodBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, padding: spacing.md, borderRadius: radii.md },
  methodBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  methodTxt: { color: C.text, fontWeight: '600' },
  benefits: { backgroundColor: C.surface, borderRadius: radii.md, padding: spacing.lg, marginTop: spacing.lg },
  benefitsTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  benefitTxt: { fontSize: 13, color: C.text },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: C.primary, paddingVertical: 16, borderRadius: radii.md, marginTop: spacing.xxl },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
