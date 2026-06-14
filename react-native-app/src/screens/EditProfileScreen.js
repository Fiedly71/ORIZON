// EditProfileScreen - Modifier les infos du profil utilisateur.
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, ActivityIndicator,
  ActionSheetIOS, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, canPublish } from '../services/authService';
import { pickImages, uploadImage } from '../services/storageService';

export default function EditProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    agencyName: user?.agencyName || '',
    address: user?.address || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || null,
  });

  const isAgency = user?.role === 'Agence';
  const isPublisher = canPublish(user?.role);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPickAvatar = async () => {
    // Sur web, Alert.alert avec boutons n'existe pas -> on ouvre directement la galerie
    // (le navigateur mobile propose camera ou fichier via son selecteur natif).
    if (Platform.OS === 'web') {
      await onPickFromGallery();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Camera', 'Galerie', 'Annuler'], cancelButtonIndex: 2, userInterfaceStyle: 'light' },
        (i) => {
          if (i === 0) onTakePhoto();
          else if (i === 1) onPickFromGallery();
        }
      );
    } else {
      Alert.alert('Photo', 'Choisir source', [
        { text: 'Camera', onPress: onTakePhoto },
        { text: 'Galerie', onPress: onPickFromGallery },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const onTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Permission refusee');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    await uploadAndSetAvatar(asset);
  };

  const onPickFromGallery = async () => {
    const r = await pickImages({ multi: false });
    if (!r.ok) {
      if (!r.canceled) Alert.alert('Photo', r.error || 'Selection annulee');
      return;
    }
    const asset = r.assets?.[0];
    if (!asset) return;
    await uploadAndSetAvatar(asset);
  };

  const uploadAndSetAvatar = async (asset) => {
    update('avatarUrl', asset.uri);
    setUploading(true);
    try {
      const up = await uploadImage(asset.uri, {
        folder: 'avatars', mime: asset.mime, compress: 0.6, generateThumb: false,
      });
      if (!up.ok) {
        Alert.alert('Upload photo', `Echec: ${up.error || 'erreur inconnue'}.\n\nSi le bucket "property-images" n'existe pas sur Supabase, l'admin doit executer db/storage.sql.`);
        return;
      }
      update('avatarUrl', up.url || asset.uri);
      const sav = await updateProfile({ avatarUrl: up.url });
      if (!sav?.ok) {
        Alert.alert('Profil', sav?.error || 'Photo uploadee mais profil non sauvegarde.');
      }
    } catch (e) {
      Alert.alert('Upload photo', `Erreur: ${e.message || String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Profil', 'Le nom complet est obligatoire.');
      return;
    }
    if (form.phone && form.phone.trim().length < 8) {
      Alert.alert('Profil', 'Numero de telephone invalide.');
      return;
    }
    setBusy(true);
    try {
      const r = await updateProfile(form);
      if (!r.ok) {
        Alert.alert('Profil', r.error || 'Echec de la mise a jour.');
        return;
      }
      Alert.alert('Profil', 'Tes informations ont ete mises a jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const initial = (form.fullName || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Modifier le profil</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <Pressable style={styles.avatarWrap} onPress={onPickAvatar}>
            {form.avatarUrl ? (
              <Image source={{ uri: form.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraDot}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            {uploading ? 'Telechargement...' : 'Touche pour changer ta photo'}
          </Text>
        </View>

        <Field label="NOM COMPLET *" value={form.fullName} onChangeText={(v) => update('fullName', v)} placeholder="Jean Pierre" />

        {isAgency && (
          <Field label="NOM DE L'AGENCE" value={form.agencyName} onChangeText={(v) => update('agencyName', v)} placeholder="ORIZON Immobilier SA" />
        )}

        <Field
          label="TELEPHONE"
          value={form.phone}
          onChangeText={(v) => update('phone', v)}
          placeholder="+509 XX XX XX XX"
          keyboardType="phone-pad"
        />

        <Field
          label="ADRESSE"
          value={form.address}
          onChangeText={(v) => update('address', v)}
          placeholder="Petion-Ville, Port-au-Prince"
        />

        {isPublisher && (
          <Field
            label="BIO / PRESENTATION"
            value={form.bio}
            onChangeText={(v) => update('bio', v)}
            placeholder="Quelques mots sur toi ou ton agence..."
            multiline
            inputStyle={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }}
          />
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.muted} />
          <Text style={styles.infoTxt}>
            Pour modifier ton email ou ton role, contacte le support ORIZON.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={onSave} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>Enregistrer</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, inputStyle, ...props }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={C.muted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },

  body: { padding: 16, gap: 14, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },

  avatarBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 92, height: 92, borderRadius: 46, backgroundColor: C.surface },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 36 },
  cameraDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 11, color: C.muted },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },

  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: C.surface, padding: 12, borderRadius: 10, marginTop: 8,
  },
  infoTxt: { flex: 1, fontSize: 11, color: C.muted, lineHeight: 15 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff' },
  cta: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
