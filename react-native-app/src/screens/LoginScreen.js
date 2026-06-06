// Ecran de connexion ORIZON
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { C } from '../theme/colors';
import { signInWithPassword } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';

// Traduit en francais les messages d'erreur courants de Supabase Auth.
function translateAuthError(msg) {
  if (!msg) return 'Echec de la connexion.';
  const m = String(msg).toLowerCase();
  if (m.includes('email not confirmed')) return 'Ton email n\'a pas encore ete confirme. Verifie ta boite mail (et les spams).';
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('user not found')) return 'Aucun compte avec cet email.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Reessaye dans quelques minutes.';
  if (m.includes('network')) return 'Probleme de connexion internet. Reessaye.';
  return msg;
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const loading = useAuthStore((s) => s.loading);

  const onLogin = async () => {
    setErrorMsg('');
    setNeedsConfirm(false);
    if (!email || !password) {
      setErrorMsg('Email et mot de passe requis.');
      return;
    }
    const res = await signInWithPassword({ email: email.trim(), password });
    if (!res.ok) {
      const raw = res.error || '';
      const friendly = translateAuthError(raw);
      setErrorMsg(friendly);
      if (String(raw).toLowerCase().includes('email not confirmed')) {
        setNeedsConfirm(true);
      }
    }
  };

  const onResendConfirm = async () => {
    if (!email.trim()) {
      setErrorMsg('Saisis ton email d\'abord.');
      return;
    }
    if (!isSupabaseConfigured) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (error) {
        setErrorMsg(translateAuthError(error.message));
      } else {
        setErrorMsg('');
        setNeedsConfirm(false);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert('Email de confirmation renvoye. Verifie ta boite mail.');
        } else {
          Alert.alert('Email envoye', 'Verifie ta boite mail.');
        }
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-vertical.png')}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityLabel="ORIZON"
          />
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

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={C.danger} />
              <Text style={styles.errorTxt}>{errorMsg}</Text>
            </View>
          )}

          {needsConfirm && (
            <Pressable style={styles.resendBtn} onPress={onResendConfirm} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={16} color={C.primary} />
                  <Text style={styles.resendTxt}>Renvoyer l'email de confirmation</Text>
                </>
              )}
            </Pressable>
          )}

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
  hero: { gap: 4, marginTop: 8, alignItems: 'center' },
  brand: { color: C.primary, fontWeight: '800', letterSpacing: 3, fontSize: 13 },
  logoImg: { width: 150, height: 160, alignSelf: 'center', marginBottom: 6 },
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
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 4,
  },
  errorTxt: { color: '#991B1B', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primarySoft, borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  resendTxt: { color: C.primary, fontWeight: '700', fontSize: 13 },
});
