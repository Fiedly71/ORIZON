// PropertyCardAirbnb - card style Airbnb avec photo plein largeur swipeable,
// coeur favori en overlay, prix gras, infos minimales sous l'image.
import React, { useState, useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import { isSuperhost } from '../utils/superhost';

export default function PropertyCardAirbnb({
  item,
  isFavorite,
  onFavorite,
  onOpen,
  width,
}) {
  const { width: SCREEN_W } = useWindowDimensions();
  const CARD_W = width || (SCREEN_W - spacing.xxl * 2);
  const CARD_H = Math.round(CARD_W * 0.95);
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef(null);

  const photos = (item.images && item.images.length > 0)
    ? item.images
    : (item.image ? [item.image] : []);

  const hasPhotos = photos.length > 0;

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const isRent = item.status === 'A louer' || item.status === 'A lwe' || item.status === 'rent';
  const priceLabel = isRent ? '/ mois' : '';

  return (
    <Pressable style={[styles.wrap, { width: CARD_W }]} onPress={() => onOpen?.(item)}>
      {/* Carrousel photos */}
      <View style={[styles.imgWrap, { width: CARD_W, height: CARD_H }]}>
        {hasPhotos ? (
          <FlatList
            ref={flatRef}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: uri }) => (
              <Image source={{ uri }} style={[styles.img, { width: CARD_W, height: CARD_H }]} resizeMode="cover" />
            )}
          />
        ) : (
          <View style={[styles.img, styles.imgPlaceholder, { width: CARD_W, height: CARD_H }]}>
            <Ionicons name="image-outline" size={42} color="#9CA3AF" />
            <Text style={styles.imgPlaceholderTxt}>Pas de photo</Text>
          </View>
        )}

        {/* Heart favori */}
        <Pressable
          style={styles.heartBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onFavorite?.(item.id);
          }}
          hitSlop={10}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={26}
            color={isFavorite ? C.primary : '#FFFFFF'}
            style={isFavorite ? null : styles.heartShadow}
          />
        </Pressable>

        {/* Pagination dots */}
        {photos.length > 1 && (
          <View style={styles.dots}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIdx && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesRow}>
          {isSuperhost(item) && (
            <View style={[styles.badge, { backgroundColor: C.accent }]}>
              <Ionicons name="trophy" size={11} color="#fff" />
              <Text style={styles.badgeTxt}>  Superhost</Text>
            </View>
          )}
          {item.featured && !isSuperhost(item) && (
            <View style={[styles.badge, { backgroundColor: C.accent }]}>
              <Text style={styles.badgeTxt}>â˜… Coup de coeur</Text>
            </View>
          )}
          {item.verified && (
            <View style={[styles.badge, { backgroundColor: C.primary }]}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.badgeTxt}>  Verifie</Text>
            </View>
          )}
        </View>
      </View>

      {/* Infos */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{item.location}</Text>
          {item.rating > 0 && (
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color={C.text} />
              <Text style={styles.ratingTxt}>{Number(item.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>{item.title}</Text>

        <Text style={styles.specs} numberOfLines={1}>
          {item.type}
          {item.bedrooms > 0 ? ` · ${item.bedrooms} ch` : ''}
          {item.bathrooms > 0 ? ` · ${item.bathrooms} sdb` : ''}
          {item.area > 0 ? ` · ${item.area} m²` : ''}
        </Text>

        <Text style={styles.price}>
          <Text style={styles.priceVal}>${Number(item.price).toLocaleString()}</Text>
          {priceLabel && <Text style={styles.priceUnit}> {priceLabel}</Text>}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  imgWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  img: {},
  imgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  imgPlaceholderTxt: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  heartShadow: {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    paddingTop: spacing.lg,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  },
  ratingTxt: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 2,
  },
  specs: {
    fontSize: 14,
    color: C.muted,
    marginTop: 2,
  },
  price: {
    marginTop: 6,
    fontSize: 15,
    color: C.text,
  },
  priceVal: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  priceUnit: {
    color: C.muted,
    fontWeight: '400',
  },
});
