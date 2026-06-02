// ResetPasswordScreen - definit un nouveau mot de passe.
// Accessible:
//   - depuis le profil ("Changer mot de passe", utilisateur connecte)
//   - via deep link 'orizon://reset-password' apres clic sur l'email magique
//     (Supabase ouvre l'app avec une session active).
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { updatePassword } from '../services/authService';

export default function ResetPasswordScreen({ navigation, route }) {
  const fromProfile = route?.params?.fromProfile;
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (pwd.length < 8) {
      Alert.alert('Mot de passe', 'Au moins 8 caracteres.');
      return;
    }
    if (pwd !== pwd2) {
      Alert.alert('Mot de passe', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      const r = await updatePassword(pwd);
      if (!r.ok) {
        Alert.alert('Erreur', r.error || 'Echec.');
        return;
      }
      Alert.alert(
        'Mot de passe change',
        'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
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
        <Text style={styles.headerTxt}>
          {fromProfile ? 'Changer mot de passe' : 'Nouveau mot de passe'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>
          {fromProfile ? 'Definis un nouveau mot de passe' : 'Cree ton nouveau mot de passe'}
        </Text>
        <Text style={styles.txt}>
          Au moins 8 caracteres. Utilise un melange de lettres, chiffres et symboles.
        </Text>

        <View style={{ gap: 6, marginTop: 18 }}>
          <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={pwd}
              onChangeText={setPwd}
              placeholder="********"
              placeholderTextColor={C.muted}
              secureTextEntry={!show}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 6, marginTop: 12 }}>
          <Text style={styles.label}>CONFIRMER</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={pwd2}
              onChangeText={setPwd2}
              placeholder="********"
              placeholderTextColor={C.muted}
              secureTextEntry={!show}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        </View>

        <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Mettre a jour</Text>}
        </Pressable>
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
  body: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 12 },
  txt: { fontSize: 13, color: C.muted, lineHeight: 19, marginTop: 6 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: C.text },
  cta: {
    marginTop: 24, backgroundColor: C.accent,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
