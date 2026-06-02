// Ecran placeholder (sera enrichi par patches dedies).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';

export default function PlaceholderScreen({ navigation, route }) {
  const title = route.params?.title || route.name;
  const note = route.params?.note || 'Section en cours de finalisation.';
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={title} onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Ionicons name="construct-outline" size={48} color={C.muted} />
        <Text style={styles.h}>{title}</Text>
        <Text style={styles.p}>{note}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  h: { fontSize: 16, fontWeight: '800', color: C.text },
  p: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
});
