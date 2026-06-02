// SupportScreen - Formulaire support + WhatsApp Business deep link.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/Toast';

const WHATSAPP_NUMBER = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || '50931234567';

export default function SupportScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('ORIZON', 'Sujet et message obligatoires.'); return;
    }
    setBusy(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('support_tickets').insert({
          user_id: user?.id || null,
          email: user?.email || null,
          subject, message,
        });
        if (error) throw error;
      }
      toast.show('Demande envoyee. Reponse sous 24h.', { type: 'success' });
      setSubject(''); setMessage('');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Echec', e.message);
    } finally { setBusy(false); }
  };

  const openWhatsApp = () => {
    const txt = encodeURIComponent(`Bonjour ORIZON, ${user?.fullName || ''}\n\n${subject}\n${message}`);
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${txt}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Sujet</Text>
        <TextInput
          value={subject} onChangeText={setSubject}
          placeholder="Resume rapide" placeholderTextColor={C.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          value={message} onChangeText={setMessage}
          placeholder="Decris ton probleme en detail..." placeholderTextColor={C.muted}
          multiline style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
        />

        <Pressable style={styles.cta} onPress={submit} disabled={busy}>
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.ctaTxt}>{busy ? 'Envoi...' : 'Envoyer'}</Text>
        </Pressable>

        <Pressable style={styles.wa} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.waTxt}>Plutot via WhatsApp</Text>
        </Pressable>

        <View style={styles.faq}>
          <Text style={styles.faqTitle}>Reponses rapides</Text>
          <Text style={styles.faqQ}>Mon annonce n'apparait pas ?</Text>
          <Text style={styles.faqA}>Verifie qu'elle est approuvee dans Mes annonces. Delai moyen 1-24h.</Text>
          <Text style={styles.faqQ}>Comment publier ?</Text>
          <Text style={styles.faqA}>Onglet Vendre, suis les 3 etapes. KYC obligatoire pour les annonces payantes.</Text>
        </View>
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
  body: { padding: spacing.xxl },
  label: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: spacing.lg, marginBottom: 6, letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    padding: spacing.lg, color: C.text, backgroundColor: '#fff',
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: radii.md, marginTop: spacing.xxl,
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  wa: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    paddingVertical: 14, borderRadius: radii.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: '#25D366',
  },
  waTxt: { color: '#25D366', fontWeight: '700', fontSize: 14 },
  faq: { marginTop: spacing.xxl * 2 },
  faqTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: spacing.lg },
  faqQ: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: spacing.md },
  faqA: { fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 18 },
});
