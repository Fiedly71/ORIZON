// PlansScreen — 3 plans (mensuel/trimestriel/annuel) + badge Vérifié 5$
// Pendant la promo de lancement (jusqu'au 31 août 2026), les plans sont
// AFFICHÉS À TITRE INFORMATIF et le bouton de souscription indique
// "Publication gratuite jusqu'au 31 août 2026". Aucun paiement n'est prélevé.
// Après la promo, on branche Stripe / MonCash prod côté onSubscribe().
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { PLANS, VERIFIED_BADGE, formatExpiry, daysUntilExpiry, RENEWAL_REMINDER_DAYS } from '../constants/plans';
import { useAuthStore } from '../store/useAuthStore';
import { isLaunchFreeActive, LAUNCH_FREE_END_LABEL } from '../config/launchPromo';

export default function PlansScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const freeActive = isLaunchFreeActive();
  const currentPlanId = user?.currentPlanId || null;
  const planExpiresAt = user?.planExpiresAt || null;
  const badgeActive = !!user?.verifiedBadge;
  const badgeExpiresAt = user?.badgeExpiresAt || null;
  const daysLeft = daysUntilExpiry(planExpiresAt);
  const showRenewalWarn =
    typeof daysLeft === 'number' && daysLeft >= 0 && daysLeft <= RENEWAL_REMINDER_DAYS;

  const onSubscribe = (plan) => {
    if (freeActive) {
      Alert.alert(
        'Publication gratuite',
        `Aucun paiement requis jusqu'au ${LAUNCH_FREE_END_LABEL}. Ton compte peut déjà publier gratuitement.`,
      );
      return;
    }
    // TODO : brancher Stripe/MonCash prod ici → navigation.navigate('Checkout', { planId, priceUsd })
    Alert.alert(
      'Bientôt disponible',
      'Les paiements MonCash / Stripe seront activés à la fin de la promo de lancement.',
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Plans & Badge</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Bannière promo lancement */}
        {freeActive && (
          <View style={styles.freeBanner}>
            <Ionicons name="gift" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.freeBannerTitle}>Publication 100 % gratuite</Text>
              <Text style={styles.freeBannerTxt}>
                Aucun paiement requis jusqu'au {LAUNCH_FREE_END_LABEL}. Publie autant d'annonces
                que tu veux. Les plans ci-dessous seront activés après cette date.
              </Text>
            </View>
          </View>
        )}

        {/* Plan actuel */}
        {currentPlanId && !freeActive && (
          <View style={[styles.currentBox, showRenewalWarn && styles.currentBoxWarn]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={showRenewalWarn ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color={showRenewalWarn ? '#DC2626' : '#16A34A'}
              />
              <Text style={styles.currentBoxTitle}>
                Ton plan actuel : {(PLANS.find((p) => p.id === currentPlanId) || {}).label || currentPlanId}
              </Text>
            </View>
            <Text style={[styles.currentBoxTxt, showRenewalWarn && { color: '#DC2626', fontWeight: '700' }]}>
              {showRenewalWarn
                ? `⚠ Ton plan expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} (${formatExpiry(planExpiresAt)}). Renouvelle maintenant pour ne pas perdre la publication.`
                : `Expire le ${formatExpiry(planExpiresAt)}`}
            </Text>
          </View>
        )}

        {/* Cartes Plans */}
        {PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const monthlyEquiv = (plan.priceUsd / (plan.durationDays / 30)).toFixed(0);
          return (
            <View key={plan.id} style={[styles.planCard, plan.best && styles.planCardBest]}>
              {plan.popular && !plan.best && (
                <View style={styles.badgeRibbon}><Text style={styles.badgeRibbonTxt}>POPULAIRE</Text></View>
              )}
              {plan.best && (
                <View style={[styles.badgeRibbon, { backgroundColor: '#DC2626' }]}>
                  <Text style={styles.badgeRibbonTxt}>MEILLEURE OFFRE</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: plan.color + '22' }]}>
                  <Ionicons name={plan.icon} size={22} color={plan.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.planPrice}>${plan.priceUsd}</Text>
                  {plan.durationDays > 30 && (
                    <Text style={styles.planPriceSub}>≈ ${monthlyEquiv}/mois</Text>
                  )}
                </View>
              </View>

              <View style={{ gap: 6, marginTop: 12 }}>
                {plan.features.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                    <Text style={styles.planFeat}>{f}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.planCta,
                  { backgroundColor: plan.color },
                  (isCurrent || freeActive) && { opacity: 0.6 },
                ]}
                onPress={() => onSubscribe(plan)}
                disabled={isCurrent}
              >
                <Text style={styles.planCtaTxt}>
                  {isCurrent
                    ? 'Plan actif'
                    : freeActive
                      ? `Gratuit jusqu'au ${LAUNCH_FREE_END_LABEL}`
                      : `Souscrire — ${plan.priceUsd} USD`}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Badge Vérifié — achat séparé */}
        <View style={[styles.planCard, { borderColor: VERIFIED_BADGE.color, borderWidth: 1.5 }]}>
          <View style={styles.planHeader}>
            <View style={[styles.planIcon, { backgroundColor: VERIFIED_BADGE.color + '22' }]}>
              <Ionicons name={VERIFIED_BADGE.icon} size={22} color={VERIFIED_BADGE.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>{VERIFIED_BADGE.label}</Text>
              <Text style={styles.planTagline}>1 an — inclus dans le plan annuel</Text>
            </View>
            <Text style={styles.planPrice}>${VERIFIED_BADGE.priceUsd}</Text>
          </View>
          <Text style={[styles.planFeat, { marginTop: 8, color: C.muted }]}>
            {VERIFIED_BADGE.description}
          </Text>
          {badgeActive ? (
            <View style={[styles.planCta, { backgroundColor: '#16A34A' }]}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.planCtaTxt}>
                Badge actif {badgeExpiresAt ? `— expire le ${formatExpiry(badgeExpiresAt)}` : ''}
              </Text>
            </View>
          ) : (
            <Pressable
              style={[styles.planCta, { backgroundColor: VERIFIED_BADGE.color }, freeActive && { opacity: 0.6 }]}
              onPress={() => onSubscribe(VERIFIED_BADGE)}
            >
              <Text style={styles.planCtaTxt}>
                {freeActive
                  ? `Gratuit jusqu'au ${LAUNCH_FREE_END_LABEL}`
                  : `Acheter le badge — ${VERIFIED_BADGE.priceUsd} USD`}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={14} color={C.muted} />
          <Text style={styles.footerNoteTxt}>
            Paiements sécurisés via MonCash et Stripe (bientôt disponibles). Ton plan se renouvelle
            automatiquement à la date d'expiration — un rappel te sera envoyé 3 jours avant.
          </Text>
        </View>
      </ScrollView>
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
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  body: { padding: 16, gap: 14, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  freeBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    padding: 14, borderRadius: radii.md, backgroundColor: C.primary,
  },
  freeBannerTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  freeBannerTxt: { color: '#fff', fontSize: 12.5, lineHeight: 17, marginTop: 2, opacity: 0.95 },
  currentBox: {
    padding: 12, borderRadius: radii.md, backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#86EFAC', gap: 6,
  },
  currentBoxWarn: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  currentBoxTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  currentBoxTxt: { fontSize: 12.5, color: C.textSoft || C.muted, lineHeight: 17 },
  planCard: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.lg,
    padding: 14, backgroundColor: '#fff', gap: 6, position: 'relative',
  },
  planCardBest: { borderColor: '#DC2626', borderWidth: 2 },
  badgeRibbon: {
    position: 'absolute', top: -10, right: 14,
    backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 999,
  },
  badgeRibbonTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  planLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  planTagline: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  planPrice: { fontSize: 22, fontWeight: '900', color: C.text },
  planPriceSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  planFeat: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
  planCta: {
    marginTop: 14, paddingVertical: 12, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  planCtaTxt: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  footerNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    padding: 10, marginTop: 8,
  },
  footerNoteTxt: { flex: 1, fontSize: 11, color: C.muted, lineHeight: 15 },
});
