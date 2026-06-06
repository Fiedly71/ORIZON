// ImageViewer - Visionneuse plein ecran avec swipe + close.
import React, { useState } from 'react';
import {
  Modal, View, Image, Pressable, FlatList, Dimensions, Text, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: W, height: H } = Dimensions.get('window');

export default function ImageViewer({ visible, images, initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
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
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item }) => (
            <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: item }} style={{ width: W, height: W }} resizeMode="contain" />
            </View>
          )}
        />
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
});
