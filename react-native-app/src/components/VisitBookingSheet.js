// VisitBookingSheet - bottom sheet modal pour reserver une visite.
// L'utilisateur choisit parmi les creneaux que le proprietaire a explicitement
// rendus disponibles (property.visitSlots) lors de la creation de l'annonce.
// Apres confirmation : cree la visite, ouvre la conversation, envoie un message
// automatique au proprietaire avec le recap de la demande.
import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { requestVisit } from '../services/visitsService';
import { openConversation, sendMessage } from '../services/messagingService';

function formatSlotDate(date) {
  try {
    const d = new Date(date + 'T00:00:00');
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return date; }
}

export default function VisitBookingSheet({ visible, onClose, property, onBooked }) {
  const slots = useMemo(
    () => (Array.isArray(property?.visitSlots) ? property.visitSlots : []),
    [property?.visitSlots],
  );

  const [selectedIdx, setSelectedIdx] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setSelectedIdx(null); setNotes(''); };
  const handleClose = () => { reset(); onClose?.(); };

  const submit = async () => {
    const s = slots[selectedIdx];
    if (!s) {
      Alert.alert('Manquant', 'Choisis un créneau parmi ceux proposes par le propriétaire.');
      return;
    }
    if (!property?.ownerId) {
      Alert.alert('Indisponible', "Ce vendeur n'a pas encore lie son compte.");
      return;
    }
    setSubmitting(true);
    const scheduledAt = `${s.date}T${s.start}:00`;
    const r = await requestVisit({
      propertyId: property?.id,
      ownerId: property?.ownerId,
      scheduledAt,
      notes,
    });
    if (!r.ok) {
      setSubmitting(false);
      Alert.alert('Erreur', r.error || "Impossible d'envoyer la demande.");
      return;
    }

    // Ouvre la conversation et envoie un message recapitulatif automatique
    // au proprietaire pour qu'il voie tout en un coup d'oeil.
    const recapMsg =
      `Demande de visite | ${property?.title || 'annonce'}\n` +
      `Date : ${formatSlotDate(s.date)}\n` +
      `Horaire : ${s.start} - ${s.end}\n` +
      (notes ? `Note : ${notes}\n` : '') +
      `\nMerci de confirmer cette visite depuis ton onglet Mes visites.`;
    try {
      const conv = await openConversation({ propertyId: property?.id, ownerId: property?.ownerId });
      if (conv.ok && conv.data?.id) {
        await sendMessage(conv.data.id, recapMsg);
      }
    } catch (_) {}

    setSubmitting(false);
    Alert.alert(
      'Demande envoyée',
      `Visite demandee pour le ${formatSlotDate(s.date)} a ${s.start}.\nLe propriétaire a reçu ton message.`,
    );
    onBooked?.();
    reset();
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Demander une visite</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {slots.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={48} color={C.muted} />
              <Text style={styles.emptyTitle}>Aucun créneau proposé</Text>
              <Text style={styles.emptyTxt}>
                Ce vendeur n'a pas encore renseigné ses disponibilités. Tu peux quand
                même le contacter pour convenir d'une date.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.h2}>Choisis un créneau proposé par le vendeur</Text>
              <View style={{ gap: 10, marginTop: spacing.md }}>
                {slots.map((s, i) => {
                  const isSel = selectedIdx === i;
                  return (
                    <Pressable
                      key={`${s.date}-${s.start}-${i}`}
                      onPress={() => setSelectedIdx(i)}
                      style={[styles.slotCard, isSel && styles.slotCardActive]}
                    >
                      <Ionicons
                        name={isSel ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSel ? C.primary : C.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.slotDate, isSel && { color: C.primary }]}>
                          {formatSlotDate(s.date)}
                        </Text>
                        <Text style={styles.slotTime}>{s.start} - {s.end}</Text>
                      </View>
                    </Pressable>
                  );
                })}
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
            </>
          )}
        </ScrollView>

        {slots.length > 0 && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.cta, (selectedIdx === null || submitting) && styles.ctaDisabled]}
              onPress={submit}
              disabled={selectedIdx === null || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaTxt}>Envoyer la demande</Text>}
            </Pressable>
          </View>
        )}
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
  slotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.border, borderRadius: radii.md, backgroundColor: '#fff',
  },
  slotCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  slotDate: { fontSize: 14, fontWeight: '700', color: C.text },
  slotTime: { fontSize: 13, color: C.muted, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: radii.md,
    padding: spacing.lg, minHeight: 80, color: C.text, textAlignVertical: 'top',
  },
  emptyWrap: { alignItems: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 8 },
  emptyTxt: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
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
