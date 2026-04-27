// Ecran de connexion ORIZON
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { signInWithPassword } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const loading = useAuthStore((s) => s.loading);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('ORIZON', 'Email et mot de passe requis.');
      return;
    }
    const res = await signInWithPassword({ email: email.trim(), password });
    if (!res.ok) Alert.alert('Connexion', res.error || 'Echec de la connexion.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>ORIZON</Text>
          <Text style={styles.h1}>Bon retour</Text>
          <Text style={styles.sub}>Connecte-toi pour continuer.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="toi@orizon.ht"
            placeholderTextColor={C.muted}
            style={styles.field}
          />

          <Text style={styles.label}>MOT DE PASSE</Text>
          <View style={styles.pwdWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              placeholder="********"
              placeholderTextColor={C.muted}
              style={[styles.field, { flex: 1 }]}
            />
            <Pressable onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.muted} />
            </Pressable>
          </View>

          <Pressable style={[styles.cta, loading && { opacity: 0.6 }]} onPress={onLogin} disabled={loading}>
            <Text style={styles.ctaTxt}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ alignSelf: 'center', marginTop: 4, padding: 8 }}
          >
            <Text style={{ color: C.primary, fontWeight: '600', fontSize: 12 }}>
              Mot de passe oublie ?
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkTxt}>Pas de compte ? <Text style={{ color: C.primary, fontWeight: '700' }}>Cree un compte</Text></Text>
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
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: C.text,
  },
  pwdWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  cta: {
    marginTop: 6,
    backgroundColor: C.accent,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  linkRow: { alignItems: 'center', marginTop: 4 },
  linkTxt: { color: C.muted, fontSize: 12 },
});
