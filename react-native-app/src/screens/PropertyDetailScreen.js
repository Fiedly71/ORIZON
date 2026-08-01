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
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Linking,
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
import { requireEmailVerified } from '../utils/emailVerifyGuard';
import { requireAuth } from '../utils/requireAuth';
import { useAuthStore } from '../store/useAuthStore';
import { isSuperhost } from '../utils/superhost';
import { getProperty, getPublicProfile } from '../services/propertiesService';
import { priceSuffix } from '../utils/priceFormat';
import { listReviewsForProperty, leaveReview } from '../services/reviewsService';
import { useResponsive } from '../hooks/useResponsive';
import Container from '../components/Container';

const AMENITY_ICONS = {
  'Piscine': 'water',
  'Jardin': 'leaf',
  'Garage': 'car',
  'Climatisation': 'snow',
  'Wifi': 'wifi',
  'Sécurité': 'shield-checkmark',
  'Vue mer': 'eye',
  'Vue': 'eye',
  'Cuisine equipee': 'restaurant',
  'Meublé': 'bed',
  'Balcon': 'home',
  'Terrasse': 'sunny',
  'Parking': 'car',
};

export default function PropertyDetailScreen({ navigation, route }) {
  const params = route?.params || {};
  const r = useResponsive();
  const { width: W } = useWindowDimensions();
  // Guard mode invit\u00e9 : PropertyDetail ne s'ouvre qu'aux utilisateurs connect\u00e9s.
  // (Deep-link direct depuis /property/:id \u2192 redirige vers Auth.)
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthed) {
      // Message + redirection vers Auth stack.
      requireAuth(navigation, 'voir cette annonce');
      // Ferme cet \u00e9cran pour ne pas laisser un contenu prot\u00e9g\u00e9 apparent.
      const t = setTimeout(() => {
        try { navigation.goBack(); } catch {}
      }, 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isAuthed, navigation]);
  // Cap hero pour desktop : on prefere 500px max pour ne pas dominer l'ecran.
  const HERO_H = Math.min(Math.round(W * 0.75), r.isDesktop ? 520 : 600);
  // Largeur reelle du carousel (calculee via onLayout) - sur web la fenetre
  // peut differer de la zone rendue (container centre / scrollbar / zoom).
  const [carouselW, setCarouselW] = useState(0);
  // Source 1: item complet passe en navigation. Source 2: id (deep-link, my-listings, etc.)
  const initialItem = params.item || (params.id ? { id: params.id } : {});
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(!params.item && !!params.id);
  const [refreshing, setRefreshing] = useState(false);
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
      else Alert.alert('Annonce introuvable', r.error || "Cette annonce n'existe plus ou a été supprimée.", [
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

  const onVisit = () => {
    if (!requireEmailVerified('demander une visite')) return;
    setBookingOpen(true);
  };

  const onContact = async () => {
    if (!requireEmailVerified('contacter un vendeur')) return;
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
        title: item.ownerName || 'Propriétaire',
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); if (params.id || item.id) { const r2 = await getProperty(params.id || item.id); if (r2.ok && r2.data) setItem(r2.data); } setRefreshing(false); }} colors={[C.primary]} tintColor={C.primary} />}
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
                  <Text style={[styles.rating, { color: C.primary, marginLeft: 4 }]}>Vérifié</Text>
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
            {item.floors > 0 && <SpecCell icon="layers-outline" label={`${item.floors} étages`} />}
            {item.yearBuilt && <SpecCell icon="calendar-outline" label={`${item.yearBuilt}`} />}
          </View>

          <View style={styles.divider} />

          {/* Hôte (nom + avatar cliquables vers PublicProfile).
              Les boutons de contact (WhatsApp / Site / Reservation / Message)
              sont regroupés juste en dessous. */}
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
                  {(ownerProfile?.agencyName || ownerProfile?.fullName || item.ownerName || 'O').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.hostTitle}>
                  {ownerProfile?.agencyName || ownerProfile?.fullName || item.ownerName || 'Propriétaire'}
                </Text>
                {(item.verified || ownerProfile?.verified) && (
                  <Ionicons name="checkmark-circle" size={14} color="#1D4ED8" />
                )}
              </View>
              <Text style={styles.hostSub}>
                {ownerProfile?.agencyName ? 'Agence immobilière' : (ownerProfile?.role || item.ownerType || 'Propriétaire')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>

          {/* Boutons de contact : WhatsApp + Site (si renseignés) + Réservation + Message ORIZON */}
          <ContactButtons
            item={item}
            ownerProfile={ownerProfile}
            onVisit={onVisit}
            onContact={onContact}
          />

          <View style={styles.divider} />

          {/* Description */}
          {item.description ? (
            <>
              <Text style={styles.sectionTitle}>À propos de ce bien</Text>
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
                <Text style={styles.miniMapBadgeTxt}>Plein écran</Text>
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

          {/* Avis (reviews) sur cette annonce.
              - Bouton "Donner un avis" (ouvre modal ReviewComposer)
              - Liste des avis approuvés (nom, étoiles, message)
              - Signaler l'annonce = bouton flag en haut de la page. */}
          <View style={styles.divider} />
          <PropertyReviews
            propertyId={item.id}
            ownerId={item.ownerId}
          />
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPrice}>${Number(item.price).toLocaleString()}</Text>
            <Text style={styles.bottomPriceUnit}>
              {priceSuffix(item) || (isRent ? '/ mois' : 'prix demandé')}
            </Text>
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

// ────────────────────────────────────────────────────────────
// Boutons de contact affichés sous la carte "hôte".
// WhatsApp + Site apparaissent SEULEMENT s'ils sont renseignés sur le profil
// du propriétaire (RegisterScreen ou EditProfileScreen).
// Sinon on affiche un rappel : "Contactez uniquement via ORIZON".
// Réservation + Message ORIZON sont toujours affichés.
// ────────────────────────────────────────────────────────────
function ContactButtons({ item, ownerProfile, onVisit, onContact }) {
  const wa = ownerProfile?.whatsappLink || item?.ownerWhatsapp || null;
  const web = ownerProfile?.website || item?.ownerWebsite || null;

  const openUrl = (url) => {
    if (!url) return;
    let u = String(url).trim();
    if (!/^https?:\/\//i.test(u) && !u.startsWith('mailto:') && !u.startsWith('tel:')) {
      // Auto-préfixe https:// pour les URLs de site sans schéma.
      u = 'https://' + u;
    }
    Linking.openURL(u).catch(() => Alert.alert('Lien', 'Impossible d\'ouvrir ce lien.'));
  };

  const showExternal = !!wa || !!web;

  return (
    <View style={styles.contactWrap}>
      {/* Ligne principale : Réservation + Message direct (toujours dispo). */}
      <View style={styles.contactRow}>
        <Pressable style={[styles.contactCta, styles.contactCtaPrimary]} onPress={onVisit}>
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={styles.contactCtaTxtPrimary}>Réserver / Visiter</Text>
        </Pressable>
        <Pressable style={[styles.contactCta, styles.contactCtaSecondary]} onPress={onContact}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
          <Text style={styles.contactCtaTxtSecondary}>Message direct</Text>
        </Pressable>
      </View>

      {/* Ligne secondaire : WhatsApp + Site (si le proprio les a renseignés). */}
      {showExternal ? (
        <View style={styles.contactRow}>
          {wa && (
            <Pressable style={[styles.contactCta, styles.contactCtaWa]} onPress={() => openUrl(wa)}>
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={styles.contactCtaTxtPrimary}>WhatsApp</Text>
            </Pressable>
          )}
          {web && (
            <Pressable style={[styles.contactCta, styles.contactCtaWeb]} onPress={() => openUrl(web)}>
              <Ionicons name="globe-outline" size={16} color="#fff" />
              <Text style={styles.contactCtaTxtPrimary}>Site web</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.contactHint}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.muted} />
          <Text style={styles.contactHintTxt}>
            Ce vendeur n'a pas fourni de contact externe. Passez par la messagerie ORIZON
            ou la demande de réservation pour le joindre en toute sécurité.
          </Text>
        </View>
      )}
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Section Avis sur la page annonce.
// - Affiche la moyenne + nombre + liste des avis approuvés (nom + étoiles + texte).
// - Bouton "Donner un avis" qui ouvre un mini-composer (rating 1-5 + message).
// - L'avis passe en modération (status='pending') puis apparaît après validation.
// ────────────────────────────────────────────────────────────
function PropertyReviews({ propertyId, ownerId }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const r = await listReviewsForProperty(propertyId);
    setItems(r.ok ? (r.data || []) : []);
    setLoading(false);
  }, [propertyId]);

  React.useEffect(() => { reload(); }, [reload]);

  const submit = async () => {
    if (!text.trim() || text.trim().length < 5) {
      Alert.alert('Avis', 'Écris quelques mots (5 caractères minimum).');
      return;
    }
    setBusy(true);
    try {
      const r = await leaveReview({ propertyId, agentId: ownerId, rating, content: text.trim() });
      if (!r.ok) {
        Alert.alert('Avis', r.error || 'Échec.');
        return;
      }
      Alert.alert(
        'Merci !',
        r.moderated
          ? 'Ton avis a été envoyé mais il attend une modération manuelle.'
          : 'Ton avis a été envoyé. Il apparaîtra après validation par notre équipe.',
      );
      setText(''); setRating(5); setComposerOpen(false);
      reload();
    } finally { setBusy(false); }
  };

  const avg = items.length > 0
    ? Math.round((items.reduce((s, r) => s + Number(r.rating || 0), 0) / items.length) * 10) / 10
    : 0;

  const isMineOnMine = ownerId && currentUserId && ownerId === currentUserId;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.sectionTitle}>
          Avis {items.length > 0 ? `(${items.length})` : ''}
        </Text>
        {!isMineOnMine && (
          <Pressable
            style={styles.reviewBtn}
            onPress={() => {
              if (!currentUserId) {
                Alert.alert('Connexion requise', 'Connecte-toi pour donner un avis.');
                return;
              }
              setComposerOpen((v) => !v);
            }}
          >
            <Ionicons name={composerOpen ? 'close' : 'star-outline'} size={14} color={C.primary} />
            <Text style={styles.reviewBtnTxt}>{composerOpen ? 'Annuler' : 'Donner un avis'}</Text>
          </Pressable>
        )}
      </View>

      {avg > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{avg.toFixed(1)}</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>· {items.length} avis</Text>
        </View>
      )}

      {composerOpen && (
        <View style={styles.reviewComposer}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>Ta note</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={8}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={26}
                  color={n <= rating ? '#F59E0B' : C.muted}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Partage ton expérience (accueil, propreté, exactitude…)"
            placeholderTextColor={C.muted}
            multiline
            style={styles.reviewInput}
          />
          <Pressable style={[styles.reviewSubmit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Envoyer mon avis</Text>}
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />
      ) : items.length === 0 ? (
        <Text style={{ color: C.muted, fontSize: 13 }}>
          Aucun avis pour le moment. Sois le premier à en laisser un !
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {items.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {r.reviewer?.avatarUrl ? (
                  <Image source={{ uri: r.reviewer.avatarUrl }} style={styles.reviewAvatar} />
                ) : (
                  <View style={[styles.reviewAvatar, { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>
                      {(r.reviewer?.fullName || 'U').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>
                    {r.reviewer?.fullName || 'Utilisateur'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= Number(r.rating || 0) ? 'star' : 'star-outline'}
                        size={12}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                </View>
                {r.createdAt && (
                  <Text style={{ fontSize: 11, color: C.muted }}>
                    {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
              {r.content ? (
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 19, marginTop: 8 }}>
                  {r.content}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
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

  // Boutons de contact regroupés (2 lignes : ORIZON + externes WhatsApp/Site).
  contactWrap: { gap: 8, marginTop: 12 },
  contactRow: { flexDirection: 'row', gap: 8 },
  contactCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  contactCtaPrimary: { backgroundColor: C.primary },
  contactCtaSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.primary },
  contactCtaWa: { backgroundColor: '#25D366' },
  contactCtaWeb: { backgroundColor: '#111827' },
  contactCtaTxtPrimary: { color: '#fff', fontWeight: '700', fontSize: 13 },
  contactCtaTxtSecondary: { color: C.primary, fontWeight: '700', fontSize: 13 },
  contactHint: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactHintTxt: { flex: 1, fontSize: 11.5, color: C.muted, lineHeight: 16 },

  // Section Avis.
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: C.primary,
  },
  reviewBtnTxt: { color: C.primary, fontWeight: '700', fontSize: 12 },
  reviewComposer: {
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  reviewInput: {
    minHeight: 70,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  reviewSubmit: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewCard: {
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface },
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
