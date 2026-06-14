// Wizard "Vendre" en 3 etapes: Infos -> Medias -> Tarifs.
// Utilise propertiesService (CRUD) + storageService (upload).
// Mode edition: navigation.navigate('SellWizard', { editId: '<uuid>' })
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { propertyTypes, propertyAmenities } from '../data/mockData';
import { pickImages, uploadImages } from '../services/storageService';
import { useProperty } from '../store/useProperty';
import { useAuthStore } from '../store/useAuthStore';
import { canPublish } from '../services/authService';
import { getProperty as getPropertyById, updateProperty as svcUpdate } from '../services/propertiesService';
import { DEPARTMENTS, CITIES_BY_DEPT, formatLocation, parseLocation } from '../constants/haiti';
import PickerField from '../components/PickerField';
import { isLaunchFreeActive, LAUNCH_FREE_END_LABEL } from '../config/launchPromo';

const DRAFT_KEY = 'orizon.sellwizard.draft.v1';

const STATUSES = ['A vendre', 'A louer'];
const PUBLICATION_FEE_USD = 20;
const PUBLICATION_FEE_HTG = 2500;

export default function SellWizardScreen({ navigation, route }) {
  const editId = route?.params?.editId || null;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
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

  // Guard email verifie: obligatoire pour publier (conformite stores + anti-fraude).
  if (user && !user.emailConfirmedAt) {
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
          <Ionicons name="mail-unread-outline" size={48} color="#D97706" />
          <Text style={styles.guardTitle}>Vérifie ton email d'abord</Text>
          <Text style={styles.guardTxt}>
            Pour publier une annonce, tu dois confirmer ton adresse email.
            Vérifie ta boîte de réception (et les spams) pour trouver le lien de confirmation.
          </Text>
          <Pressable style={styles.guardCta} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.guardCtaTxt}>Aller au profil</Text>
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
    dept: '',
    city: '',
    type: 'Maison',
    description: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    amenities: [],
    images: [],          // [{ uri, mime, name }]  + existing urls as { uri, existing: true }
    price: '',
    status: 'A vendre',
    visitSlots: [],      // [{ date, start, end }]
  });
  const draftLoadedRef = useRef(false);

  // Mode edition: precharge la propriete.
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const r = await getPropertyById(editId);
      if (r.ok && r.data) {
        const p = r.data;
        const parsed = parseLocation(p.location);
        setData({
          title: p.title || '',
          location: p.location || '',
          dept: parsed.dept,
          city: parsed.city,
          type: p.type || 'Maison',
          description: p.description || '',
          bedrooms: String(p.bedrooms || ''),
          bathrooms: String(p.bathrooms || ''),
          area: String(p.area || ''),
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          images: (p.images || (p.image ? [p.image] : [])).map((url) => ({ uri: url, existing: true })),
          price: String(p.price || ''),
          status: p.status || 'A vendre',
          visitSlots: Array.isArray(p.visitSlots) ? p.visitSlots : [],
        });
      } else if (!r.ok) {
        Alert.alert('Edition', r.error || 'Impossible de charger cette annonce.');
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

  // Mode creation: tente de charger un brouillon sauvegarde.
  useEffect(() => {
    if (editId) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (!draft || typeof draft !== 'object') return;
        // Ne pas restaurer si vide (sauvegarde initiale).
        const hasContent = (draft.title || draft.dept || draft.city || draft.description || (draft.images && draft.images.length));
        if (!hasContent) return;
        const restore = () => {
          setData((d) => ({ ...d, ...draft, images: draft.images || [] }));
          draftLoadedRef.current = true;
        };
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.confirm(`Tu as un brouillon non termine ("${draft.title || 'sans titre'}"). Reprendre ?`)) restore();
          else AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        } else {
          Alert.alert(
            'Brouillon trouve',
            `Tu as un brouillon non termine ("${draft.title || 'sans titre'}"). Reprendre ?`,
            [
              { text: 'Nouveau', style: 'destructive', onPress: () => AsyncStorage.removeItem(DRAFT_KEY).catch(() => {}) },
              { text: 'Reprendre', onPress: restore },
            ],
          );
        }
      } catch {}
    })();
  }, [editId]);

  // Auto-save brouillon a chaque changement (mode creation uniquement).
  useEffect(() => {
    if (editId) return;
    const hasContent = data.title || data.dept || data.city || data.description || data.images.length;
    if (!hasContent) return;
    // On ne sauve PAS les images locales (uri file://) car non valides apres relance.
    const persistable = {
      ...data,
      images: data.images.filter((i) => i.existing).map((i) => ({ uri: i.uri, existing: true })),
    };
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(persistable)).catch(() => {});
  }, [data, editId]);

  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleAmenity = (a) =>
    setData((d) => ({ ...d, amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] }));

  const validateStep = () => {
    if (step === 0) {
      if (!data.title) return 'Donne un titre a ton annonce.';
      if (!data.dept || !data.city) return 'Choisis le departement ET la ville.';
      if (!data.type) return 'Choisis un type de bien.';
    }
    if (step === 1) {
      // Visites: facultatif. Si renseigne, valide format.
      for (const s of (data.visitSlots || [])) {
        if (!s.date || !s.start || !s.end) return 'Chaque creneau doit avoir une date et des horaires.';
      }
    }
    if (step === 2) {
      if (data.images.length === 0) return 'Ajoute au moins une photo.';
    }
    if (step === 3) {
      if (!data.price) return 'Prix requis.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { Alert.alert('ORIZON', err); return; }
    if (step < 3) setStep((s) => s + 1);
    else submit();
  };

  const onPickPhotos = async () => {
    const r = await pickImages({ multi: true, max: 8 });
    if (r.ok) setData((d) => ({ ...d, images: [...d.images, ...r.assets].slice(0, 8) }));
    else if (!r.canceled) Alert.alert('Photos', r.error || '');
  };

  const saveDraftExplicit = async () => {
    if (editId) return;
    const persistable = {
      ...data,
      images: data.images.filter((i) => i.existing).map((i) => ({ uri: i.uri, existing: true })),
    };
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
      Alert.alert('Brouillon enregistre', 'Tu pourras reprendre ton annonce a tout moment depuis cet ecran.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Brouillon', "Impossible d'enregistrer le brouillon.");
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      // Separe: les images existantes (deja sur Storage) gardent leur URL,
      // les nouvelles ({ uri, mime, name } locales) sont uploadees.
      const existingUrls = data.images.filter((i) => i.existing).map((i) => i.uri);
      const toUpload = data.images.filter((i) => !i.existing);
      let newUrls = [];
      let newThumbs = [];
      if (toUpload.length) {
        const up = await uploadImages(toUpload, { folder: 'properties', generateThumb: true });
        if (!up.ok) { Alert.alert('Upload', up.error || ''); return; }
        newUrls = up.urls || [];
        newThumbs = up.thumbs || [];
      }
      const allUrls = [...existingUrls, ...newUrls];
      const allThumbs = [...existingUrls, ...newThumbs];

      // Geocodage auto de l'adresse (silencieux si echec)
      let geo = { lat: null, lng: null };
      try {
        const { geocodeAddress } = await import('../services/geocodingService');
        const g = await geocodeAddress(data.location);
        if (g.ok) geo = { lat: g.lat, lng: g.lng };
      } catch {}

      const baseLoc = formatLocation(data.city, data.dept);
      const fullLocation = data.location?.trim()
        ? `${data.location.trim()}, ${baseLoc || ''}`.replace(/, $/, '')
        : baseLoc;
      const payload = {
        title: data.title,
        location: fullLocation || data.location,
        type: data.type,
        status: data.status,
        price: Number(data.price) || 0,
        bedrooms: Number(data.bedrooms) || 0,
        bathrooms: Number(data.bathrooms) || 0,
        area: Number(data.area) || 0,
        description: data.description,
        amenities: data.amenities,
        images: allUrls,
        thumbs: allThumbs,
        image: allThumbs[0] || allUrls[0] || '',
        lat: geo.lat,
        lng: geo.lng,
        visitSlots: data.visitSlots || [],
      };

      // ===== MODE EDITION =====
      if (editId) {
        const r = await svcUpdate(editId, payload);
        if (!r.ok) { Alert.alert('Modification', r.error || ''); return; }
        Alert.alert('Annonce mise a jour', 'Tes modifications ont ete enregistrees.');
        navigation.goBack();
        return;
      }

      // ===== MODE CREATION =====
      const createPayload = {
        ...payload,
        ownerName: user?.fullName || '',
        ownerType: user?.role || '',
        ownerId: user?.id || null,
        // Important: la propriete est creee en mode 'unpaid'.
        // Le trigger DB force 'paid' si publish_free=true sur le profil.
        paymentStatus: 'unpaid',
      };
      const r = await addProperty(createPayload);
      if (!r.ok) { Alert.alert('Publication', r.error || ''); return; }

      // Brouillon utilise -> on l'efface.
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});

      // Si l'admin a accorde la publication gratuite a ce user (flag profile.publish_free),
      // le trigger DB a deja mis payment_status='paid' + moderation_status='approved'.
      // L'annonce est en ligne immediatement -> on saute l'ecran Checkout.
      const isFreePublisher = !!(user?.publish_free || user?.publishFree);
      if (isFreePublisher || isLaunchFreeActive()) {
        Alert.alert(
          'Annonce publiee',
          isLaunchFreeActive()
            ? `Ton annonce est en ligne gratuitement (promo de lancement ORIZON jusqu'au ${LAUNCH_FREE_END_LABEL}).`
            : 'Felicitations ! Ton annonce est en ligne. Tu beneficies de la publication gratuite.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'App' }, { name: 'MyListings' }] }) }],
        );
        return;
      }

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
        <Text style={styles.title}>{editId ? 'Modifier l\'annonce' : 'Publier une annonce'}</Text>
        <View style={{ width: 22 }} />
      </View>
      {loadingEdit ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={C.primary} /></View>
      ) : (
      <>

      <View style={styles.steps}>
        {['Infos', 'Visites', 'Photos', 'Tarif'].map((label, i) => (
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
            <PickerField
              label="DEPARTEMENT"
              value={data.dept}
              placeholder="Choisis ton departement"
              options={DEPARTMENTS}
              onChange={(v) => setData((d) => ({ ...d, dept: v, city: '' }))}
            />
            <PickerField
              label="VILLE / COMMUNE"
              value={data.city}
              placeholder={data.dept ? 'Choisis ta ville' : "Choisis d'abord le departement"}
              options={data.dept ? (CITIES_BY_DEPT[data.dept] || []) : []}
              onChange={(v) => update('city', v)}
              disabled={!data.dept}
            />
            <Field
              label="QUARTIER / ADRESSE (FACULTATIF)"
              value={data.location}
              onChangeText={(v) => update('location', v)}
              placeholder="Ex: Rue Capois, Bourdon, etc."
            />
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
          <VisitSlotsEditor
            slots={data.visitSlots}
            onChange={(slots) => update('visitSlots', slots)}
          />
        )}

        {step === 2 && (
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

        {step === 3 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.label}>STATUT</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((s) => (
                <Chip key={s} label={s} on={data.status === s} onPress={() => update('status', s)} />
              ))}
            </View>
            <Field label="PRIX (USD)" value={data.price} onChangeText={(v) => update('price', v)} keyboardType="number-pad" placeholder="ex: 95000" />

            {!editId && isLaunchFreeActive() && (
              <View style={[styles.feeBox, { backgroundColor: '#DCFCE7', borderColor: '#16A34A', borderWidth: 1 }]}>
                <Ionicons name="gift-outline" size={20} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feeTitle, { color: '#15803D' }]}>Publication 100% gratuite</Text>
                  <Text style={styles.feeTxt}>
                    Promo de lancement ORIZON jusqu'au{' '}
                    <Text style={{ fontWeight: '800' }}>{LAUNCH_FREE_END_LABEL}</Text>.
                    Aucun paiement requis, ton annonce est en ligne dès validation.
                  </Text>
                </View>
              </View>
            )}

            {!editId && !isLaunchFreeActive() && (
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
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!editId && (
          <Pressable style={styles.draftBtn} onPress={saveDraftExplicit} disabled={busy}>
            <Ionicons name="save-outline" size={16} color={C.primary} />
            <Text style={styles.draftBtnTxt}>Enregistrer comme brouillon</Text>
          </Pressable>
        )}
        <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={next} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.ctaTxt}>
              {step < 3
                ? 'Continuer'
                : (editId
                    ? 'Enregistrer les modifications'
                    : (isLaunchFreeActive()
                        ? 'Publier gratuitement'
                        : `Payer ${PUBLICATION_FEE_HTG.toLocaleString('fr-FR')} HTG et publier`))}
            </Text>
          )}
        </Pressable>
      </View>
      </>
      )}
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

