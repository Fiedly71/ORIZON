// SkeletonCard - placeholder de chargement style Airbnb (loading shimmer simple).
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { C, radii, spacing } from '../theme/colors';

const { width: W } = Dimensions.get('window');
const CW = W - spacing.xxl * 2;

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <View style={styles.img} />
      <View style={styles.line1} />
      <View style={styles.line2} />
      <View style={styles.line3} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CW, marginBottom: spacing.xxl, alignSelf: 'center' },
  img: {
    width: CW, height: Math.round(CW * 0.95), borderRadius: radii.lg,
    backgroundColor: C.surface,
  },
  line1: { width: '60%', height: 14, backgroundColor: C.surface, borderRadius: 4, marginTop: spacing.lg },
  line2: { width: '85%', height: 12, backgroundColor: C.surface, borderRadius: 4, marginTop: 6 },
  line3: { width: '30%', height: 14, backgroundColor: C.surface, borderRadius: 4, marginTop: 6 },
});
