// Ecran d'inscription ORIZON
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { signUp, AUTH_ROLES } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: AUTH_ROLES[0],
  });
  const loading = useAuthStore((s) => s.loading);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('ORIZON', 'Email et mot de passe requis.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('ORIZON', 'Mot de passe trop court (6+ caracteres).');
      return;
    }
    const res = await signUp({ ...form, email: form.email.trim() });
    if (!res.ok) {
      Alert.alert('Inscription', res.error || 'Echec de la creation du compte.');
      return;
    }
    if (res.needsEmailConfirm) {
      Alert.alert('Verification', 'Verifie ta boite email pour confirmer ton compte.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>ORIZON</Text>
          <Text style={styles.h1}>Cree ton compte</Text>
          <Text style={styles.sub}>Trouve ou publie des biens en quelques minutes.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>NOM COMPLET</Text>
          <TextInput
            value={form.fullName} onChangeText={(v) => update('fullName', v)}
            placeholder="Prenom Nom" placeholderTextColor={C.muted} style={styles.field}
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            value={form.email} onChangeText={(v) => update('email', v)}
            keyboardType="email-address" autoCapitalize="none"
            placeholder="toi@orizon.ht" placeholderTextColor={C.muted} style={styles.field}
          />

          <Text style={styles.label}>TELEPHONE</Text>
          <TextInput
            value={form.phone} onChangeText={(v) => update('phone', v)}
            keyboardType="phone-pad"
            placeholder="+509 ..." placeholderTextColor={C.muted} style={styles.field}
          />

          <Text style={styles.label}>MOT DE PASSE</Text>
          <TextInput
            value={form.password} onChangeText={(v) => update('password', v)}
            secureTextEntry placeholder="6+ caracteres"
            placeholderTextColor={C.muted} style={styles.field}
          />

          <Text style={styles.label}>JE SUIS</Text>
          <View style={styles.roleRow}>
            {AUTH_ROLES.map((r) => {
              const on = form.role === r;
              return (
                <Pressable key={r} style={[styles.roleChip, on && styles.roleChipOn]} onPress={() => update('role', r)}>
                  <Text style={[styles.roleTxt, on && styles.roleTxtOn]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.cta, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
            <Text style={styles.ctaTxt}>{loading ? 'Creation...' : 'Creer le compte'}</Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkTxt}>Deja inscrit ? <Text style={{ color: C.primary, fontWeight: '700' }}>Se connecter</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  page: { flexGrow: 1, padding: 20, gap: 18 },
  hero: { gap: 4, marginTop: 8 },
  brand: { color: C.primary, fontWeight: '800', letterSpacing: 3, fontSize: 13 },
  h1: { color: C.text, fontSize: 24, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 13 },
  form: { gap: 10 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  field: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: C.text,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff',
  },
  roleChipOn: { borderColor: C.accent, backgroundColor: C.primarySoft },
  roleTxt: { fontSize: 11, color: C.muted, fontWeight: '600' },
  roleTxtOn: { color: C.primary },
  cta: {
    marginTop: 6, backgroundColor: C.accent,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  linkRow: { alignItems: 'center', marginTop: 4 },
  linkTxt: { color: C.muted, fontSize: 12 },
});
