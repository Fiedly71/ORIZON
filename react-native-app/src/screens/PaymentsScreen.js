// Historique paiements (Stripe + MonCash).
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';
import EmptyState from '../components/EmptyState';
import { listMyPayments } from '../services/paymentsService';

export default function PaymentsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    const r = await listMyPayments();
    setItems(r.ok ? r.data : []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Paiements" onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        refreshing={loading}
        onRefresh={reload}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<EmptyState icon="card-outline" title="Aucun paiement" message="Tes transactions Stripe et MonCash apparaitront ici." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.provider === 'moncash' ? 'MonCash' : 'Stripe'} - {item.amount} {item.currency}</Text>
            <Text style={styles.sub}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
            <Text style={[styles.status, item.status === 'succeeded' ? { color: C.success } : { color: C.danger }]}>
              {item.status}
            </Text>
            {item.reference ? <Text style={styles.ref}>Ref: {item.reference}</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  title: { fontSize: 13, fontWeight: '700', color: C.text },
  sub: { fontSize: 11, color: C.muted, marginTop: 4 },
  status: { fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  ref: { fontSize: 10, color: C.muted, marginTop: 4 },
});
