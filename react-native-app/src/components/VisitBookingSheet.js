// VisitBookingSheet - bottom sheet modal pour reserver une visite.
// Selection date + creneau horaire + notes. Cree une visite via visitsService.
import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import CalendarPicker from './CalendarPicker';
import { requestVisit } from '../services/visitsService';

const SLOTS = ['09:00','10:00','11:00','14:00','15:00','16:00','17:00'];

export default function VisitBookingSheet({ visible, onClose, property }) {
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setDate(null); setSlot(null); setNotes(''); };

  const submit = async () => {
    if (!date || !slot) {
      Alert.alert('Manquant', 'Choisis une date et un creneau.');
      return;
    }
    setSubmitting(true);
    const scheduledAt = `${date}T${slot}:00`;
    const r = await requestVisit({
      propertyId: property?.id,
      ownerId: property?.ownerId || null,
      scheduledAt,
      notes,
    });
    setSubmitting(false);
    if (r.ok) {
      Alert.alert('Demande envoyee', `Visite le ${date} a ${slot}.\nLe proprietaire sera notifie.`);
      reset();
      onClose?.();
    } else {
      Alert.alert('Erreur', r.error || 'Impossible d\'envoyer la demande.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Demander une visite</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.h2}>Choisis une date</Text>
          <CalendarPicker mode="single" value={date} onChange={setDate} />

          <Text style={styles.h2}>Creneau</Text>
          <View style={styles.slotsRow}>
            {SLOTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={[styles.slot, slot === s && styles.slotActive]}
              >
                <Text style={[styles.slotTxt, slot === s && styles.slotTxtActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.h2}>Note (optionnel)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Je suis interesse par un financement, dispo apres 15h..."
            placeholderTextColor={C.muted}
            multiline
            style={styles.input}
          />

          {(date || slot) && (
            <View style={styles.recap}>
              <Ionicons name="calendar" size={18} color={C.primary} />
              <Text style={styles.recapTxt}>
                {date || '—'}{slot ? ` a ${slot}` : ''}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, (!date || !slot || submitting) && styles.ctaDisabled]}
            onPress={submit}
            disabled={!date || !slot || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaTxt}>Envoyer la demande</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
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
  body: { padding: spacing.xxl, paddingBottom: 100 },
  h2: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: spacing.xxl, marginBottom: spacing.md },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  slot: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: C.border,
  },
  slotActive: { backgroundColor: C.primary, borderColor: C.primary },
  slotTxt: { color: C.text, fontWeight: '600' },
  slotTxtActive: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    padding: spacing.lg, minHeight: 80, color: C.text, textAlignVertical: 'top',
  },
  recap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: C.primarySoft, padding: spacing.lg, borderRadius: radii.md,
    marginTop: spacing.xxl,
  },
  recapTxt: { color: C.primary, fontWeight: '700' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.xxl, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: {
    backgroundColor: C.primary, paddingVertical: spacing.lg,
    borderRadius: radii.md, alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
