import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  primary: '#00A38D',
  accent: '#00BFA6',
  primarySoft: '#E0F7F4',
  success: '#10B981',
  danger: '#EF4444',
  rent: '#0EA5E9',
  white: '#FFFFFF',
  card: '#FFFFFF',
  textDark: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
};

function stars(n) {
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

export default function PropertyCard({
  item,
  text,
  onContact,
  onFavorite,
  isFavorite,
  onOpenDetails,
  onCompare,
  isCompared,
}) {
  const statusColor =
    item.status === 'A vendre' || item.status === 'A vann' ? C.success :
    item.status === 'A louer'  || item.status === 'A lwe'   ? C.rent    : C.muted;

  const statusLabel =
    item.status === 'A vendre' || item.status === 'A vann' ? text.forSale :
    item.status === 'A louer'  || item.status === 'A lwe'   ? text.forRent  : item.status;

  return (
    <View style={styles.card}>
      {/* ── Image ── */}
      <View style={styles.imgWrap}>
        <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />

        {/* status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusTxt}>{statusLabel}</Text>
        </View>

        {/* favorite */}
        <Pressable
          style={[styles.favBtn, isFavorite && styles.favBtnOn]}
          onPress={() => onFavorite(item.id)}
          hitSlop={8}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorite ? C.danger : C.muted}
          />
        </Pressable>

        {/* verified badge */}
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>✓ {text.verified}</Text>
          </View>
        )}
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* type chip + rating */}
        <View style={styles.metaRow}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipTxt}>{item.type}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.starTxt}>{stars(item.rating)}</Text>
            <Text style={styles.ratingCount}>({item.reviews ?? 0})</Text>
          </View>
        </View>

        {/* title */}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

        {/* location */}
        <View style={styles.inlineMeta}>
          <Ionicons name="location-outline" size={13} color={C.muted} />
          <Text style={styles.location}>{item.location}</Text>
        </View>

        {/* specs row */}
        {item.type !== 'Terrain' && (
          <View style={styles.specsRow}>
            {item.bedrooms > 0 && (
              <View style={styles.inlineMeta}>
                <Ionicons name="bed-outline" size={13} color={C.textDark} />
                <Text style={styles.spec}>{item.bedrooms}</Text>
              </View>
            )}
            {item.bathrooms > 0 && (
              <View style={styles.inlineMeta}>
                <Ionicons name="water-outline" size={13} color={C.textDark} />
                <Text style={styles.spec}>{item.bathrooms}</Text>
              </View>
            )}
            <View style={styles.inlineMeta}>
              <Ionicons name="resize-outline" size={13} color={C.textDark} />
              <Text style={styles.spec}>{item.area} m²</Text>
            </View>
          </View>
        )}
        {item.type === 'Terrain' && (
          <View style={styles.specsRow}>
            <View style={styles.inlineMeta}>
              <Ionicons name="resize-outline" size={13} color={C.textDark} />
              <Text style={styles.spec}>{item.area} m²</Text>
            </View>
          </View>
        )}

        {/* price */}
        <Text style={styles.price}>${item.price.toLocaleString()}</Text>

        {/* owner */}
        <View style={styles.inlineMeta}>
          <Ionicons name="pricetag-outline" size={13} color={C.muted} />
          <Text style={styles.owner} numberOfLines={1}>{item.ownerName} · {item.ownerType}</Text>
        </View>

        {/* actions */}
        <View style={styles.actions}>
          <Pressable style={styles.btnPrimary} onPress={() => onOpenDetails(item)}>
            <Text style={styles.btnPrimaryTxt}>{text.openDetails}</Text>
          </Pressable>

          <Pressable style={styles.btnSecondary} onPress={() => onContact(item)}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.primary} />
          </Pressable>

          <Pressable
            style={[styles.btnSecondary, isCompared && styles.btnComparedOn]}
            onPress={() => onCompare(item)}
          >
            <Ionicons name="git-compare-outline" size={18} color={C.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  imgWrap: {
    position: 'relative',
    height: 150,
    backgroundColor: '#e5e7eb',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusTxt: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnOn: {
    backgroundColor: '#FFE4E6',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(39,174,96,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedTxt: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    padding: 10,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeChipTxt: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starTxt: {
    color: C.accent,
    fontSize: 12,
  },
  ratingCount: {
    color: C.muted,
    fontSize: 11,
  },
  title: {
    color: C.textDark,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  location: {
    color: C.muted,
    fontSize: 12,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  spec: {
    color: C.textDark,
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  owner: {
    color: C.muted,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnComparedOn: {
    backgroundColor: '#DDEBFF',
  },
});
