// Composant generique d'etat vide ORIZON, avec icone, titre, message et CTA optionnel.
// A utiliser dans toutes les listes (annonces, visites, paiements, favoris, etc.).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';

export default function EmptyState({
  icon = 'sparkles-outline',
  title = 'Rien a afficher',
  message,
  ctaLabel,
  onCta,
  variant = 'default', // 'default' | 'soft' | 'inline'
}) {
  const isInline = variant === 'inline';
  return (
    <View style={[styles.wrap, isInline && styles.inline]}>
      <View style={[styles.iconBubble, variant === 'soft' && { backgroundColor: '#fff' }]}>
        <Ionicons name={icon} size={isInline ? 22 : 32} color={C.primary} />
      </View>
      <Text style={[styles.title, isInline && styles.titleInline]}>{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={styles.cta}>
          <Text style={styles.ctaTxt}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  inline: { padding: 18, gap: 8 },
  iconBubble: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  title: { fontSize: 15, fontWeight: '800', color: C.text, textAlign: 'center' },
  titleInline: { fontSize: 13 },
  msg: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  cta: {
    marginTop: 6, backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12,
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
