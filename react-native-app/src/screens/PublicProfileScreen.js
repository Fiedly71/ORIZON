// PublicProfileScreen
// Profil public d'un proprietaire / agence, accessible quand on touche le nom
// sous une annonce ou dans la liste des messages. Affiche les infos publiques
// + toutes les annonces du proprietaire, avec actions : ecrire / signaler.
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, Pressable, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { getPublicProfile, listPropertiesByOwner } from '../services/propertiesService';
import { openConversation } from '../services/messagingService';
import { reportTarget } from '../services/reportsService';
import { useAuthStore } from '../store/useAuthStore';

function VerifiedBadge({ size = 14 }) {
  return <Ionicons name="checkmark-circle" size={size} color="#1D4ED8" />;
}

export default function PublicProfileScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const fallbackName = route?.params?.name;
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [p, l] = await Promise.all([
        getPublicProfile(userId),
        listPropertiesByOwner(userId),
      ]);
      if (!alive) return;
      if (p.ok) setProfile(p.data);
      else setProfile({ id: userId, fullName: fallbackName || 'Utilisateur', verified: false });
      setListings(l.ok ? (l.data || []) : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId, fallbackName]);

  const onMessage = async () => {
    if (!userId) return;
    if (userId === currentUserId) {
      Alert.alert('Info', "Tu ne peux pas t'envoyer un message a toi-meme.");
      return;
    }
    const r = await openConversation({ propertyId: null, ownerId: userId });
    if (r.ok) {
      navigation.navigate('Conversation', {
        conversationId: r.data?.id,
        title: profile?.fullName,
      });
    } else {
      Alert.alert('Erreur', r.error || 'Impossible de demarrer la conversation.');
    }
  };

  const onReport = () => {
    Alert.alert(
      'Signaler ce profil',
      'Pourquoi veux-tu signaler ce compte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Faux profil', onPress: () => doReport('Faux profil') },
        { text: 'Annonces frauduleuses', onPress: () => doReport('Annonces frauduleuses') },
        { text: 'Comportement abusif', onPress: () => doReport('Comportement abusif') },
      ],
    );
  };
  const doReport = async (reason) => {
    const r = await reportTarget({ targetType: 'user', targetId: userId, reason });
    Alert.alert(
      'Signalement',
      r.ok ? 'Merci, notre equipe va examiner ce profil.' : (r.error || 'Échec.'),
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Profil" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile?.fullName || 'U').slice(0, 1).toUpperCase();
  const role = profile?.agencyName ? 'Agence' : (profile?.role || 'Particulier');
  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Profil" onBack={() => navigation.goBack()} onReport={onReport} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, width: '100%', maxWidth: 880, alignSelf: 'center' }}>
        <View style={styles.hero}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarTxt}>{initial}</Text>
            </View>
          )}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile?.agencyName || profile?.fullName}</Text>
            {profile?.verified ? <VerifiedBadge size={18} /> : null}
          </View>
          <Text style={styles.role}>{role}</Text>
          {memberSince ? (
            <Text style={styles.memberSince}>Membre depuis {memberSince}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onMessage}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryTxt}>Écrire</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={onReport}>
            <Ionicons name="flag-outline" size={18} color={C.danger} />
            <Text style={[styles.btnGhostTxt, { color: C.danger }]}>Signaler</Text>
          </Pressable>
        </View>

        {profile?.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>A propos</Text>
            <Text style={styles.txt}>{profile.bio}</Text>
          </View>
        ) : null}

        {profile?.address ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={16} color={C.muted} />
              <Text style={styles.txt}>{profile.address}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Annonces ({listings.length})
          </Text>
          {listings.length === 0 ? (
            <Text style={styles.muted}>Aucune annonce publique pour le moment.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {listings.map((it) => (
                <Pressable
                  key={it.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('PropertyDetail', { id: it.id, item: it })}
                >
                  {it.image ? (
                    <Image source={{ uri: it.image }} style={styles.cardImg} />
                  ) : (
                    <View style={[styles.cardImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{it.location}</Text>
                    <Text style={styles.cardPrice}>
                      {it.price ? Number(it.price).toLocaleString('fr-FR') : '—'} HTG
                      {it.status?.toLowerCase().includes('lou') ? ' / mois' : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack, onReport }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onReport ? (
        <Pressable onPress={onReport} hitSlop={10}>
          <Ionicons name="flag-outline" size={20} color={C.text} />
        </Pressable>
      ) : <View style={{ width: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 36, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  name: { fontSize: 20, fontWeight: '800', color: C.text },
  role: { fontSize: 13, color: C.muted, fontWeight: '600' },
  memberSince: { fontSize: 12, color: C.muted },
  actions: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 8,
  },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  btnPrimary: { backgroundColor: C.primary },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { borderWidth: 1, borderColor: '#E5E5E5' },
  btnGhostTxt: { fontWeight: '700', fontSize: 14 },
  section: { paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 6, letterSpacing: 0.5 },
  txt: { fontSize: 14, color: C.text, lineHeight: 20 },
  muted: { fontSize: 13, color: C.muted, fontStyle: 'italic' },
  card: {
    flexDirection: 'row', gap: 12, padding: 10,
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12,
  },
  cardImg: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12, color: C.muted },
  cardPrice: { fontSize: 13, fontWeight: '700', color: C.primary, marginTop: 4 },
});
