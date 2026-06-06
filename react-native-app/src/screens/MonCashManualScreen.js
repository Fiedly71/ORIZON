// MonCashManualScreen - Soumission paiement MonCash manuel.
// Le client paye sur MonCash, recoit une ref par SMS, puis soumet ici.
// Un admin valide ensuite la transaction dans son dashboard.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Linking,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import {
  submitMonCashManual,
  getMonCashInstructions,
  MONCASH_RECEIVER_NUMBER,
  MONCASH_RECEIVER_NAME,
  LISTING_FEE_HTG,
} from '../services/paymentsService';

const M = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  card: '#F5F5F5',
  border: '#E5E5E5',
  text: '#0A0A0A',
  muted: '#737373',
  accent: '#0A0A0A',
};

export default function MonCashManualScreen({ navigation, route }) {
  const propertyId = route?.params?.propertyId || null;
  const amount = route?.params?.amount || LISTING_FEE_HTG;
  const purpose = route?.params?.purpose || 'listing';

  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const instructions = getMonCashInstructions(amount);

  const copyNumber = async () => {
    try {
      await Clipboard.setStringAsync(MONCASH_RECEIVER_NUMBER);
      Alert.alert('Copie', `${MONCASH_RECEIVER_NUMBER} copie dans le presse-papiers.`);
    } catch {}
  };

  const openMonCash = () => {
    // Ouvre l'app MonCash si installee, sinon le code USSD
    if (Platform.OS === 'android') {
      Linking.openURL(`tel:*202%23`).catch(() => {
        Alert.alert('MonCash', 'Compose *202# depuis ton telephone pour acceder a MonCash.');
      });
    } else {
      Alert.alert('MonCash', 'Compose *202# depuis ton telephone pour acceder a MonCash.');
    }
  };

  const submit = async () => {
    if (!reference.trim()) {
      Alert.alert('Reference', 'Entre la reference MonCash recue par SMS.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Telephone', 'Entre le numero MonCash que tu as utilise pour payer.');
      return;
    }
    setBusy(true);
    try {
      const r = await submitMonCashManual({ propertyId, reference, phone, amount, purpose });
      if (!r.ok) {
        Alert.alert('Paiement', r.error || 'Echec de la soumission.');
        return;
      }
      Alert.alert(
        'Paiement soumis',
        r.message || 'Un admin va valider ta reference sous peu.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={M.text} />
        </Pressable>
        <Text style={styles.title}>Paiement MonCash</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Montant */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Montant a payer</Text>
          <Text style={styles.amountValue}>{amount.toLocaleString('fr-FR')} HTG</Text>
        </View>

        {/* Numero receveur */}
        <View style={styles.receiverCard}>
          <Text style={styles.receiverLabel}>Numero MonCash de paiement</Text>
          <Text style={styles.receiverName}>{MONCASH_RECEIVER_NAME}</Text>
          <View style={styles.numberRow}>
            <Text style={styles.receiverNumber}>{MONCASH_RECEIVER_NUMBER}</Text>
            <Pressable onPress={copyNumber} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <Text style={styles.copyTxt}>Copier</Text>
            </Pressable>
          </View>
        </View>

        {/* Instructions bilingues (creole + francais) */}
        <Text style={styles.sectionTitle}>Kijan pou peye / Comment payer</Text>
        {instructions.ht.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTxt}>{step}</Text>
              <Text style={styles.stepTxtFr}>{instructions.fr[i]}</Text>
            </View>
          </View>
        ))}

        <Pressable onPress={openMonCash} style={styles.openBtn}>
          <Ionicons name="phone-portrait-outline" size={16} color={M.text} />
          <Text style={styles.openBtnTxt}>Ouvrir MonCash (*202#)</Text>
        </Pressable>

        {/* Formulaire de soumission */}
        <Text style={styles.sectionTitle}>Apres avoir paye, soumets ta preuve</Text>

        <Text style={styles.fieldLabel}>Reference MonCash (recue par SMS)</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="ex: 4G0X9P2K7M"
          placeholderTextColor={M.muted}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Ton numero de telephone MonCash</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="ex: 38123456"
          placeholderTextColor={M.muted}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Pressable onPress={submit} disabled={busy} style={[styles.submitBtn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.submitTxt}>Soumettre la preuve de paiement</Text>
            </>
          )}
        </Pressable>

        <View style={styles.warnBox}>
          <Ionicons name="information-circle-outline" size={16} color={M.muted} />
          <Text style={styles.warnTxt}>
            Un administrateur verifiera ta transaction sur le numero {MONCASH_RECEIVER_NUMBER} et activera ton service. Cela prend en general quelques minutes a quelques heures.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: M.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: M.text },

  amountCard: {
    backgroundColor: M.text, borderRadius: 14, padding: 18,
    alignItems: 'center', marginBottom: 14,
  },
  amountLabel: { color: '#A3A3A3', fontSize: 12, fontWeight: '600' },
  amountValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },

  receiverCard: {
    backgroundColor: M.surface, borderWidth: 1, borderColor: M.border,
    borderRadius: 14, padding: 16, marginBottom: 18,
  },
  receiverLabel: { color: M.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  receiverName: { color: M.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  receiverNumber: { color: M.text, fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: M.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  copyTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: M.text, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: M.text, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepTxt: { flex: 1, color: M.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  stepTxtFr: { color: M.muted, fontSize: 12, lineHeight: 17, marginTop: 2, fontStyle: 'italic' },

  openBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: M.border, paddingVertical: 12, borderRadius: 10, marginTop: 6, marginBottom: 18, backgroundColor: M.surface },
  openBtnTxt: { color: M.text, fontWeight: '700', fontSize: 13 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: M.muted, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: M.surface, borderWidth: 1, borderColor: M.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: M.text, marginBottom: 8,
  },

  submitBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: M.text, paddingVertical: 14, borderRadius: 12, marginTop: 12,
  },
  submitTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  warnBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: M.surface, borderWidth: 1, borderColor: M.border,
    padding: 12, borderRadius: 10, marginTop: 16,
  },
  warnTxt: { flex: 1, fontSize: 11, color: M.muted, lineHeight: 16 },
});
