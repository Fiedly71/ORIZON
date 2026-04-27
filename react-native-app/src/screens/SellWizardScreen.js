// Wizard "Vendre" en 3 etapes: Infos -> Medias -> Tarifs.
// Utilise propertiesService (CRUD) + storageService (upload).
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { propertyTypes, propertyAmenities } from '../data/mockData';
import { pickImages, uploadImages } from '../services/storageService';
import { useProperty } from '../store/useProperty';
import { useAuthStore } from '../store/useAuthStore';
import { canPublish } from '../services/authService';

const STATUSES = ['A vendre', 'A louer'];
const PUBLICATION_FEE_USD = 20;
const PUBLICATION_FEE_HTG = 2500;

export default function SellWizardScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const addProperty = useProperty((s) => s.addProperty);
  const user = useAuthStore((s) => s.user);

  // Garde de role: seuls Proprietaire/Agence peuvent publier.
  if (!canPublish(user?.role)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.title}>Publier une annonce</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.guardWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={C.muted} />
          <Text style={styles.guardTitle}>Publication réservée aux Propriétaires & Agences</Text>
          <Text style={styles.guardTxt}>
            Ton compte actuel ({user?.role || 'inconnu'}) ne permet pas de publier d'annonces.
            Pour vendre ou louer un bien sur ORIZON, crée un compte Propriétaire ou Agence
            (vérification KYC requise).
          </Text>
          <View style={styles.guardPriceBox}>
            <Ionicons name="information-circle-outline" size={18} color={C.primary} />
            <Text style={styles.guardPriceTxt}>
              Coût de publication : <Text style={{ fontWeight: '800' }}>{PUBLICATION_FEE_USD} USD ({PUBLICATION_FEE_HTG} HTG)</Text> par annonce.
            </Text>
          </View>
          <Pressable style={styles.guardCta} onPress={() => navigation.goBack()}>
            <Text style={styles.guardCtaTxt}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Guard supplementaire: KYC valide (can_publish dans profiles).
  if (user?.canPublish === false) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.title}>Publier une annonce</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.guardWrap}>
          <Ionicons name="time-outline" size={48} color="#D97706" />
          <Text style={styles.guardTitle}>Vérification en cours</Text>
          <Text style={styles.guardTxt}>
            Ton dossier KYC est en cours d'examen par notre équipe.
            Tu pourras publier dès qu'il sera validé (24-48h en moyenne).
          </Text>
          <Pressable style={styles.guardCta} onPress={() => navigation.goBack()}>
            <Text style={styles.guardCtaTxt}>D'accord</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const [data, setData] = useState({
    title: '',
    location: '',
    type: 'Maison',
    description: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    amenities: [],
    images: [],          // [{ uri, mime, name }]
    price: '',
    status: 'A vendre',
  });

  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleAmenity = (a) =>
    setData((d) => ({ ...d, amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] }));

  const validateStep = () => {
    if (step === 0) {
      if (!data.title || !data.location || !data.type) return 'Titre, lieu et type requis.';
    }
    if (step === 1) {
      if (data.images.length === 0) return 'Ajoute au moins une photo.';
    }
    if (step === 2) {
      if (!data.price) return 'Prix requis.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { Alert.alert('ORIZON', err); return; }
    if (step < 2) setStep((s) => s + 1);
    else submit();
  };

  const onPickPhotos = async () => {
    const r = await pickImages({ multi: true, max: 8 });
    if (r.ok) setData((d) => ({ ...d, images: [...d.images, ...r.assets].slice(0, 8) }));
    else if (!r.canceled) Alert.alert('Photos', r.error || '');
  };

  const submit = async () => {
    setBusy(true);
    try {
      const up = await uploadImages(data.images, { folder: 'properties' });
      if (!up.ok) { Alert.alert('Upload', up.error || ''); return; }
      const payload = {
        title: data.title,
        location: data.location,
        type: data.type,
        status: data.status,
        price: Number(data.price) || 0,
        bedrooms: Number(data.bedrooms) || 0,
        bathrooms: Number(data.bathrooms) || 0,
        area: Number(data.area) || 0,
        description: data.description,
        amenities: data.amenities,
        images: up.urls,
        image: up.urls[0] || '',
        ownerName: user?.fullName || '',
        ownerType: user?.role || '',
        ownerId: user?.id || null,
        // Important: la propriete est creee en mode 'unpaid'.
        // Elle ne sera visible publiquement qu'apres confirmation du paiement
        // (RPC confirm_payment cote DB).
        paymentStatus: 'unpaid',
      };
      const r = await addProperty(payload);
      if (!r.ok) { Alert.alert('Publication', r.error || ''); return; }

      // On enchaine sur l'ecran de paiement avec l'id de la propriete creee.
      navigation.replace('Checkout', {
        propertyId: r.data?.id || r.id || null,
        propertyTitle: data.title,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => (step === 0 ? navigation.goBack() : setStep((s) => s - 1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Publier une annonce</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.steps}>
        {['Infos', 'Photos', 'Tarif'].map((label, i) => (
          <View key={label} style={styles.stepCol}>
            <View style={[styles.dot, i <= step && styles.dotOn]}>
              <Text style={[styles.dotTxt, i <= step && styles.dotTxtOn]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === step && { color: C.primary, fontWeight: '700' }]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={{ gap: 10 }}>
            <Field label="TITRE" value={data.title} onChangeText={(v) => update('title', v)} placeholder="Belle villa au Cap-Haitien" />
            <Field label="LOCALISATION" value={data.location} onChangeText={(v) => update('location', v)} placeholder="Quartier, Ville" />
            <Text style={styles.label}>TYPE</Text>
            <View style={styles.chipRow}>
              {propertyTypes.map((t) => (
                <Chip key={t} label={t} on={data.type === t} onPress={() => update('type', t)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Field label="CHAMBRES" value={data.bedrooms} onChangeText={(v) => update('bedrooms', v)} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="SDB" value={data.bathrooms} onChangeText={(v) => update('bathrooms', v)} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="SURFACE m2" value={data.area} onChangeText={(v) => update('area', v)} keyboardType="number-pad" /></View>
            </View>
            <Field label="DESCRIPTION" value={data.description} onChangeText={(v) => update('description', v)} multiline placeholder="Decris ton bien" inputStyle={{ minHeight: 100, textAlignVertical: 'top' }} />
            <Text style={styles.label}>EQUIPEMENTS</Text>
            <View style={styles.chipRow}>
              {propertyAmenities.map((a) => (
                <Chip key={a} label={a} on={data.amenities.includes(a)} onPress={() => toggleAmenity(a)} />
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 12 }}>
            <Pressable style={styles.uploadBtn} onPress={onPickPhotos}>
              <Ionicons name="cloud-upload-outline" size={22} color={C.primary} />
              <Text style={styles.uploadTxt}>Ajouter des photos (max 8)</Text>
            </Pressable>
            <View style={styles.thumbs}>
              {data.images.map((img, i) => (
                <View key={i} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <Pressable
                    style={styles.thumbX}
                    onPress={() => setData((d) => ({ ...d, images: d.images.filter((_, k) => k !== i) }))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.label}>STATUT</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((s) => (
                <Chip key={s} label={s} on={data.status === s} onPress={() => update('status', s)} />
              ))}
            </View>
            <Field label="PRIX (USD)" value={data.price} onChangeText={(v) => update('price', v)} keyboardType="number-pad" placeholder="ex: 95000" />

            <View style={styles.feeBox}>
              <Ionicons name="card-outline" size={20} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.feeTitle}>Frais de publication</Text>
                <Text style={styles.feeTxt}>
                  La publication de cette annonce coûte{' '}
                  <Text style={{ fontWeight: '800' }}>{PUBLICATION_FEE_USD} USD ({PUBLICATION_FEE_HTG} HTG)</Text>.
                  Le paiement sera demandé à l'étape suivante.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={next} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>{step < 2 ? 'Continuer' : `Payer ${PUBLICATION_FEE_USD}$ et publier`}</Text>}
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
        placeholderTextColor={C.muted}
        {...props}
        style={[styles.field, inputStyle]}
      />
    </View>
  );
}

function Chip({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  steps: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  stepCol: { alignItems: 'center', gap: 6 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: C.accent, borderColor: C.accent },
  dotTxt: { color: C.muted, fontSize: 11, fontWeight: '700' },
  dotTxtOn: { color: '#fff' },
  stepLabel: { fontSize: 11, color: C.muted },
  body: { padding: 16 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  field: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff' },
  chipOn: { borderColor: C.accent, backgroundColor: C.primarySoft },
  chipTxt: { fontSize: 11, color: C.muted, fontWeight: '600' },
  chipTxtOn: { color: C.primary },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 22, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  uploadTxt: { color: C.primary, fontWeight: '700', fontSize: 13 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: 10, backgroundColor: C.surface },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff' },
  cta: { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  guardWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, gap: 14,
  },
  guardTitle: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  guardTxt: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  guardPriceBox: {
    flexDirection: 'row', gap: 10, backgroundColor: C.primarySoft,
    padding: 12, borderRadius: 12, alignItems: 'flex-start',
  },
  guardPriceTxt: { flex: 1, color: C.text, fontSize: 12, lineHeight: 17 },
  guardCta: {
    marginTop: 6, backgroundColor: C.accent,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14,
  },
  guardCtaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  feeBox: {
    flexDirection: 'row', gap: 10, backgroundColor: C.primarySoft,
    padding: 14, borderRadius: 12, marginTop: 8, alignItems: 'flex-start',
  },
  feeTitle: { color: C.text, fontWeight: '800', fontSize: 13, marginBottom: 2 },
  feeTxt: { color: C.text, fontSize: 12, lineHeight: 17 },
});
