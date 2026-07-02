// ImageViewer - Visionneuse plein ecran avec swipe + close.
// Protections anti-download :
//   - Web : oncontextmenu bloque, draggable=false, watermark ORIZON diagonal
//   - Natif : preventScreenCaptureAsync (Android bloque, iOS detecte seulement)
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Image, Pressable, FlatList, Dimensions, Text, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: W, height: H } = Dimensions.get('window');

// Chargement conditionnel de expo-screen-capture (evite crash si module absent)
let ScreenCapture = null;
if (Platform.OS !== 'web') {
  try { ScreenCapture = require('expo-screen-capture'); } catch (_) { ScreenCapture = null; }
}

export default function ImageViewer({ visible, images, initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => { setIdx(initialIndex); }, [initialIndex, visible]);

  useEffect(() => {
    if (!visible || !ScreenCapture) return undefined;
    let sub = null;
    (async () => {
      try { await ScreenCapture.preventScreenCaptureAsync?.('orizon-viewer'); } catch (_) {}
      try {
        sub = ScreenCapture.addScreenshotListener?.(() => {
          // iOS: pas moyen de bloquer, on note simplement
        });
      } catch (_) {}
    })();
    return () => {
      try { sub?.remove?.(); } catch (_) {}
      try { ScreenCapture.allowScreenCaptureAsync?.('orizon-viewer'); } catch (_) {}
    };
  }, [visible]);

  if (!images?.length) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.bg}>
        <SafeAreaView style={styles.top} edges={['top']}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.counter}>{idx + 1} / {images.length}</Text>
          <View style={{ width: 32 }} />
        </SafeAreaView>

        <FlatList
          data={images}
          horizontal pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / W);
            if (i !== idx && i >= 0 && i < images.length) setIdx(i);
          }}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item }) => (
            <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={{ uri: item }}
                style={{ width: W, height: W }}
                resizeMode="contain"
                draggable={false}
                {...(Platform.OS === 'web' ? {
                  onContextMenu: (e) => e.preventDefault?.(),
                } : {})}
              />
              {/* Watermark diagonal ORIZON — decourage capture d'ecran */}
              <View pointerEvents="none" style={styles.watermarkWrap}>
                <Text style={styles.watermarkText}>ORIZON  ·  kayorizon.com</Text>
                <Text style={styles.watermarkText}>ORIZON  ·  kayorizon.com</Text>
                <Text style={styles.watermarkText}>ORIZON  ·  kayorizon.com</Text>
              </View>
            </View>
          )}
        />

        {/* Bandeau bas anti-capture */}
        <View pointerEvents="none" style={styles.bottomNote}>
          <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.bottomNoteTxt}>Image protegee ORIZON — reproduction interdite</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  counter: { color: '#fff', fontWeight: '700', fontSize: 15 },
  watermarkWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'space-around',
    transform: [{ rotate: '-25deg' }],
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.14)',
    fontSize: 26, fontWeight: '800', letterSpacing: 3,
  },
  bottomNote: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 16,
  },
  bottomNoteTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
});
