// Ecran Carte ORIZON: affiche les annonces sur une carte.
// Utilise react-native-maps. En l'absence de coordonnees lat/lng dans une annonce,
// on tombe sur des coordonnees pseudo-aleatoires autour de Cap-Haitien.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { useProperty } from '../store/useProperty';
import { getCurrentPosition, HAITI_DEFAULT } from '../services/locationService';

function fakeCoordsFor(id) {
  // Hash deterministe simple -> petit offset autour de PaP (pour la demo).
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 0xff - 0.5) * 0.6;
  const dy = (((h >> 8) & 0xff) / 0xff - 0.5) * 0.6;
  return { lat: HAITI_DEFAULT.lat + dy, lng: HAITI_DEFAULT.lng + dx };
}

export default function MapScreen({ navigation }) {
  const properties = useProperty((s) => s.properties);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const region = useMemo(
    () => ({
      latitude: HAITI_DEFAULT.lat,
      longitude: HAITI_DEFAULT.lng,
      latitudeDelta: HAITI_DEFAULT.latitudeDelta,
      longitudeDelta: HAITI_DEFAULT.longitudeDelta,
    }),
    []
  );

  const markers = useMemo(
    () =>
      properties.map((p) => {
        const c = p.lat && p.lng ? { lat: p.lat, lng: p.lng } : fakeCoordsFor(p.id);
        return { ...p, _coords: c };
      }),
    [properties]
  );

  const locateMe = async () => {
    setLoading(true);
    const r = await getCurrentPosition();
    setLoading(false);
    if (r.ok) setMe(r.coords);
  };

  useEffect(() => { locateMe(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack?.()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Carte des annonces</Text>
        <Pressable onPress={locateMe} hitSlop={8}>
          {loading ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="locate" size={20} color={C.primary} />}
        </Pressable>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!!me}
        provider={PROVIDER_GOOGLE}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m._coords.lat, longitude: m._coords.lng }}
            onPress={() => setSelected(m)}
            tracksViewChanges={false}
          >
            <View style={[
              styles.priceMarker,
              selected?.id === m.id && styles.priceMarkerActive,
            ]}>
              <Text style={[
                styles.priceMarkerTxt,
                selected?.id === m.id && styles.priceMarkerTxtActive,
              ]}>
                ${Math.round((m.price || 0) / 1000)}k
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle} numberOfLines={1}>{selected.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{selected.location}</Text>
          <Text style={styles.cardPrice}>${(selected.price || 0).toLocaleString()}</Text>
          <Pressable style={styles.cta} onPress={() => navigation?.navigate?.('PropertyDetail', { id: selected.id })}>
            <Text style={styles.ctaTxt}>Voir l'annonce</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff',
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  map: { flex: 1 },
  card: {
    position: 'absolute', left: 16, right: 16, bottom: 24,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: C.primary, marginTop: 6 },
  cta: { marginTop: 10, backgroundColor: C.accent, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  priceMarker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  priceMarkerActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  priceMarkerTxt: { color: C.text, fontWeight: '700', fontSize: 12 },
  priceMarkerTxtActive: { color: '#fff' },
});
