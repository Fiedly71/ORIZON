// Bouton rafraîchir avec animation de rotation quand actif.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function RefreshBtn({ onPress, loading, color = '#64748B', size = 22, hitSlop = 10 }) {
  const spin = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);

  useEffect(() => {
    if (loading) {
      anim.current = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 700, useNativeDriver: true })
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      spin.setValue(0);
    }
    return () => anim.current?.stop();
  }, [loading, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} disabled={loading}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="refresh-outline" size={size} color={loading ? '#004c3f' : color} />
      </Animated.View>
    </Pressable>
  );
}
