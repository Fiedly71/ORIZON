// Ecran "A propos" ORIZON: identite, version, equipe, mentions legales, liens.
import React from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, Linking, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';

const VERSION = Constants.expoConfig?.version || '1.0.0';
const COMPANY = {
  name: process.env.EXPO_PUBLIC_COMPANY_NAME || 'ORIZON Immobilier',
  address: process.env.EXPO_PUBLIC_COMPANY_ADDRESS || 'Cap-Haitien, Departement du Nord, Haiti',
  phone: process.env.EXPO_PUBLIC_SUPPORT_PHONE || '',
  email: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '',
  website: process.env.EXPO_PUBLIC_COMPANY_WEBSITE || '',
};

async function open(url) {
  try { await Linking.openURL(url); } catch { Alert.alert('Lien indisponible'); }
}

export default function AboutScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="A propos" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-vertical.png')}
            style={{ width: 160, height: 170, alignSelf: 'center' }}
            resizeMode="contain"
            accessibilityLabel="ORIZON"
          />
          <Text style={styles.tag}>Immobilier intelligent en Haiti et dans la Caraibe</Text>
          <Text style={styles.version}>Version {VERSION}</Text>
        </View>

        <Section title="Notre mission">
          <Text style={styles.p}>
            Donner a chacun acces a un marche immobilier transparent, securise et moderne,
            avec des biens verifies, des paiements traces et un accompagnement humain.
          </Text>
        </Section>

        <Section title="Contact">
          <Row icon="business-outline" label={COMPANY.name} />
          <Row icon="location-outline" label={COMPANY.address} />
          {COMPANY.phone ? (
            <Row icon="call-outline" label={COMPANY.phone} onPress={() => open(`tel:${COMPANY.phone.replace(/\s/g, '')}`)} />
          ) : null}
          {COMPANY.email ? (
            <Row icon="mail-outline" label={COMPANY.email} onPress={() => open(`mailto:${COMPANY.email}`)} />
          ) : null}
          {COMPANY.website ? (
            <Row icon="globe-outline" label={COMPANY.website} onPress={() => open(COMPANY.website)} />
          ) : null}
        </Section>

        <Section title="Suivez-nous">
          <View style={styles.socialRow}>
            <Social icon="logo-instagram" onPress={() => open('https://instagram.com/orizon')} />
            <Social icon="logo-facebook" onPress={() => open('https://facebook.com/orizon')} />
            <Social icon="logo-twitter" onPress={() => open('https://twitter.com/orizon')} />
            <Social icon="logo-linkedin" onPress={() => open('https://linkedin.com/company/orizon')} />
          </View>
        </Section>

        <Section title="Mentions legales">
          <Pressable style={styles.legalRow} onPress={() => open('https://fiedly71.github.io/ORIZON/terms.html')}>
            <Text style={styles.legalTxt}>Conditions generales d utilisation</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </Pressable>
          <Pressable style={styles.legalRow} onPress={() => open('https://fiedly71.github.io/ORIZON/privacy.html')}>
            <Text style={styles.legalTxt}>Politique de confidentialite</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </Pressable>
        </Section>

        <Text style={styles.copyright}>
          (c) {new Date().getFullYear()} ORIZON. Tous droits reserves.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.h}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={16} color={C.primary} />
      <Text style={[styles.rowTxt, onPress && { color: C.primary, fontWeight: '700' }]}>{label}</Text>
    </Wrapper>
  );
}

function Social({ icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.socialBtn}>
      <Ionicons name={icon} size={22} color={C.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  logo: {
    width: 72, height: 72, borderRadius: 18, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  logoTxt: { color: '#fff', fontSize: 36, fontWeight: '900' },
  brand: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 2 },
  tag: { fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 280 },
  version: { fontSize: 11, color: C.muted, marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, gap: 10 },
  h: { fontSize: 13, fontWeight: '800', color: C.text },
  p: { fontSize: 12, color: C.muted, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTxt: { fontSize: 12, color: C.text, flex: 1 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  socialBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  legalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  legalTxt: { fontSize: 12, color: C.text },
  copyright: { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 6 },
});
