// PhoneVerifyScreen - Saisie tel + reception OTP SMS.
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/otpService';

export default function PhoneVerifyScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => timer.current && clearInterval(timer.current), []);

  const startCooldown = () => {
    setResendIn(45);
    timer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { clearInterval(timer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const onSend = async () => {
    setLoading(true);
    const r = await sendPhoneOtp(phone);
    setLoading(false);
    if (!r.ok) { Alert.alert('Erreur', r.error); return; }
    setStep(2);
    startCooldown();
    if (r.mock) Alert.alert('Mode test', `Code: ${r.devCode}`);
  };

  const onVerify = async () => {
    setLoading(true);
    const r = await verifyPhoneOtp(phone, code);
    setLoading(false);
    if (!r.ok) { Alert.alert('Erreur', r.error); return; }
    Alert.alert('Vérifié !', 'Ton numéro est confirmé.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Vérifier mon téléphone</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        {step === 1 ? (
          <>
            <Text style={styles.h2}>Numéro de téléphone</Text>
            <Text style={styles.help}>Format : +509 XXXX XXXX (Haïti)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>🇭🇹</Text>
              <TextInput
                value={phone} onChangeText={setPhone}
                placeholder="+509 12 34 56 78"
                placeholderTextColor={C.muted}
                keyboardType="phone-pad" style={styles.input}
              />
            </View>
            <Pressable
              style={[styles.cta, (!phone || loading) && styles.ctaDisabled]}
              onPress={onSend} disabled={!phone || loading}
            >
              {loading ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaTxt}>Envoyer le code SMS</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.h2}>Code reçu par SMS</Text>
            <Text style={styles.help}>Envoyé à {phone}</Text>
            <TextInput
              value={code} onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={C.muted}
              keyboardType="number-pad" maxLength={6}
              style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8, marginTop: spacing.lg, borderWidth: 1, borderColor: C.border, borderRadius: radii.md, padding: spacing.lg }]}
            />
            <Pressable
              style={[styles.cta, (code.length < 4 || loading) && styles.ctaDisabled]}
              onPress={onVerify} disabled={code.length < 4 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaTxt}>Confirmer</Text>}
            </Pressable>
            <Pressable
              onPress={resendIn === 0 ? onSend : null} disabled={resendIn > 0}
              style={{ marginTop: spacing.lg, alignItems: 'center' }}
            >
              <Text style={{ color: resendIn > 0 ? C.muted : C.primary, fontWeight: '600' }}>
                {resendIn > 0 ? `Renvoyer dans ${resendIn}s` : 'Renvoyer le code'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  body: { padding: spacing.xxl, gap: spacing.lg },
  h2: { fontSize: 20, fontWeight: '700', color: C.text },
  help: { fontSize: 13, color: C.muted },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    paddingHorizontal: spacing.lg, marginTop: spacing.md,
  },
  prefix: { fontSize: 22 },
  input: { flex: 1, paddingVertical: spacing.lg, color: C.text, fontSize: 16 },
  cta: {
    backgroundColor: C.primary, paddingVertical: spacing.lg,
    borderRadius: radii.md, alignItems: 'center', marginTop: spacing.xxl,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
