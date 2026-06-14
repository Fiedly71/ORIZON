// SettingsScreen - parametres app : langue, devise, notifications, donnees.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, radii, spacing } from '../theme/colors';
import { useUI } from '../store/useUI';
import { useToast } from '../components/Toast';

const LANGS = [
  { id: 'fr', label: 'Francais' },
  { id: 'ht', label: 'Kreyol Ayisyen' },
  { id: 'en', label: 'English' },
];
const CURRENCIES = [
  { id: 'USD', label: 'Dollar US ($)' },
  { id: 'HTG', label: 'Gourde HT (HTG)' },
];

export default function SettingsScreen({ navigation }) {
  const toast = useToast();
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const isWeb = Platform.OS === 'web';

  const clearCache = async () => {
    Alert.alert('Vider le cache', 'Supprime les donnees locales (favoris locaux, recherches, prefs).', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          const keys = await AsyncStorage.getAllKeys();
          const toRemove = keys.filter((k) => k.startsWith('orizon.') && k !== 'orizon.session');
          await AsyncStorage.multiRemove(toRemove);
          toast.show('Cache vide', { type: 'success' });
        } catch (e) {
          Alert.alert('Erreur', e.message);
        }
        setBusy(false);
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Parametres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        {!isWeb && (
          <Section title="NOTIFICATIONS">
            <Toggle label="Notifications push" value={ui.notifPush} onChange={ui.setNotifPush} />
            <Toggle label="Emails ORIZON" value={ui.notifEmail} onChange={ui.setNotifEmail} />
          </Section>
        )}

        <Section title="DONNEES">
          <Pressable style={styles.actionRow} onPress={clearCache} disabled={busy}>
            <Ionicons name="trash-outline" size={18} color={C.text} />
            <Text style={styles.actionTxt}>Vider le cache local</Text>
          </Pressable>
        </Section>

        <Section title="LEGAL">
          <Pressable style={styles.actionRow} onPress={() => navigation.navigate('Terms')}>
            <Ionicons name="document-text-outline" size={18} color={C.text} />
            <Text style={styles.actionTxt}>Conditions generales</Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => navigation.navigate('Privacy')}>
            <Ionicons name="lock-closed-outline" size={18} color={C.text} />
            <Text style={styles.actionTxt}>Politique de confidentialite</Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        </Section>

        <Text style={styles.version}>ORIZON v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={C.text} style={{ marginRight: 10 }} />}
      <Text style={styles.rowLbl}>{label}</Text>
      {active && <Ionicons name="checkmark" size={20} color={C.primary} />}
    </Pressable>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLbl, { flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.primary, false: '#ccc' }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rowLbl: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  actionTxt: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  help: { fontSize: 11.5, color: C.muted, padding: spacing.md, fontStyle: 'italic' },
  version: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: spacing.lg },
});
