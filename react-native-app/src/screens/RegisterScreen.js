// Ecran d'inscription ORIZON.
// Etape 1: choix du type de compte (Acheteur/Locataire OU Proprietaire/Agence).
// Etape 2: formulaire adapte au role.
//   - Acheteur/Locataire: nom, email, tel, password, T&C.
//   - Proprietaire/Agence: + photo de profil OBLIGATOIRE, piece legale (CIN/passeport/permis)
//     OBLIGATOIRE recto (verso si CIN/permis), nom de l'agence (si Agence), T&C.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import PickerField from '../components/PickerField';
import { DEPARTMENTS, CITIES_BY_DEPT, formatLocation } from '../constants/haiti';
import { C } from '../theme/colors';
import { appAlert } from '../utils/appAlert';
import { signUp } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { pickImages, uploadImage } from '../services/storageService';
import { submitKyc, DOC_TYPES } from '../services/kycService';

const ROLE_BUYER = 'Acheteur / Locataire';
const ROLE_OWNER = 'Proprietaire';
const ROLE_AGENCY = 'Agence';

const DOC_LABELS = {
  cin: "Carte d'identité (CIN)",
  passport: 'Passeport',
  driver_license: 'Permis de conduire',
};

export default function RegisterScreen({ navigation }) {
  const loading = useAuthStore((s) => s.loading);

  const [stage, setStage] = useState('role'); // 'role' | 'form'
  const [role, setRole] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    agencyName: '',
    email: '',
    phone: '',
    address: '',
    dept: '',
    city: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    profilePhoto: null,
    docType: 'cin',
    docNumber: '',
    docFront: null,
    docBack: null,
    referralCode: '',
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isPublisher = role === ROLE_OWNER || role === ROLE_AGENCY;

  const pickOne = async (key) => {
    const r = await pickImages({ multi: false, max: 1 });
    if (!r.ok || !r.assets?.length) return;
    update(key, r.assets[0]);
  };

  const validate = () => {
    const errors = [];
    if (!form.fullName.trim()) errors.push('Nom complet requis');
    if (role === ROLE_AGENCY && !form.agencyName.trim()) errors.push("Nom de l'agence requis");
    if (!form.email.includes('@')) errors.push('Email invalide');
    if (!form.phone.trim()) errors.push('Téléphone requis');
    if (form.password.length < 6) errors.push('Mot de passe trop court (6+ caractères)');
    if (form.password !== form.confirmPassword) errors.push('Les mots de passe ne correspondent pas');
    if (!form.acceptTerms) errors.push("Tu dois accepter les conditions d'utilisation");
    if (isPublisher) {
      if (!form.dept) errors.push('Departement requis');
      if (!form.city) errors.push('Ville requise');
      if (!form.address.trim()) errors.push('Adresse requise');
      if (!form.profilePhoto) errors.push('Photo de profil requise');
      if (!form.docNumber.trim()) errors.push('Numéro du document requis');
      if (!form.docFront) errors.push('Photo recto du document requise');
      if (form.docType !== 'passport' && !form.docBack) errors.push('Photo verso du document requise');
    }
    return errors;
  };

  const onSubmit = async () => {
    const errors = validate();
    if (errors.length > 0) {
      appAlert('Inscription incomplète', '• ' + errors.join('\n• '));
      return;
    }
    setBusy(true);
    try {
      const res = await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        role,
        address: isPublisher
          ? [form.address.trim(), form.city, form.dept].filter(Boolean).join(', ')
          : '',
        city: isPublisher ? form.city : '',
        department: isPublisher ? form.dept : '',
        referralCode: form.referralCode.trim() || null,
      });
      if (!res.ok) {
        appAlert('Inscription', res.error || 'Échec de la création du compte.');
        return;
      }

      if (isPublisher) {
        if (form.profilePhoto?.uri) {
          await uploadImage(form.profilePhoto.uri, { folder: 'profile-photos', mime: 'image/jpeg' });
        }
        const kycRes = await submitKyc({
          fullName: form.fullName.trim(),
          docType: form.docType,
          docNumber: form.docNumber.trim(),
          selfieUri: form.profilePhoto?.uri,
          docFrontUri: form.docFront?.uri,
          docBackUri: form.docBack?.uri,
        });
        if (!kycRes.ok) {
          appAlert(
            'Compte créé',
            "Ton compte est créé mais l'envoi des documents a échoué. Tu peux les renvoyer depuis ton profil.\n\n" +
              (kycRes.error || '')
          );
          return;
        }
      }

      if (res.needsEmailConfirm) {
        appAlert(
          'Vérifie ton email',
          isPublisher
            ? 'Compte créé ! Vérifie ton email. Ton dossier KYC sera examiné sous 24-48h avant que tu puisses publier.'
            : 'Compte créé ! Vérifie ton email pour activer ton compte.'
        );
      } else if (isPublisher) {
        appAlert(
          'Bienvenue sur ORIZON',
          'Ton compte est actif. Ton dossier KYC sera examiné sous 24-48h avant que tu puisses publier des annonces.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'role') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image
              source={require('../../assets/logo-vertical.png')}
              style={styles.logoImg}
              resizeMode="contain"
              accessibilityLabel="ORIZON"
            />
            <Text style={styles.h1}>Crée ton compte</Text>
            <Text style={styles.sub}>Choisis le type de compte qui te correspond.</Text>
          </View>

          <Pressable style={styles.roleCard} onPress={() => { setRole(ROLE_BUYER); setStage('form'); }}>
            <View style={[styles.roleIconWrap, { backgroundColor: C.primarySoft }]}>
              <Ionicons name="search-outline" size={28} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleCardTitle}>Acheteur / Locataire</Text>
              <Text style={styles.roleCardSub}>Je cherche une maison, un appartement ou un terrain à acheter ou louer.</Text>
              <Text style={styles.roleBullet}>• Inscription rapide (2 minutes)</Text>
              <Text style={styles.roleBullet}>• Aucun document requis</Text>
              <Text style={styles.roleBullet}>• Gratuit</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </Pressable>

          <Pressable style={styles.roleCard} onPress={() => { setRole(ROLE_OWNER); setStage('form'); }}>
            <View style={[styles.roleIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="home-outline" size={28} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleCardTitle}>Propriétaire</Text>
              <Text style={styles.roleCardSub}>Je veux publier ma propre maison, terrain ou appartement à vendre ou à louer.</Text>
              <Text style={styles.roleBullet}>• Photo de profil obligatoire</Text>
              <Text style={styles.roleBullet}>• Pièce d'identité obligatoire (vérification KYC)</Text>
              <Text style={styles.roleBullet}>• 20 USD (2 500 HTG) par publication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </Pressable>

          <Pressable style={styles.roleCard} onPress={() => { setRole(ROLE_AGENCY); setStage('form'); }}>
            <View style={[styles.roleIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="business-outline" size={28} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleCardTitle}>Agence immobilière</Text>
              <Text style={styles.roleCardSub}>Je représente une agence et publie plusieurs biens pour mes clients.</Text>
              <Text style={styles.roleBullet}>• Vérification KYC complète</Text>
              <Text style={styles.roleBullet}>• Licence d'agence requise</Text>
              <Text style={styles.roleBullet}>• 20 USD (2 500 HTG) par publication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkTxt}>Déjà inscrit ? <Text style={{ color: C.primary, fontWeight: '700' }}>Se connecter</Text></Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setStage('role')} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
          <Text style={styles.backTxt}>Changer de type de compte</Text>
        </Pressable>

        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-horizontal.png')}
            style={styles.logoHorz}
            resizeMode="contain"
            accessibilityLabel="ORIZON"
          />
          <Text style={styles.h1}>{role}</Text>
          <Text style={styles.sub}>
            {isPublisher
              ? 'Remplis tes informations. Tous les champs sont obligatoires.'
              : 'Remplis tes informations pour commencer à explorer.'}
          </Text>
        </View>

        <View style={styles.form}>
          {role === ROLE_AGENCY && (
            <>
              <Text style={styles.label}>NOM DE L'AGENCE *</Text>
              <TextInput value={form.agencyName} onChangeText={(v) => update('agencyName', v)} placeholder="Ex: ORIZON Real Estate" placeholderTextColor={C.muted} style={styles.field} />
            </>
          )}

          <Text style={styles.label}>{role === ROLE_AGENCY ? 'RESPONSABLE LÉGAL *' : 'NOM COMPLET *'}</Text>
          <TextInput value={form.fullName} onChangeText={(v) => update('fullName', v)} placeholder="Prénom Nom" placeholderTextColor={C.muted} style={styles.field} />

          <Text style={styles.label}>EMAIL *</Text>
          <TextInput value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="toi@orizon.ht" placeholderTextColor={C.muted} style={styles.field} />

          <Text style={styles.label}>TÉLÉPHONE *</Text>
          <TextInput value={form.phone} onChangeText={(v) => update('phone', v)} keyboardType="phone-pad" placeholder="+509 ..." placeholderTextColor={C.muted} style={styles.field} />

          {isPublisher && (
            <>
              <PickerField
                label="DEPARTEMENT *"
                value={form.dept}
                placeholder="Choisis ton departement"
                options={DEPARTMENTS}
                onChange={(v) => setForm((p) => ({ ...p, dept: v, city: '' }))}
              />
              <PickerField
                label="VILLE / COMMUNE *"
                value={form.city}
                placeholder={form.dept ? 'Choisis ta ville' : "Choisis d'abord le departement"}
                options={form.dept ? (CITIES_BY_DEPT[form.dept] || []) : []}
                onChange={(v) => update('city', v)}
                disabled={!form.dept}
              />
              <Text style={styles.label}>ADRESSE COMPLETE *</Text>
              <TextInput value={form.address} onChangeText={(v) => update('address', v)} placeholder="Rue, quartier, point de repere" placeholderTextColor={C.muted} style={styles.field} />
            </>
          )}

          <Text style={styles.label}>MOT DE PASSE *</Text>
          <TextInput value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry placeholder="6+ caractères" placeholderTextColor={C.muted} style={styles.field} />

          <Text style={styles.label}>CONFIRME LE MOT DE PASSE *</Text>
          <TextInput value={form.confirmPassword} onChangeText={(v) => update('confirmPassword', v)} secureTextEntry placeholder="Retape ton mot de passe" placeholderTextColor={C.muted} style={styles.field} />

          {isPublisher && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Photo de profil *</Text>
              <Text style={styles.helpTxt}>Une photo claire de ton visage. Sert à vérifier ton identité.</Text>
              <Pressable style={styles.uploadBox} onPress={() => pickOne('profilePhoto')}>
                {form.profilePhoto ? (
                  <Image source={{ uri: form.profilePhoto.uri }} style={styles.uploadPreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={32} color={C.muted} />
                    <Text style={styles.uploadTxt}>Toucher pour ajouter une photo</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Pièce d'identité *</Text>
              <Text style={styles.helpTxt}>Tes documents sont stockés en sécurité et examinés manuellement sous 24-48h.</Text>

              <Text style={styles.label}>TYPE DE DOCUMENT *</Text>
              <View style={styles.roleRow}>
                {DOC_TYPES.map((t) => {
                  const on = form.docType === t;
                  return (
                    <Pressable key={t} style={[styles.roleChip, on && styles.roleChipOn]} onPress={() => update('docType', t)}>
                      <Text style={[styles.roleTxt, on && styles.roleTxtOn]}>{DOC_LABELS[t]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>NUMÉRO DU DOCUMENT *</Text>
              <TextInput value={form.docNumber} onChangeText={(v) => update('docNumber', v)} placeholder="Ex: 003-456-789-0" placeholderTextColor={C.muted} style={styles.field} autoCapitalize="characters" />

              <Text style={styles.label}>PHOTO RECTO *</Text>
              <Pressable style={styles.uploadBox} onPress={() => pickOne('docFront')}>
                {form.docFront ? (
                  <Image source={{ uri: form.docFront.uri }} style={styles.uploadPreview} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={28} color={C.muted} />
                    <Text style={styles.uploadTxt}>Photo claire du recto</Text>
                  </>
                )}
              </Pressable>

              {form.docType !== 'passport' && (
                <>
                  <Text style={styles.label}>PHOTO VERSO *</Text>
                  <Pressable style={styles.uploadBox} onPress={() => pickOne('docBack')}>
                    {form.docBack ? (
                      <Image source={{ uri: form.docBack.uri }} style={styles.uploadPreview} />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={28} color={C.muted} />
                        <Text style={styles.uploadTxt}>Photo claire du verso</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              <View style={styles.priceBox}>
                <Ionicons name="information-circle-outline" size={18} color={C.primary} />
                <Text style={styles.priceTxt}>
                  Publier une annonce coûte <Text style={{ fontWeight: '800' }}>20 USD (2 500 HTG)</Text>. Tu pourras publier après validation de ton compte (24-48h).
                </Text>
              </View>

              <Text style={styles.label}>CODE DE PARRAINAGE (OPTIONNEL)</Text>
              <Text style={styles.helpTxt}>
                Quelqu'un t'a parlé d'ORIZON ? Saisis son code influenceur ou parrain pour qu'il soit crédité.
              </Text>
              <TextInput
                value={form.referralCode}
                onChangeText={(v) => update('referralCode', v.toUpperCase())}
                placeholder="Ex: NICK2026"
                placeholderTextColor={C.muted}
                style={styles.field}
                autoCapitalize="characters"
              />
            </>
          )}

          <View style={styles.divider} />
          <Pressable style={styles.tcRow} onPress={() => update('acceptTerms', !form.acceptTerms)}>
            <View style={[styles.checkbox, form.acceptTerms && styles.checkboxOn]}>
              {form.acceptTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.tcTxt}>
              J'accepte les{' '}
              <Text style={styles.tcLink} onPress={() => navigation.navigate('Terms')}>conditions d'utilisation</Text>
              {' '}et la{' '}
              <Text style={styles.tcLink} onPress={() => navigation.navigate('Privacy')}>politique de confidentialité</Text>
              {' '}d'ORIZON.
            </Text>
          </Pressable>

          <Pressable style={[styles.cta, (busy || loading) && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy || loading}>
            {busy || loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaTxt}>Créer mon compte</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkTxt}>Déjà inscrit ? <Text style={{ color: C.primary, fontWeight: '700' }}>Se connecter</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  page: { flexGrow: 1, padding: 20, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backTxt: { color: C.text, fontWeight: '600', fontSize: 13 },
  hero: { gap: 4, marginTop: 4, alignItems: 'center' },
  brand: { color: C.primary, fontWeight: '800', letterSpacing: 3, fontSize: 13 },
  logoImg: { width: 130, height: 140, alignSelf: 'center', marginBottom: 4 },
  logoHorz: { width: 180, height: 56, alignSelf: 'center', marginBottom: 4 },
  h1: { color: C.text, fontSize: 24, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 13, lineHeight: 18 },
  form: { gap: 10 },

  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#FFFFFF',
  },
  roleIconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  roleCardTitle: { color: C.text, fontWeight: '800', fontSize: 16 },
  roleCardSub: { color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  roleBullet: { color: C.text, fontSize: 11, marginTop: 4 },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted, marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 4 },
  helpTxt: { fontSize: 11, color: C.muted, lineHeight: 15, marginBottom: 4 },
  field: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.text,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff',
  },
  roleChipOn: { borderColor: C.accent, backgroundColor: C.primarySoft },
  roleTxt: { fontSize: 11, color: C.muted, fontWeight: '600' },
  roleTxtOn: { color: C.primary },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },

  uploadBox: {
    minHeight: 120, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
    overflow: 'hidden', backgroundColor: C.surface,
  },
  uploadPreview: { width: '100%', height: 180 },
  uploadTxt: { color: C.muted, fontSize: 12 },

  priceBox: {
    flexDirection: 'row', gap: 8, backgroundColor: C.primarySoft,
    padding: 12, borderRadius: 12, marginTop: 8,
  },
  priceTxt: { flex: 1, color: C.text, fontSize: 12, lineHeight: 17 },

  tcRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  tcTxt: { flex: 1, color: C.text, fontSize: 12, lineHeight: 17 },
  tcLink: { color: C.primary, fontWeight: '700', textDecorationLine: 'underline' },

  cta: {
    marginTop: 8, backgroundColor: C.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  linkRow: { alignItems: 'center', marginTop: 8 },
  linkTxt: { color: C.muted, fontSize: 12 },
});
