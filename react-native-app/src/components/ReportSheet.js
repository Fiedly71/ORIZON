// Modal "Signaler" - reutilisable pour annonce ou utilisateur.
// Insere une ligne dans `public.reports`.
import React, { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { reportTarget, REPORT_REASONS } from '../services/reportsService';
import { useAuthStore } from '../store/useAuthStore';

export default function ReportSheet({ visible, onClose, targetType, targetId, targetLabel }) {
  const [reason, setReason] = useState(REPORT_REASONS[0].id);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const user = useAuthStore((s) => s.user);

  const close = () => { setReason(REPORT_REASONS[0].id); setDetails(''); setDone(false); onClose?.(); };

  const submit = async () => {
    if (!user?.id) {
      alert?.('Connecte-toi pour signaler.');
      return;
    }
    setBusy(true);
    const r = await reportTarget({ targetType, targetId, reason, details });
    setBusy(false);
    if (r.ok) setDone(true);
    else alert?.(r.error || 'Echec du signalement');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
            <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
            <Text style={styles.title}>Merci !</Text>
            <Text style={styles.sub}>Ton signalement a ete envoye a notre equipe. Nous l'examinons sous 24-48h.</Text>
            <Pressable style={styles.cta} onPress={close}><Text style={styles.ctaTxt}>Fermer</Text></Pressable>
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <Ionicons name="flag-outline" size={20} color="#DC2626" />
              <Text style={styles.title}>Signaler {targetType === 'property' ? 'cette annonce' : 'ce compte'}</Text>
            </View>
            {targetLabel ? <Text style={styles.label}>{targetLabel}</Text> : null}
            <Text style={styles.section}>RAISON</Text>
            <View style={{ gap: 8 }}>
              {REPORT_REASONS.map((r) => (
                <Pressable key={r.id} style={[styles.opt, reason === r.id && styles.optOn]} onPress={() => setReason(r.id)}>
                  <Ionicons name={reason === r.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={reason === r.id ? C.primary : C.muted} />
                  <Text style={[styles.optTxt, reason === r.id && { color: C.text, fontWeight: '700' }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>DETAILS (OPTIONNEL)</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Decris brievement le probleme..."
              placeholderTextColor={C.muted}
              multiline
              style={styles.textarea}
            />
            <Text style={styles.warn}>Les faux signalements peuvent entrainer la suspension de ton compte.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={[styles.cta, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={close}>
                <Text style={[styles.ctaTxt, { color: C.text }]}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.cta, { flex: 1, backgroundColor: '#DC2626' }]} onPress={submit} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Envoyer</Text>}
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18 },
  label: { fontSize: 12, color: C.muted, marginBottom: 14 },
  section: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 18, marginBottom: 10, letterSpacing: 0.5 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: '#F9FAFB' },
  optOn: { backgroundColor: '#EEF2FF' },
  optTxt: { fontSize: 14, color: C.muted },
  textarea: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: C.text },
  warn: { fontSize: 11, color: '#92400E', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginTop: 14, marginBottom: 12 },
  cta: { backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
