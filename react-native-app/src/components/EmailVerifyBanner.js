// EmailVerifyBanner - bandeau global affiché quand l'utilisateur est connecté
// mais que son email n'est pas encore vérifié. Rappelle et propose de renvoyer
// le mail de confirmation. Se cache automatiquement dès que l'email est validé.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/useAuthStore';
import { resendEmailVerification } from '../services/authService';
import { appAlert } from '../utils/appAlert';

export default function EmailVerifyBanner() {
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isVerified = !!(user?.emailConfirmedAt || user?.emailVerified);
  if (!user || isVerified || dismissed) return null;

  const onResend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await resendEmailVerification();
      appAlert(
        'Email de vérification',
        r.ok ? 'Email renvoyé. Vérifie ta boîte de réception (et les spams).' : (r.error || 'Échec de l\'envoi.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Ionicons name="mail-unread-outline" size={16} color="#78350F" />
        <Text style={styles.txt} numberOfLines={2}>
          Vérifie ton email pour publier, contacter et payer.
        </Text>
        <Pressable onPress={onResend} disabled={busy} style={styles.btn} hitSlop={6}>
          <Text style={styles.btnTxt}>{busy ? '...' : 'Renvoyer'}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={16} color="#78350F" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txt: {
    flex: 1,
    color: '#78350F',
    fontSize: 12,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    padding: 4,
  },
});
