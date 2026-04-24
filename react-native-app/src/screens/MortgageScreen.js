// Calculateur d'hypotheque ORIZON: simulation par produit bancaire.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { Header } from './MyListingsScreen';
import { MORTGAGE_PRODUCTS, simulate } from '../services/mortgageService';

export default function MortgageScreen({ navigation }) {
  const [price, setPrice] = useState('120000');
  const [down, setDown] = useState('30000');
  const [years, setYears] = useState('15');
  const [productId, setProductId] = useState(MORTGAGE_PRODUCTS[0].id);

  const result = useMemo(
    () => simulate({ price: Number(price), downPayment: Number(down), productId, years: Number(years) }),
    [price, down, productId, years]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Calculateur d'hypotheque" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Field label="PRIX DU BIEN ($)" value={price} onChangeText={setPrice} />
        <Field label="APPORT ($)" value={down} onChangeText={setDown} />
        <Field label="DUREE (ANNEES)" value={years} onChangeText={setYears} />

        <Text style={styles.label}>BANQUE / PRODUIT</Text>
        <View style={{ gap: 8 }}>
          {MORTGAGE_PRODUCTS.map((p) => {
            const on = productId === p.id;
            return (
              <Pressable key={p.id} onPress={() => setProductId(p.id)} style={[styles.prod, on && styles.prodOn]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prodTitle, on && { color: C.primary }]}>{p.bank} - {p.name}</Text>
                  <Text style={styles.prodSub}>
                    Taux {(p.annualRate * 100).toFixed(2)}% / an  -  Max {p.maxYears} ans  -  Apport min {(p.minDownPct * 100).toFixed(0)}%
                  </Text>
                </View>
                <Text style={[styles.prodCurrency, on && { color: C.primary }]}>{p.currency}</Text>
              </Pressable>
            );
          })}
        </View>

        {result && (
          <View style={styles.result}>
            <Text style={styles.resTitle}>Mensualite estimee</Text>
            <Text style={styles.resBig}>${Math.round(result.monthly).toLocaleString()}</Text>
            <Row k="Capital emprunte" v={`$${Math.round(result.principal).toLocaleString()}`} />
            <Row k="Cout total" v={`$${Math.round(result.totalCost).toLocaleString()}`} />
            <Row k="Interets totaux" v={`$${Math.round(result.totalInterest).toLocaleString()}`} />
            <Row k="Apport min requis" v={`$${result.minDownRequired.toLocaleString()}`} warn={!result.downPaymentOk} />
            {!result.downPaymentOk && <Text style={styles.warn}>Apport insuffisant pour ce produit.</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType="number-pad" placeholderTextColor={C.muted} {...props} style={styles.field} />
    </View>
  );
}

function Row({ k, v, warn }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={[styles.rowV, warn && { color: C.danger }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.muted },
  field: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.text },
  prod: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff' },
  prodOn: { borderColor: C.accent, backgroundColor: C.primarySoft },
  prodTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  prodSub: { fontSize: 11, color: C.muted, marginTop: 4 },
  prodCurrency: { fontSize: 11, fontWeight: '700', color: C.muted },
  result: { padding: 16, borderRadius: 16, backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.accent },
  resTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.primary },
  resBig: { fontSize: 30, fontWeight: '900', color: C.primary, marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowK: { fontSize: 12, color: C.muted },
  rowV: { fontSize: 12, color: C.text, fontWeight: '700' },
  warn: { fontSize: 11, color: C.danger, fontWeight: '700', marginTop: 6 },
});
