// MortgageMini - mini calculateur d'hypotheque embed dans PropertyDetail.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { C, radii, spacing } from '../theme/colors';

function monthlyPayment(principal, annualRate, years) {
  const r = (annualRate / 100) / 12;
  const n = years * 12;
  if (!r) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export default function MortgageMini({ price = 0 }) {
  const [downPct, setDownPct] = useState('20');
  const [rate, setRate] = useState('9.5');
  const [years, setYears] = useState('20');

  const calc = useMemo(() => {
    const dp = (parseFloat(downPct) || 0) / 100;
    const principal = price * (1 - dp);
    const m = monthlyPayment(principal, parseFloat(rate) || 0, parseInt(years, 10) || 1);
    return {
      principal,
      monthly: isFinite(m) ? m : 0,
      total: isFinite(m) ? m * (parseInt(years, 10) || 1) * 12 : 0,
    };
  }, [price, downPct, rate, years]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Simulateur d'hypotheque</Text>
      <View style={styles.row}>
        <Field label="Apport (%)" value={downPct} onChange={setDownPct} />
        <Field label="Taux annuel (%)" value={rate} onChange={setRate} />
        <Field label="Duree (ans)" value={years} onChange={setYears} />
      </View>
      <View style={styles.result}>
        <Text style={styles.resTxt}>Mensualite estimee</Text>
        <Text style={styles.resPrice}>${Math.round(calc.monthly).toLocaleString()}</Text>
        <Text style={styles.resSub}>
          Capital emprunte : ${Math.round(calc.principal).toLocaleString()} · Total :
          ${Math.round(calc.total).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.disclaimer}>* Simulation indicative. Tarifs banques HT (Sogebank, Unibank, BNC).</Text>
    </View>
  );
}

function Field({ label, value, onChange }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.lbl}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.surface, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.lg },
  title: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  lbl: { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: radii.sm, padding: 8, backgroundColor: '#fff', color: C.text, fontSize: 14 },
  result: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: '#fff', borderRadius: radii.md },
  resTxt: { fontSize: 12, color: C.muted, fontWeight: '600' },
  resPrice: { fontSize: 24, color: C.primary, fontWeight: '800', marginTop: 2 },
  resSub: { fontSize: 11.5, color: C.muted, marginTop: 4 },
  disclaimer: { fontSize: 10.5, color: C.muted, marginTop: spacing.md, fontStyle: 'italic' },
});
