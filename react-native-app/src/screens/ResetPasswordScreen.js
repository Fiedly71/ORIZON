// ResetPasswordScreen - definit un nouveau mot de passe.
// Accessible:
//   - depuis le profil ("Changer mot de passe", utilisateur connecte)
//   - via deep link 'orizon://reset-password' apres clic sur l'email magique
//     (Supabase ouvre l'app avec une session active).
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { recoverAuthSessionFromRecoveryLink, updatePassword } from '../services/authService';

export default function ResetPasswordScreen({ navigation, route }) {
  const fromProfile = route?.params?.fromProfile;
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(!fromProfile);

  const ensureRecoverySession = async () => {
    if (fromProfile) return { ok: true, fromProfile: true };

    const urls = [];
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.href) {
      urls.push(window.location.href);
    }
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) urls.push(initialUrl);
    } catch (_) {}

    const routeParams = route?.params || {};
    const urlFromParams = routeParams.url || routeParams.link || null;
    if (urlFromParams) urls.push(urlFromParams);

    let last = { ok: false, error: 'missing_session_params' };
    // Essaie tous les liens candidats (web hash, deep-link initial, params route).
    for (const url of urls) {
      last = await recoverAuthSessionFromRecoveryLink({ url, routeParams });
      if (last.ok) return last;
    }
    // Dernière tentative: parfois les params existent sans URL complète.
    last = await recoverAuthSessionFromRecoveryLink({ routeParams });
    return last;
  };

  useEffect(() => {
    let alive = true;
    if (fromProfile) {
      setRecovering(false);
      return () => { alive = false; };
    }
    (async () => {
      setRecovering(true);
      await ensureRecoverySession();
      if (alive) setRecovering(false);
    })();
    return () => { alive = false; };
  }, [fromProfile]);

  const onSubmit = async () => {
    if (pwd.length < 8) {
      Alert.alert('Mot de passe', 'Au moins 8 caractères.');
      return;
    }
    if (pwd !== pwd2) {
      Alert.alert('Mot de passe', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      if (!fromProfile) {
        const rec = await ensureRecoverySession();
        if (!rec.ok && rec.error === 'missing_session_params') {
          Alert.alert(
            'Lien invalide',
            'Ce lien de réinitialisation est incomplet. Redemande un nouveau lien depuis "Mot de passe oublié".',
          );
          return;
        }
      }

      let r = await updatePassword(pwd);
      if (!r.ok && /auth session missing|invalid session|session missing/i.test(r.error || '')) {
        const rec2 = await ensureRecoverySession();
        if (rec2.ok) {
          r = await updatePassword(pwd);
        }
      }

      if (!r.ok) {
        // Traduit les erreurs Supabase les plus fréquentes en messages lisibles.
        let msg = r.error || 'Échec.';
        if (/same password|same as/i.test(msg)) {
          msg = 'Ce mot de passe est identique à l\'ancien. Choisis-en un différent.';
        } else if (/auth session missing|session.*expired|token.*expired|invalid.*session/i.test(msg)) {
          msg = 'Ton lien de réinitialisation a expiré. Fais une nouvelle demande depuis l\'écran "Mot de passe oublié".';
        } else if (/weak password|too short/i.test(msg)) {
          msg = 'Mot de passe trop simple. Utilise au moins 8 caractères avec lettres et chiffres.';
        } else if (/should be different from/i.test(msg)) {
          msg = 'Ce mot de passe est trop similaire à l\'ancien. Choisis-en un différent.';
        }
        Alert.alert('Erreur', msg);
        return;
      }
      Alert.alert(
        'Mot de passe changé',
        'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
        [{ text: 'OK', onPress: () => {
          if (fromProfile) {
            navigation.goBack();
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
          }
        } }],
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
          {fromProfile ? 'Definis un nouveau mot de passe' : 'Crée ton nouveau mot de passe'}
        </Text>
        <Text style={styles.txt}>
          Au moins 8 caracteres. Utilise un melange de lettres, chiffres et symboles.
        </Text>

        {!fromProfile && recovering ? (
          <View style={styles.recoverWrap}>
            <ActivityIndicator color={C.primary} size="small" />
            <Text style={styles.recoverTxt}>Validation de ton lien de réinitialisation...</Text>
          </View>
        ) : null}

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

        <Pressable style={[styles.cta, (busy || recovering) && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy || recovering}>
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
  recoverWrap: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recoverTxt: { fontSize: 12, color: C.muted, flex: 1 },
  cta: {
    marginTop: 24, backgroundColor: C.accent,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
