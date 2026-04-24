// Ecran Profil ORIZON - vue d'ensemble + acces rapides aux sections.
// Les sections complexes (Mes annonces, Visites, Paiements, KYC, Parametres)
// sont chacune un ecran propre, listees ici comme des "rows".
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { signOut } from '../services/authService';

const SECTIONS = [
  { key: 'MyListings',  icon: 'home-outline',          label: 'Mes annonces',     desc: 'Gere et modifie tes biens publies' },
  { key: 'MyVisits',    icon: 'calendar-outline',      label: 'Mes visites',      desc: 'Visites a venir et historique' },
  { key: 'Payments',    icon: 'card-outline',          label: 'Paiements',        desc: 'Historique Stripe et MonCash' },
  { key: 'Favorites',   icon: 'heart-outline',         label: 'Favoris',          desc: 'Tes biens preferes' },
  { key: 'Alerts',      icon: 'notifications-outline', label: 'Alertes',          desc: 'Critere -> notification automatique' },
  { key: 'Mortgage',    icon: 'calculator-outline',    label: "Calculateur d'hypotheque", desc: 'Banques HT - simulations' },
  { key: 'Kyc',         icon: 'shield-checkmark-outline', label: 'Verification (KYC)', desc: 'Obtiens le badge "verifie"' },
  { key: 'Settings',    icon: 'settings-outline',      label: 'Parametres',       desc: 'Langue, notifications, donnees' },
  { key: 'Help',        icon: 'help-circle-outline',   label: 'Aide / FAQ',       desc: 'Reponses aux questions frequentes' },
  { key: 'About',       icon: 'information-circle-outline', label: 'A propos',     desc: 'ORIZON, contact, mentions legales' },
];

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>
              {(user?.fullName || 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName || 'Utilisateur'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            {user?.role && <Text style={styles.role}>{user.role}</Text>}
          </View>
        </View>

        <View style={styles.list}>
          {SECTIONS.map((s) => (
            <Pressable key={s.key} style={styles.row} onPress={() => navigation.navigate(s.key)}>
              <View style={styles.iconWrap}>
                <Ionicons name={s.icon} size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{s.label}</Text>
                <Text style={styles.rowDesc} numberOfLines={1}>{s.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
          <Text style={styles.signOutTxt}>Se deconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { padding: 16, gap: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 22 },
  name: { fontSize: 16, fontWeight: '800', color: C.text },
  email: { fontSize: 12, color: C.muted, marginTop: 2 },
  role: { fontSize: 11, color: C.primary, marginTop: 4, fontWeight: '700', letterSpacing: 0.5 },
  list: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 13, color: C.text, fontWeight: '700' },
  rowDesc:  { fontSize: 11, color: C.muted, marginTop: 2 },
  signOut: {
    marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.danger,
  },
  signOutTxt: { color: C.danger, fontWeight: '700', fontSize: 13 },
});
