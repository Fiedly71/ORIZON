// Section "Mes annonces" - liste les biens dont owner_id = utilisateur courant.
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { useProperty } from '../store/useProperty';
import { useAuthStore } from '../store/useAuthStore';
import EmptyState from '../components/EmptyState';

export default function MyListingsScreen({ navigation }) {
  const properties = useProperty((s) => s.properties);
  const user = useAuthStore((s) => s.user);
  const mine = useMemo(
    () => properties.filter((p) => p.ownerId === user?.id || p.ownerName === user?.fullName),
    [properties, user]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Mes annonces" onBack={() => navigation.goBack()} right={
        <Pressable onPress={() => navigation.navigate('SellWizard')} hitSlop={8}>
          <Ionicons name="add" size={22} color={C.primary} />
        </Pressable>
      } />
      <FlatList
        data={mine}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<EmptyState icon="home-outline" title="Aucune annonce publiee" message="Publie ton premier bien en quelques minutes." ctaLabel="Publier une annonce" onCta={() => navigation.navigate('SellWizard')} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.location}</Text>
              <Text style={styles.price}>${(item.price || 0).toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

export function Header({ title, onBack, right }) {
  return (
    <View style={hStyles.h}>
      <Pressable onPress={onBack} hitSlop={8}><Ionicons name="chevron-back" size={22} color={C.text} /></Pressable>
      <Text style={hStyles.t}>{title}</Text>
      <View style={{ width: 22 }}>{right}</View>
    </View>
  );
}

export function Empty({ msg, cta, onCta }) {
  return (
    <View style={{ alignItems: 'center', padding: 36, gap: 12 }}>
      <Ionicons name="folder-open-outline" size={48} color={C.muted} />
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{msg}</Text>
      {cta && (
        <Pressable onPress={onCta} style={{ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: C.accent, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const hStyles = StyleSheet.create({
  h: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  t: { fontSize: 14, fontWeight: '700', color: C.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: C.surface },
  title: { fontSize: 13, fontWeight: '700', color: C.text },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '800', color: C.primary, marginTop: 6 },
});
