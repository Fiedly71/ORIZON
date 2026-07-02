// PropertyDetailScreen - Detail bien Airbnb-style :
//  - Galerie photos plein largeur
//  - Header info (titre, location, rating)
//  - Section "Hote" + Description + Equipements
//  - Sticky bottom bar : prix + bouton "Demander une visite" / "Contacter"
import React, { useState, useMemo, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { useFavorites } from '../store/useFavorites';
import VisitBookingSheet from '../components/VisitBookingSheet';
import ImageViewer from '../components/ImageViewer';
import MortgageMini from '../components/MortgageMini';
import PriceHistoryChart from '../components/PriceHistoryChart';
import ReportSheet from '../components/ReportSheet';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { openConversation } from '../services/messagingService';
import { isSuperhost } from '../utils/superhost';
import { getProperty, getPublicProfile } from '../services/propertiesService';
import { useResponsive } from '../hooks/useResponsive';
import Container from '../components/Container';

const AMENITY_ICONS = {
  'Piscine': 'water',
  'Jardin': 'leaf',
  'Garage': 'car',
  'Climatisation': 'snow',
  'Wifi': 'wifi',
  'Securite': 'shield-checkmark',
  'Vue mer': 'eye',
  'Vue': 'eye',
  'Cuisine equipee': 'restaurant',
  'Meuble': 'bed',
  'Balcon': 'home',
  'Terrasse': 'sunny',
  'Parking': 'car',
};

export default function PropertyDetailScreen({ navigation, route }) {
  const params = route?.params || {};
  const r = useResponsive();
  const { width: W } = useWindowDimensions();
  // Cap hero pour desktop : on prefere 500px max pour ne pas dominer l'ecran.
  const HERO_H = Math.min(Math.round(W * 0.75), r.isDesktop ? 520 : 600);
  // Largeur reelle du carousel (calculee via onLayout) - sur web la fenetre
  // peut differer de la zone rendue (container centre / scrollbar / zoom).
  const [carouselW, setCarouselW] = useState(0);
  // Source 1: item complet passe en navigation. Source 2: id (deep-link, my-listings, etc.)
  const initialItem = params.item || (params.id ? { id: params.id } : {});
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(!params.item && !!params.id);
  const [activeImg, setActiveImg] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const superhost = isSuperhost(item);

  // Charge l'annonce depuis Supabase si on n'a que l'id (deep-link / my-listings).
  useEffect(() => {
    if (params.item || !params.id) return;
    let alive = true;
    (async () => {
      const r = await getProperty(params.id);
      if (!alive) return;
      if (r.ok && r.data) setItem(r.data);
      else Alert.alert('Annonce introuvable', r.error || "Cette annonce n'existe plus ou a ete supprimee.", [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [params.id, params.item, navigation]);

  // Hydrate l'avatar + statut verifie du proprietaire (best-effort).
  useEffect(() => {
    if (!item.ownerId) return;
    let alive = true;
    (async () => {
      const r = await getPublicProfile(item.ownerId);
      if (alive && r.ok) setOwnerProfile(r.data);
    })();
    return () => { alive = false; };
  }, [item.ownerId]);

  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);
  const isFav = favIds.includes(item.id);

  const photos = (item.images && item.images.length > 0)
    ? item.images
    : (item.image ? [item.image] : []);
  const hasPhotos = photos.length > 0;

  const isRent = item.status === 'A louer' || item.status === 'A lwe' || item.status === 'rent';

  const onShare = async () => {
    const url = `https://orizon-pi.vercel.app/property/${item.id}`;
    const title = item.title || 'Annonce ORIZON';
    const message = `${title}\n${item.location || ''}\n${url}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: message, url });
        return;
      }
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        Alert.alert('Lien copié', url);
        return;
      }
      await Share.share({ title, message, url });
    } catch (_) {
      Alert.alert('Lien', url);
    }
  };

  const onVisit = () => setBookingOpen(true);

  const onContact = async () => {
    if (!item.ownerId) {
      Alert.alert(
        'Contact indisponible',
        "Le vendeur n'a pas encore lié son compte à cette annonce. Pour toute question, contacte ORIZON via le support.",
        [
          { text: 'Contacter le support', onPress: () => navigation.navigate('Support') },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
      return;
    }
    const r = await openConversation({ propertyId: item.id, ownerId: item.ownerId });
    if (r.ok) {
      navigation.navigate('Conversation', {
        conversationId: r.data.id,
        title: item.ownerName || 'Proprietaire',
        role: 'buyer',
      });
    } else {
      Alert.alert('Erreur', r.error || 'Impossible d\'ouvrir la conversation.');
    }
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>Chargement de l'annonce...</Text>
        </SafeAreaView>
      ) : (
      <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero gallery */}
        <View
          style={styles.heroWrap}
          onLayout={(e) => setCarouselW(e.nativeEvent.layout.width)}
        >
          {hasPhotos && carouselW > 0 ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              scrollEventThrottle={16}
              onScroll={(e) => {
                if (!carouselW) return;
                const idx = Math.round(e.nativeEvent.contentOffset.x / carouselW);
                if (idx !== activeImg && idx >= 0 && idx < photos.length) {
                  setActiveImg(idx);
                }
              }}
              onMomentumScrollEnd={(e) => {
                if (!carouselW) return;
                const idx = Math.round(e.nativeEvent.contentOffset.x / carouselW);
                setActiveImg(idx);
              }}
              renderItem={({ item: uri, index }) => (
                <Pressable onPress={() => { setActiveImg(index); setViewerOpen(true); }}>
                  <Image
                    source={{ uri }}
                    style={[styles.hero, { width: carouselW, height: HERO_H }]}
                    resizeMode="cover"
                    draggable={false}
                    {...(Platform.OS === 'web' ? {
                      onContextMenu: (e) => e.preventDefault?.(),
                    } : {})}
                  />
                </Pressable>
              )}
            />
          ) : hasPhotos ? (
            <View style={[styles.hero, { width: '100%', height: HERO_H, backgroundColor: '#F1F5F9' }]} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder, { width: '100%', height: HERO_H }]}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
              <Text style={styles.heroPlaceholderTxt}>Pas de photo disponible</Text>
            </View>
          )}
          {hasPhotos ? (
            <View style={styles.heroDots}>
              <Text style={styles.heroDotsTxt}>{activeImg + 1} / {photos.length}</Text>
            </View>
          ) : null}

          {/* Top buttons */}
          <SafeAreaView style={styles.topBar} edges={['top']}>
            <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable style={styles.iconBtn} onPress={onShare}>
                <Ionicons name="share-outline" size={20} color={C.text} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => setReportOpen(true)}>
                <Ionicons name="flag-outline" size={18} color={C.text} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => toggleFav(item.id)}
              >
                <Ionicons
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFav ? C.primary : C.text}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color={C.muted} />
            <Text style={styles.location}>{item.location}</Text>
          </View>

          {superhost && (
            <View style={styles.superBadge}>
              <Ionicons name="trophy" size={12} color="#fff" />
              <Text style={styles.superBadgeTxt}>Superhost ORIZON</Text>
            </View>
          )}

          {item.rating > 0 && (
            <View style={styles.metaRow}>
              <Ionicons name="star" size={14} color={C.text} />
              <Text style={styles.rating}>{Number(item.rating).toFixed(1)}</Text>
              <Text style={styles.reviewsCount}>· {item.reviews || 0} avis</Text>
              {item.verified && (
                <>
                  <Text style={styles.dot}> · </Text>
                  <Ionicons name="shield-checkmark" size={13} color={C.primary} />
                  <Text style={[styles.rating, { color: C.primary, marginLeft: 4 }]}>Verifie</Text>
                </>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Specs */}
          <View style={styles.specsGrid}>
            <SpecCell icon="home-outline" label={item.type || '—'} />
            {item.bedrooms > 0 && <SpecCell icon="bed-outline" label={`${item.bedrooms} ch.`} />}
            {item.bathrooms > 0 && <SpecCell icon="water-outline" label={`${item.bathrooms} sdb`} />}
            {item.area > 0 && <SpecCell icon="resize-outline" label={`${item.area} m²`} />}
            {item.floors > 0 && <SpecCell icon="layers-outline" label={`${item.floors} etages`} />}
            {item.yearBuilt && <SpecCell icon="calendar-outline" label={`${item.yearBuilt}`} />}
          </View>

          <View style={styles.divider} />

          {/* Hote */}
          <Pressable
            style={styles.hostRow}
            onPress={() => item.ownerId && navigation.navigate('PublicProfile', { userId: item.ownerId, name: item.ownerName })}
            disabled={!item.ownerId}
          >
            {ownerProfile?.avatarUrl ? (
              <Image source={{ uri: ownerProfile.avatarUrl }} style={styles.hostAvatar} />
            ) : (
              <View style={styles.hostAvatar}>
                <Text style={styles.hostAvatarTxt}>
                  {(item.ownerName || 'O').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.hostTitle}>Propose par {item.ownerName || 'le proprietaire'}</Text>
                {(item.verified || ownerProfile?.verified) && (
                  <Ionicons name="checkmark-circle" size={14} color="#1D4ED8" />
                )}
              </View>
              <Text style={styles.hostSub}>{item.ownerType || 'Proprietaire individuel'}</Text>
            </View>
            <Pressable style={styles.contactBtn} onPress={onContact}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
              <Text style={styles.contactBtnTxt}>Contacter</Text>
            </Pressable>
          </Pressable>

          <View style={styles.divider} />

          {/* Description */}
          {item.description ? (
            <>
              <Text style={styles.sectionTitle}>A propos de ce bien</Text>
              <Text style={styles.description}>{item.description}</Text>
              <View style={styles.divider} />
            </>
          ) : null}

          {/* Equipements */}
          {item.amenities?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ce que ce bien offre</Text>
              <View style={styles.amenitiesGrid}>
                {item.amenities.map((a, i) => (
                  <View key={i} style={styles.amenityRow}>
                    <Ionicons
                      name={(AMENITY_ICONS[a] || 'checkmark-circle-outline') + ''}
                      size={18}
                      color={C.text}
                    />
                    <Text style={styles.amenityTxt}>{a}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Simulateur d'hypotheque (uniquement biens a vendre) */}
          {!isRent && Number(item.price) > 0 && (
            <>
              <PriceHistoryChart propertyId={item.id} currentPrice={item.price} />
              <MortgageMini price={Number(item.price)} />
              <View style={styles.divider} />
            </>
          )}

          {/* Localisation */}
          <Text style={styles.sectionTitle}>Localisation</Text>
          {item.lat && item.lng ? (
            <Pressable onPress={() => navigation.navigate('Map')}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.miniMap}
                pointerEvents="none"
                initialRegion={{ latitude: Number(item.lat), longitude: Number(item.lng), latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              >
                <Marker coordinate={{ latitude: Number(item.lat), longitude: Number(item.lng) }} />
              </MapView>
              <View style={styles.miniMapBadge}>
                <Ionicons name="expand" size={14} color="#fff" />
                <Text style={styles.miniMapBadgeTxt}>Plein ecran</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={styles.mapPlaceholder}
              onPress={() => navigation.navigate('Map')}
            >
              <Ionicons name="map" size={32} color={C.primary} />
              <Text style={styles.mapPlaceholderTxt}>Voir sur la carte</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPrice}>${Number(item.price).toLocaleString()}</Text>
            <Text style={styles.bottomPriceUnit}>{isRent ? '/ mois' : 'prix demande'}</Text>
          </View>
          <Pressable style={styles.cta} onPress={onVisit}>
            <Text style={styles.ctaTxt}>Demander une visite</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <VisitBookingSheet
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        property={item}
      />
      <ImageViewer
        visible={viewerOpen}
        images={photos}
        initialIndex={activeImg}
        onClose={() => setViewerOpen(false)}
      />
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="property"
        targetId={item.id}
        targetLabel={item.title}
      />
      </>
      )}
    </View>
  );
}

function SpecCell({ icon, label }) {
  return (
    <View style={styles.specCell}>
      <Ionicons name={icon} size={20} color={C.text} />
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  heroWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: C.surface,
  },
  hero: {},
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', gap: 8 },
  heroPlaceholderTxt: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  heroDots: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroDotsTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: { flexDirection: 'row', gap: spacing.md },
  body: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: C.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  location: { fontSize: 14, color: C.muted },
  rating: { fontSize: 14, color: C.text, fontWeight: '600' },
  reviewsCount: { fontSize: 14, color: C.muted, marginLeft: 4 },
  dot: { color: C.muted },
  divider: { height: 1, backgroundColor: C.border, marginVertical: spacing.xxl },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  specCell: {
    width: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
  },
  specLabel: { fontSize: 14, color: C.text },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarTxt: { color: C.primary, fontWeight: '800', fontSize: 18 },
  hostTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  hostSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.primary,
  },
  contactBtnTxt: { color: C.primary, fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: spacing.lg },
  description: { fontSize: 14.5, color: C.text, lineHeight: 22 },
  amenitiesGrid: { gap: spacing.md },
  amenityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: 4 },
  amenityTxt: { fontSize: 14, color: C.text },
  mapPlaceholder: {
    height: 140,
    borderRadius: radii.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  mapPlaceholderTxt: { color: C.text, fontWeight: '600' },
  miniMap: { width: '100%', height: 180, borderRadius: radii.lg },
  miniMapBadge: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniMapBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  bottomPrice: { fontSize: 18, fontWeight: '700', color: C.text },
  bottomPriceUnit: { fontSize: 12, color: C.muted, marginTop: 2 },
  cta: {
    backgroundColor: C.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  superBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent, alignSelf: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radii.pill, marginTop: spacing.md,
  },
  superBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
