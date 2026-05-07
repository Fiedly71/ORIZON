// Ecran Profil ORIZON - vue d'ensemble + acces rapides aux sections.
// Affiche le vrai profil (depuis useAuthStore alimente par hydrateProfile),
// permet d'ouvrir EditProfile et expose un badge KYC.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { signOut, hydrateProfile, resendEmailVerification, canPublish } from '../services/authService';
import { deleteMyAccount } from '../services/accountService';

const SECTIONS = [
  { key: 'MyListings',  icon: 'home-outline',          label: 'Mes annonces',     desc: 'Gere et modifie tes biens publies', publisherOnly: true },
  { key: 'SellerStats', icon: 'stats-chart-outline',   label: 'Statistiques',     desc: 'Vues, contacts, favoris + boost premium', publisherOnly: true },
  { key: 'AgencyManage', icon: 'business-outline',     label: 'Mon agence',       desc: 'Cree une agence et invite des agents', publisherOnly: true },
  { key: 'MyVisits',    icon: 'calendar-outline',      label: 'Mes visites',      desc: 'Visites a venir et historique' },
  { key: 'PhoneVerify', icon: 'phone-portrait-outline', label: 'Verifier mon telephone', desc: 'Confirme ton numero pour publier' },
  { key: 'Payments',    icon: 'card-outline',          label: 'Paiements',        desc: 'Historique Stripe et MonCash' },
  { key: 'Favorites',   icon: 'heart-outline',         label: 'Favoris',          desc: 'Tes biens preferes' },
  { key: 'Alerts',      icon: 'notifications-outline', label: 'Alertes',          desc: 'Critere -> notification automatique' },
  { key: 'Mortgage',    icon: 'calculator-outline',    label: "Calculateur d'hypotheque", desc: 'Banques HT - simulations' },
  { key: 'Kyc',         icon: 'shield-checkmark-outline', label: 'Verification (KYC)', desc: 'Obtiens le badge "verifie"', publisherOnly: true },
  { key: 'Settings',    icon: 'settings-outline',      label: 'Parametres',       desc: 'Langue, notifications, donnees' },
  { key: 'Help',        icon: 'help-circle-outline',   label: 'Aide / FAQ',       desc: 'Reponses aux questions frequentes' },
  { key: 'Support',     icon: 'chatbubbles-outline',   label: 'Contacter le support', desc: 'Reponse sous 24h' },
  { key: 'About',       icon: 'information-circle-outline', label: 'A propos',     desc: 'ORIZON, contact, mentions legales' },
  { key: 'Terms',       icon: 'document-text-outline',     label: "Conditions d'utilisation", desc: 'CGU ORIZON' },
  { key: 'Privacy',     icon: 'lock-closed-outline',       label: 'Politique de confidentialite', desc: 'Comment nous traitons tes donnees' },
  { key: 'BlockedUsers',icon: 'ban-outline',               label: 'Utilisateurs bloques', desc: 'Gere ta liste de blocages' },
  { key: 'Admin',       icon: 'shield-outline',            label: 'Moderation',           desc: 'Outils admin', adminOnly: true },
];

function KycBadge({ user }) {
  if (!user) return null;
  if (!canPublish(user.role)) return null;
  if (user.verified) {
    return (
      <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
        <Ionicons name="checkmark-circle" size={14} color="#15803D" />
        <Text style={[styles.badgeTxt, { color: '#15803D' }]}>Verifie</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
      <Ionicons name="time-outline" size={14} color="#B45309" />
      <Text style={[styles.badgeTxt, { color: '#B45309' }]}>KYC en attente</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Recharge le profil a chaque entree dans l'ecran (au cas ou le KYC
    // viendrait d'etre approuve cote admin).
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Bandeau email non verifie */}
        {showEmailWarning && (
          <Pressable style={styles.warningBanner} onPress={onResend}>
            <Ionicons name="mail-unread-outline" size={18} color="#92400E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Verifie ton email</Text>
              <Text style={styles.warningTxt}>Touche pour renvoyer le mail de verification.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#92400E" />
          </Pressable>
        )}

        {/* En-tete profil */}
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
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.agencyName || user?.fullName || 'Utilisateur'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={styles.row}>
              {user?.role && <Text style={styles.role}>{user.role}</Text>}
              <KycBadge user={user} />
            </View>
            {user?.address ? (
              <Text style={styles.metaTxt} numberOfLines={1}>
                <Ionicons name="location-outline" size={11} color={C.muted} /> {user.address}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={16} color={C.primary} />
            <Text style={styles.quickTxt}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('ResetPassword', { fromProfile: true })}>
            <Ionicons name="key-outline" size={16} color={C.primary} />
            <Text style={styles.quickTxt}>Mot de passe</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Payments')}>
            <Ionicons name="card-outline" size={16} color={C.primary} />
            <Text style={styles.quickTxt}>Paiements</Text>
          </Pressable>
        </View>

        {/* Liste des sections */}
        <View style={styles.list}>
          {SECTIONS
            .filter((s) => !s.publisherOnly || canPublish(user?.role))
            .filter((s) => !s.adminOnly || user?.role === 'admin')
            .map((s, i, arr) => (
              <Pressable
                key={s.key}
                style={[styles.rowItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate(s.key)}
              >
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

        <Pressable
          style={[styles.signOut, { borderColor: C.danger, backgroundColor: '#FEF2F2', marginTop: 8 }]}
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
          <Ionicons name="trash-outline" size={18} color={C.danger} />
          <Text style={styles.signOutTxt}>Supprimer mon compte</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { padding: 16, gap: 14, paddingBottom: 40 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  warningTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  warningTxt: { fontSize: 11, color: '#92400E', marginTop: 1 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface,
  },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 24 },
  cameraDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 17, fontWeight: '800', color: C.text },
  email: { fontSize: 12, color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  role: { fontSize: 11, color: C.primary, fontWeight: '700', letterSpacing: 0.5 },
  metaTxt: { fontSize: 11, color: C.muted, marginTop: 2 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800' },

  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primarySoft,
  },
  quickTxt: { fontSize: 12, color: C.primary, fontWeight: '700' },

  list: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  rowItem: {
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
