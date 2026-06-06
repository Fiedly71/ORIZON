// HorizontalSection - rangee horizontale de proprietes avec titre + "Voir plus".
import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';

export default function HorizontalSection({
  section,
  items,
  onItemPress,
  onSeeAll,
  isFavorite,
  onFavorite,
}) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: section.color + '22' }]}>
          <Ionicons name={section.icon} size={16} color={section.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{section.label}</Text>
          {section.subtitle && <Text style={styles.subtitle}>{section.subtitle}</Text>}
        </View>
        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
          <Text style={styles.seeAllTxt}>Voir tout</Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        horizontal
        keyExtractor={(it) => `${section.id}-${it.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onItemPress(item)}>
            <View style={styles.imgWrap}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.img} />
              ) : (
                <View style={[styles.img, { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="image-outline" size={28} color={C.muted} />
                </View>
              )}
              <Pressable style={styles.heart} onPress={() => onFavorite?.(item.id)} hitSlop={6}>
                <Ionicons name={isFavorite?.(item.id) ? 'heart' : 'heart-outline'}
                  size={18} color={isFavorite?.(item.id) ? C.danger : '#fff'} />
              </Pressable>
              {item._dist != null && (
                <View style={styles.distBadge}>
                  <Text style={styles.distTxt}>{item._dist < 1 ? `${Math.round(item._dist * 1000)}m` : `${item._dist.toFixed(1)}km`}</Text>
                </View>
              )}
              {(item.featured || item.isPremium) && (
                <View style={styles.premBadge}>
                  <Ionicons name="star" size={9} color="#fff" />
                  <Text style={styles.premTxt}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.loc} numberOfLines={1}>
              <Ionicons name="location-outline" size={10} color={C.muted} /> {item.location || '—'}
            </Text>
            <Text style={styles.price}>${Number(item.price || 0).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const CARD_W = 220;

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xxl, marginBottom: spacing.md, gap: spacing.md,
  },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11.5, color: C.muted, marginTop: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt: { color: C.primary, fontWeight: '700', fontSize: 13 },
  card: { width: CARD_W },
  imgWrap: { width: CARD_W, height: 140, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: C.surface, position: 'relative' },
  img: { width: '100%', height: '100%' },
  heart: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  distBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  distTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  premBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#feac00', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  premTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  name: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 6 },
  loc: { fontSize: 11, color: C.muted, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: C.primary, marginTop: 3 },
});