// Editor des creneaux de visite proposes par le proprietaire.
// Sur web on utilise les inputs HTML date/time natifs (UX bien meilleure),
// sur mobile on utilise des TextInput simples avec masques.
function VisitSlotsEditor({ slots, onChange }) {
  const [draft, setDraft] = useState({ date: '', start: '', end: '' });
  const isWeb = Platform.OS === 'web';

  const add = () => {
    if (!draft.date || !draft.start || !draft.end) {
      Alert.alert('Visite', 'Renseigne la date et les horaires de debut et de fin.');
      return;
    }
    if (draft.start >= draft.end) {
      Alert.alert('Visite', "L'heure de fin doit etre apres l'heure de debut.");
      return;
    }
    onChange([...(slots || []), { ...draft }]);
    setDraft({ date: '', start: '', end: '' });
  };

  const remove = (idx) => onChange((slots || []).filter((_, i) => i !== idx));

  const fmt = (s) => {
    try {
      const d = new Date(s.date + 'T' + s.start);
      const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      return `${day.charAt(0).toUpperCase() + day.slice(1)} | ${s.start} - ${s.end}`;
    } catch { return `${s.date} ${s.start} - ${s.end}`; }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.feeBox}>
        <Ionicons name="calendar-outline" size={20} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.feeTitle}>Tes disponibilites pour les visites</Text>
          <Text style={styles.feeTxt}>
            Ajoute les creneaux ou tu peux recevoir des visiteurs. Ce sont les seuls
            creneaux que les acheteurs pourront choisir pour demander une visite.
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>NOUVEAU CRENEAU</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isWeb ? (
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              style={{ flex: 1, padding: 12, fontSize: 13, borderRadius: 12, borderWidth: 1.5, borderStyle: 'solid', borderColor: C.border, backgroundColor: C.surface, color: C.text }}
            />
          ) : (
            <TextInput
              value={draft.date}
              onChangeText={(v) => setDraft((d) => ({ ...d, date: v }))}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={C.muted}
              style={[styles.field, { flex: 1 }]}
            />
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isWeb ? (
            <input
              type="time"
              value={draft.start}
              onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
              style={{ flex: 1, padding: 12, fontSize: 13, borderRadius: 12, borderWidth: 1.5, borderStyle: 'solid', borderColor: C.border, backgroundColor: C.surface, color: C.text }}
            />
          ) : (
            <TextInput
              value={draft.start}
              onChangeText={(v) => setDraft((d) => ({ ...d, start: v }))}
              placeholder="HH:MM"
              placeholderTextColor={C.muted}
              style={[styles.field, { flex: 1 }]}
            />
          )}
          {isWeb ? (
            <input
              type="time"
              value={draft.end}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
              style={{ flex: 1, padding: 12, fontSize: 13, borderRadius: 12, borderWidth: 1.5, borderStyle: 'solid', borderColor: C.border, backgroundColor: C.surface, color: C.text }}
            />
          ) : (
            <TextInput
              value={draft.end}
              onChangeText={(v) => setDraft((d) => ({ ...d, end: v }))}
              placeholder="HH:MM"
              placeholderTextColor={C.muted}
              style={[styles.field, { flex: 1 }]}
            />
          )}
        </View>
        <Pressable style={styles.slotAddBtn} onPress={add}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Ajouter ce creneau</Text>
        </Pressable>
      </View>

      {(slots || []).length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>CRENEAUX AJOUTES ({(slots || []).length})</Text>
          {(slots || []).map((s, i) => (
            <View key={`${s.date}-${s.start}-${i}`} style={styles.slotRow}>
              <Ionicons name="calendar-outline" size={16} color={C.primary} />
              <Text style={{ flex: 1, fontSize: 13, color: C.text }}>{fmt(s)}</Text>
              <Pressable onPress={() => remove(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={C.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
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
  body: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
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
  draftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.primary, backgroundColor: C.primarySoft,
  },
  draftBtnTxt: { color: C.primary, fontWeight: '700', fontSize: 12 },

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
  slotAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, paddingVertical: 12, borderRadius: 10,
  },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: '#fff',
  },
});
