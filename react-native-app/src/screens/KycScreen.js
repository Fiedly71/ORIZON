// KycScreen - Verification d'identite (badge "Verifie").
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, Alert, ActivityIndicator,
  ActionSheetIOS, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { C, radii, spacing } from '../theme/colors';
import { submitKyc, getMyKycStatus, KYC_STATUS, DOC_TYPES } from '../services/kycService';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../store/useAuthStore';
import { requireEmailVerified } from '../utils/emailVerifyGuard';

const DOC_LABELS = { cin: 'CIN', passport: 'Passeport', driver_license: 'Permis de conduire' };

export default function KycScreen({ navigation }) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: '', docType: 'cin', docNumber: '', selfieUri: null, docFrontUri: null, docBackUri: null,
  });

  useEffect(() => {
    if (user && !(user.emailConfirmedAt || user.emailVerified)) {
      requireEmailVerified('soumettre ta vérification KYC');
      navigation.goBack();
    }
  }, [user, navigation]);

  useEffect(() => {
    getMyKycStatus().then((r) => {
      if (r.ok && r.data) setStatus(r.data);
      setLoading(false);
    });
  }, []);

  const pick = async (key) => {
    const options = [
      { text: 'Camera', onPress: async () => await takePhoto(key) },
      { text: 'Galerie', onPress: async () => await pickFromGallery(key) },
      { text: 'Annuler', style: 'cancel' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: options.map((o) => o.text), cancelButtonIndex: 2, userInterfaceStyle: 'light' },
        (i) => {
          if (i === 0) takePhoto(key);
          else if (i === 1) pickFromGallery(key);
        }
      );
    } else {
      Alert.alert('Photo', 'Choisir source', options);
    }
  };

  const takePhoto = async (key) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Permission refusee');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    setForm({ ...form, [key]: asset.uri });
  };

  const pickFromGallery = async (key) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Galerie', 'Permission refusee');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    setForm({ ...form, [key]: asset.uri });
  };

  const submit = async () => {
    if (!form.fullName || !form.docNumber || !form.selfieUri || !form.docFrontUri) {
      Alert.alert('ORIZON', 'Nom, numéro, selfie et recto requis.'); return;
    }
    setBusy(true);
    const r = await submitKyc(form);
    setBusy(false);
    if (r.ok) {
      toast.show('Demande envoyée. Vérification sous 24-48h.', { type: 'success' });
      const s = await getMyKycStatus();
      if (s.ok) setStatus(s.data);
    } else Alert.alert('Erreur', r.error);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Vérification (KYC)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {status?.status === KYC_STATUS.APPROVED ? (
          <View style={[styles.banner, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="shield-checkmark" size={28} color={C.success} />
            <Text style={[styles.bannerTxt, { color: '#065F46' }]}>Compte vérifié</Text>
            <Text style={styles.bannerSub}>Le badge "Vérifié" est visible sur tes annonces.</Text>
          </View>
        ) : status?.status === KYC_STATUS.PENDING ? (
          <View style={[styles.banner, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={28} color="#92400E" />
            <Text style={[styles.bannerTxt, { color: '#92400E' }]}>Vérification en cours</Text>
            <Text style={styles.bannerSub}>Réponse sous 24-48h ouvrées.</Text>
          </View>
        ) : status?.status === KYC_STATUS.REJECTED ? (
          <View style={[styles.banner, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={28} color={C.danger} />
            <Text style={[styles.bannerTxt, { color: '#991B1B' }]}>Demande rejetée</Text>
            <Text style={styles.bannerSub}>Tu peux soumettre une nouvelle demande.</Text>
          </View>
        ) : (
          <Text style={styles.intro}>
            Pour obtenir le badge "Vérifié" et rassurer les acheteurs, soumets une pièce d'identité + un selfie.
          </Text>
        )}

        {(status?.status !== KYC_STATUS.APPROVED && status?.status !== KYC_STATUS.PENDING) && (
          <>
            <Text style={styles.label}>Nom complet (comme sur la pièce)</Text>
            <TextInput style={styles.input} value={form.fullName}
              onChangeText={(v) => setForm({ ...form, fullName: v })} placeholder="Ex: Jean Pierre" placeholderTextColor={C.muted} />

            <Text style={styles.label}>Type de pièce</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DOC_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setForm({ ...form, docType: t })}
                  style={[styles.chip, form.docType === t && styles.chipActive]}>
                  <Text style={[styles.chipTxt, form.docType === t && { color: '#fff' }]}>{DOC_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Numéro de la pièce</Text>
            <TextInput style={styles.input} value={form.docNumber}
              onChangeText={(v) => setForm({ ...form, docNumber: v })} placeholder="Ex: 003-456-789" placeholderTextColor={C.muted} />

            <Text style={styles.label}>Selfie (visage clair, sans lunettes)</Text>
            <PhotoBtn uri={form.selfieUri} onPress={() => pick('selfieUri')} icon="person-circle-outline" />

            <Text style={styles.label}>Photo recto de la pièce</Text>
            <PhotoBtn uri={form.docFrontUri} onPress={() => pick('docFrontUri')} icon="card-outline" />

            <Text style={styles.label}>Photo verso (si applicable)</Text>
            <PhotoBtn uri={form.docBackUri} onPress={() => pick('docBackUri')} icon="card-outline" />

            <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Soumettre la demande</Text>}
            </Pressable>

            <Text style={styles.help}>
              Tes documents sont stockes de maniere securisee et utilises uniquement pour la verification.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PhotoBtn({ uri, onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={styles.photoBtn}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoImg} />
      ) : (
        <>
          <Ionicons name={icon} size={32} color={C.muted} />
          <Text style={styles.photoTxt}>Toucher pour ajouter</Text>
        </>
      )}
    </Pressable>
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
  intro: { fontSize: 14, color: C.muted, marginBottom: spacing.lg, lineHeight: 20 },
  banner: { padding: spacing.lg, borderRadius: radii.lg, marginBottom: spacing.lg, alignItems: 'center' },
  bannerTxt: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  bannerSub: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: spacing.lg, marginBottom: 6, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: radii.md, padding: spacing.md, color: C.text, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 12.5, color: C.text, fontWeight: '600' },
  photoBtn: { borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: radii.md, height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  photoImg: { width: '100%', height: '100%', borderRadius: radii.md, resizeMode: 'cover' },
  photoTxt: { color: C.muted, marginTop: 6, fontSize: 12 },
  cta: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.xl },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  help: { fontSize: 11, color: C.muted, marginTop: spacing.lg, textAlign: 'center' },
});
