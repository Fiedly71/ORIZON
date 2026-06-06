// ForgotPasswordScreen - demande l'envoi du lien de reinitialisation par email.
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { requestPasswordReset } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function ForgotPasswordScreen({ navigation, route }) {
  const userEmail = useAuthStore((s) => s.user?.email);
  const prefill = route?.params?.prefillEmail || userEmail || '';
  const fromProfile = !!route?.params?.fromProfile;
  const [email, setEmail] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) {
      Alert.alert('Email', 'Entre une adresse email valide.');
      return;
    }
    setBusy(true);
    try {
      const r = await requestPasswordReset(e);
      if (!r.ok) {
        Alert.alert('Erreur', r.error || 'Echec.');
        return;
      }
      setSent(true);
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
        <Text style={styles.headerTxt}>{fromProfile ? 'Changer mot de passe' : 'Mot de passe oublie'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        {sent ? (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={36} color={C.primary} />
            </View>
            <Text style={styles.title}>Email envoye</Text>
            <Text style={styles.txt}>
              On a envoye un lien de reinitialisation a{'\n'}
              <Text style={{ fontWeight: '700', color: C.text }}>{email}</Text>
              {'\n\n'}Ouvre l'email puis touche le lien pour definir un nouveau mot de passe.
            </Text>
            <Pressable style={styles.cta} onPress={() => navigation.goBack()}>
              <Text style={styles.ctaTxt}>Retour a la connexion</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reinitialiser ton mot de passe</Text>
            <Text style={styles.txt}>
              Entre l'email associe a ton compte ORIZON. On t'envoie un lien
              securise pour creer un nouveau mot de passe.
            </Text>

            <View style={{ gap: 6, marginTop: 16 }}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ton@email.com"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Envoyer le lien</Text>}
            </Pressable>
          </>
        )}
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
  headerTxt: { fontSize: 14, fontWeight: '700', color: C.text },
  body: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 12 },
  txt: { fontSize: 13, color: C.muted, lineHeight: 19 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 14, color: C.text,
  },
  cta: {
    marginTop: 20, backgroundColor: C.accent,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  successWrap: { alignItems: 'center', gap: 12, paddingTop: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
});
