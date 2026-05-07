// PropertyDetailScreen - Detail bien Airbnb-style :
//  - Galerie photos plein largeur
//  - Header info (titre, location, rating)
//  - Section "Hote" + Description + Equipements
//  - Sticky bottom bar : prix + bouton "Demander une visite" / "Contacter"
import React, { useState, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import { useFavorites } from '../store/useFavorites';
import VisitBookingSheet from '../components/VisitBookingSheet';
import { openConversation } from '../services/messagingService';
import { isSuperhost } from '../utils/superhost';

const { width: W } = Dimensions.get('window');
const HERO_H = Math.round(W * 0.75);

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
  const item = params.item || {};
  const [activeImg, setActiveImg] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const superhost = isSuperhost(item);

  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);
  const isFav = favIds.includes(item.id);

  const photos = (item.images && item.images.length > 0)
    ? item.images
    : (item.image ? [item.image] : ['https://picsum.photos/seed/orizon/800/800']);

  const isRent = item.status === 'A louer' || item.status === 'A lwe' || item.status === 'rent';

  const onShare = () => {
    Alert.alert('Partage', 'Lien copie : orizon.ht/p/' + item.id);
  };

  const onVisit = () => setBookingOpen(true);

  const onContact = async () => {
    if (!item.ownerId) {
      Alert.alert('Indisponible', 'Aucun proprietaire associe a cette annonce.');
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero gallery */}
        <View style={styles.heroWrap}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / W);
              setActiveImg(idx);
            }}
            renderItem={({ item: uri }) => (
              <Image source={{ uri }} style={styles.hero} resizeMode="cover" />
            )}
          />
          <View style={styles.heroDots}>
            <Text style={styles.heroDotsTxt}>{activeImg + 1} / {photos.length}</Text>
          </View>

          {/* Top buttons */}
          <SafeAreaView style={styles.topBar} edges={['top']}>
            <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable style={styles.iconBtn} onPress={onShare}>
                <Ionicons name="share-outline" size={20} color={C.text} />
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
          <View style={styles.hostRow}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarTxt}>
                {(item.ownerName || 'O').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostTitle}>Propose par {item.ownerName || 'le proprietaire'}</Text>
              <Text style={styles.hostSub}>{item.ownerType || 'Proprietaire individuel'}</Text>
            </View>
            <Pressable style={styles.contactBtn} onPress={onContact}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
              <Text style={styles.contactBtnTxt}>Contacter</Text>
            </Pressable>
          </View>

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

          {/* Localisation */}
          <Text style={styles.sectionTitle}>Localisation</Text>
          <Pressable
            style={styles.mapPlaceholder}
            onPress={() => navigation.navigate('Map')}
          >
            <Ionicons name="map" size={32} color={C.primary} />
            <Text style={styles.mapPlaceholderTxt}>Voir sur la carte</Text>
          </Pressable>
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
    width: W,
    height: HERO_H,
    backgroundColor: C.surface,
  },
  hero: { width: W, height: HERO_H },
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
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
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
