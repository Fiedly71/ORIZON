// Ecran d'onboarding ORIZON - 3 slides illustrees.
// Pas de dependance externe (FlatList horizontal + paging). Les images sont
// chargees depuis Unsplash en attendant le brand pack final (Patch 28).
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../theme/colors';

const { width } = Dimensions.get('window');
export const ONBOARDING_KEY = 'orizon.onboarded.v1';

const SLIDES = [
  {
    id: '1',
    title: 'Trouve ton chez-toi',
    sub: "Parcoure des centaines d'annonces verifiees a travers Haiti, du Cap a Jacmel.",
    img: require('../../assets/a.webp'),
  },
  {
    id: '2',
    title: 'Visite et negocie en confiance',
    sub: 'Reserve une visite en deux clics. Suivi rappel, check-in et avis verifies.',
    img: require('../../assets/b.webp'),
  },
  {
    id: '3',
    title: 'Vends sans intermediaire',
    sub: 'Publie ton bien en 3 etapes, recois des demandes serieuses de toute Haiti.',
    img: require('../../assets/c.webp'),
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const ref = useRef(null);

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    try { navigation.replace('Login'); }
    catch { try { navigation.navigate('Login'); } catch {} }
  };

  const next = () => {
    const nextIndex = index + 1;
    if (nextIndex < SLIDES.length) {
      // setIndex immediat pour que le dot + le texte du CTA bougent meme si
      // onMomentumScrollEnd n'est pas declenche (cas web). On utilise
      // scrollToOffset car scrollToIndex est instable sur react-native-web.
      setIndex(nextIndex);
      try {
        ref.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
      } catch {}
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Image
          source={require('../../assets/logo-horizontal.png')}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="ORIZON"
        />
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <FlatList
        ref={ref}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={32}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.img} style={styles.img} resizeMode="cover" />
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      <Pressable style={styles.cta} onPress={next}>
        <Text style={styles.ctaTxt}>{index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  skipRow: { paddingHorizontal: 20, paddingTop: 6, alignItems: 'flex-end' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  brandLogo: { width: 120, height: 36 },
  skip: { color: C.muted, fontSize: 13, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12 },
  img: { width: width - 40, height: width - 60, borderRadius: 24, backgroundColor: C.surface },
  body: { paddingHorizontal: 28, marginTop: 28, alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotOn: { backgroundColor: C.primary, width: 22 },
  cta: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: C.accent,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
