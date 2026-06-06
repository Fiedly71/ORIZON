// Ecran Profil ORIZON - Design epure noir et blanc.
// Items groupes par categorie, sans redondance.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/useAuthStore';
import { signOut, hydrateProfile, resendEmailVerification, canPublish } from '../services/authService';
import { deleteMyAccount } from '../services/accountService';

const M = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  border: '#E5E5E5',
  borderStrong: '#D4D4D4',
  text: '#0A0A0A',
  textSoft: '#525252',
  muted: '#737373',
};

const GROUPS = [
  {
    title: 'Administration',
    items: [
      { key: 'Admin',    icon: 'grid-outline', label: 'Dashboard administratif', adminOnly: true },
    ],
  },
  {
    title: 'Mon activite',
    items: [
      { key: 'MyListings',   icon: 'home-outline',          label: 'Mes annonces',  publisherOnly: true },
      { key: 'SellerStats',  icon: 'stats-chart-outline',   label: 'Statistiques',  publisherOnly: true },
      { key: 'AgencyManage', icon: 'business-outline',      label: 'Mon agence',    publisherOnly: true },
      { key: 'MyVisits',     icon: 'calendar-outline',      label: 'Mes visites' },
      { key: 'Favorites',    icon: 'heart-outline',         label: 'Favoris' },
      { key: 'Alerts',       icon: 'notifications-outline', label: 'Recherches sauvegardees' },
      { key: 'Reviews',      icon: 'star-outline',          label: 'Mes avis',      publisherOnly: true },
    ],
  },
  {
    title: 'Verification & Securite',
    items: [
      { key: 'Kyc',          icon: 'shield-checkmark-outline', label: "Verification d'identite (KYC)", publisherOnly: true },
      { key: 'BlockedUsers', icon: 'ban-outline',              label: 'Utilisateurs bloques' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { key: 'Payments',  icon: 'card-outline',       label: 'Historique paiements' },
      { key: 'Mortgage',  icon: 'calculator-outline', label: "Calculateur d'hypotheque" },
    ],
  },
  {
    title: 'Aide',
    items: [
      { key: 'Help',     icon: 'help-circle-outline',        label: 'Aide / FAQ' },
      { key: 'Support',  icon: 'chatbubbles-outline',        label: 'Contacter le support' },
      { key: 'About',    icon: 'information-circle-outline', label: 'A propos' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { key: 'Terms',    icon: 'document-text-outline', label: "Conditions d'utilisation" },
      { key: 'Privacy',  icon: 'lock-closed-outline',   label: 'Politique de confidentialite' },
    ],
  },
];



function KycBadge({ user }) {
  if (!user || !user.verified) return null;
  return (
    <Ionicons name="checkmark-circle" size={16} color="#1D4ED8" />
  );
}

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrateProfile().catch(() => {});
  }, []);

  const onResend = async () => {
    const r = await resendEmailVerification();
    Alert.alert(
      'Email de verification',
      r.ok ? 'Email renvoye. Verifie ta boite de reception.' : (r.error || 'Echec'),
    );
  };

  const initial = (user?.fullName || user?.email || 'U').slice(0, 1).toUpperCase();
  const showEmailWarning = user && !user.emailConfirmedAt;
  const isAdmin = user?.role === 'admin';
  const isPublisher = canPublish(user);

  const filterItems = (items) =>
    items.filter((it) => {
      if (it.publisherOnly && !isPublisher) return false;
      if (it.adminOnly && !isAdmin) return false;
      return true;
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Profil</Text>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={M.text} />
          </Pressable>
        </View>

        {showEmailWarning && (
          <Pressable style={styles.warningBanner} onPress={onResend}>
            <Ionicons name="mail-unread-outline" size={18} color={M.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Verifie ton email</Text>
              <Text style={styles.warningTxt}>Touche pour renvoyer le mail de verification.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={M.text} />
          </Pressable>
        )}

        <View style={styles.headerCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('EditProfile')}
            hitSlop={6}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraDot}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </Pressable>

          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.agencyName || user?.fullName || 'Utilisateur'}
              </Text>
              <KycBadge user={user} />
            </View>
            <Text style={styles.email} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={styles.row}>
              {user?.role && <Text style={styles.role}>{user.role}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={15} color={M.text} />
            <Text style={styles.quickTxt}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('ResetPassword', { fromProfile: true })}>
            <Ionicons name="key-outline" size={15} color={M.text} />
            <Text style={styles.quickTxt}>Mot de passe</Text>
          </Pressable>
        </View>

        {GROUPS.map((group) => {
          const items = filterItems(group.items);
          if (items.length === 0) return null;
          return (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.list}>
                {items.map((s, i) => (
                  <Pressable
                    key={s.key}
                    style={[styles.rowItem, i === items.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      if (s.key === 'Reviews') {
                        navigation.navigate('Reviews', { userId: user.id, userName: user.fullName || user.agencyName });
                      } else {
                        navigation.navigate(s.key);
                      }
                    }}
                  >
                    <Ionicons name={s.icon} size={20} color={M.text} style={{ width: 24 }} />
                    <Text style={styles.rowLabel}>{s.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={M.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <Pressable style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={M.text} />
          <Text style={styles.signOutTxt}>Se deconnecter</Text>
        </Pressable>

        <Pressable
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              'Supprimer mon compte ?',
              'Cette action est irreversible. Ton profil sera anonymise, tes annonces archivees, et ton compte definitivement supprime sous 30 jours conformement au RGPD.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    const r = await deleteMyAccount();
                    if (!r.ok) Alert.alert('Erreur', r.error || 'Echec de la suppression');
                  },
                },
              ],
            );
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
          <Text style={styles.deleteTxt}>Supprimer mon compte</Text>
        </Pressable>

        <Text style={styles.version}>ORIZON v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M.bg },
  body: { padding: 16, gap: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  topTitle: { fontSize: 28, fontWeight: '800', color: M.text, letterSpacing: -0.5 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: M.surface, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: M.borderStrong,
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: M.text },
  warningTxt: { fontSize: 11, color: M.textSoft, marginTop: 2 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 8,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: M.surface,
  },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 26 },
  cameraDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 18, fontWeight: '800', color: M.text },
  email: { fontSize: 12, color: M.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  role: { fontSize: 10, color: M.text, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: M.surface, borderWidth: 1, borderColor: M.border,
  },
  quickTxt: { fontSize: 12, color: M.text, fontWeight: '700' },

  group: { gap: 8 },
  groupTitle: {
    fontSize: 11, fontWeight: '700', color: M.muted,
    textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 4,
  },
  list: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: M.border, overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: M.border,
  },
  rowLabel: { flex: 1, fontSize: 14, color: M.text, fontWeight: '500' },

  signOut: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: M.borderStrong,
    backgroundColor: '#fff',
  },
  signOutTxt: { color: M.text, fontWeight: '700', fontSize: 14 },

  deleteBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  deleteTxt: { color: '#DC2626', fontWeight: '600', fontSize: 12 },

  version: {
    textAlign: 'center', fontSize: 11, color: M.muted, marginTop: 16,
  },
});
