// Ecran Aide / FAQ avec accordeon + boutons de support (WhatsApp, email).
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';

const FAQ = [
  {
    q: 'Comment publier une annonce ?',
    a: "Depuis la barre principale, appuie sur 'Vendre'. Le wizard te guide en 3 étapes: infos, photos, tarif.",
  },
  {
    q: 'Comment etre vérifie ?',
    a: "Va dans Profil > Vérification KYC. Telecharge un selfie et une pièce d'identité (CIN, passeport ou permis). La validation prend 24-48h.",
  },
  {
    q: 'Quels sont les moyens de paiement ?',
    a: "ORIZON accepte les cartes bancaires (Stripe) et MonCash en Haïti. Aucun frais cache.",
  },
  {
    q: 'Comment fonctionne la calculette d hypothèque ?',
    a: "Entre le prix, l'apport et choisis un produit bancaire. Le tableau d amortissement est calcule en temps reel.",
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: "Écris-nous depuis l'option 'Contact' ci-dessous avec ton email. La suppression est traitee sous 7 jours.",
  },
  {
    q: 'Mes données sont-elles protegees ?',
    a: "Oui. Toutes les données sont chiffrées au repos via Supabase et en transit (HTTPS). Voir nos CGU pour plus d info.",
  },
];

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'admin@kayorizon.com';
const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || '50942152569';

async function openUrl(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) throw new Error('cannot open');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Impossible', "Aucune application disponible pour ouvrir ce lien.");
  }
}

export default function HelpScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      <Header title="Aide & FAQ" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <Text style={styles.intro}>
          Une question? Parcours les sujets frequents ou contacte notre equipe.
        </Text>

        {FAQ.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}

        <View style={styles.supportCard}>
          <Text style={styles.h}>Besoin d aide directe ?</Text>
          <Text style={styles.p}>Notre equipe repond du lundi au samedi, 8h-18h (HT).</Text>
          {SUPPORT_WHATSAPP ? (
            <Pressable
              style={[styles.btn, { backgroundColor: '#25D366' }]}
              onPress={() => openUrl(`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}`)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.btnTxt}>WhatsApp</Text>
            </Pressable>
          ) : null}
          {SUPPORT_EMAIL ? (
            <Pressable
              style={[styles.btn, { backgroundColor: C.primary }]}
              onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}?subject=Support%20ORIZON`)}
            >
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={styles.btnTxt}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          ) : null}
          {!SUPPORT_EMAIL && !SUPPORT_WHATSAPP ? (
            <Text style={styles.p}>Coordonnees de support a venir.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.q}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </View>
      {open ? <Text style={styles.a}>{a}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: C.muted, lineHeight: 19 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  q: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1, paddingRight: 10 },
  a: { fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 8 },
  supportCard: {
    marginTop: 6, backgroundColor: C.primarySoft, borderRadius: 14, padding: 16, gap: 10,
  },
  h: { fontSize: 14, fontWeight: '800', color: C.text },
  p: { fontSize: 12, color: C.muted, marginBottom: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
  },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
