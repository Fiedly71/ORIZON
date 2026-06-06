// AdminScreen - Vrai tableau de bord administrateur ORIZON.
// Stats en haut + 6 sections : utilisateurs, annonces, photos, revenus, KYC agences, signalements.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert,
  ActivityIndicator, ScrollView, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  isAdmin,
  getDashboardStats,
  listUsers, setUserBanned, setUserPublishFree,
  listProperties, moderateProperty,
  listPhotosForReview,
  listPayments, refundPayment,
  approveMonCashPayment, rejectMonCashPayment,
  listPendingKyc, decideKyc,
  listReports, resolveReport,
} from '../services/adminService';

// Palette monochrome (alignee avec ProfileScreen)
const M = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  card: '#F5F5F5',
  border: '#E5E5E5',
  borderStrong: '#D4D4D4',
  text: '#0A0A0A',
  textSoft: '#525252',
  muted: '#737373',
  danger: '#DC2626',
  ok: '#16A34A',
  accent: '#004c3f',
};

const TABS = [
  { key: 'overview', label: "Vue d'ensemble", icon: 'grid-outline' },
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'pending', label: 'En attente', icon: 'time-outline' },
  { key: 'moncash', label: 'MonCash', icon: 'wallet-outline' },
  { key: 'photos', label: 'Photos', icon: 'images-outline' },
  { key: 'revenue', label: 'Revenus', icon: 'cash-outline' },
  { key: 'kyc', label: 'KYC Agences', icon: 'shield-checkmark-outline' },
  { key: 'reports', label: 'Signalements', icon: 'alert-circle-outline' },
];

export default function AdminScreen({ navigation }) {
  const [admin, setAdmin] = useState(null);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => setAdmin(await isAdmin()))();
  }, []);

  useEffect(() => {
    if (admin === true) loadTab(tab);
  }, [admin, tab]);

  const loadTab = async (k, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      if (k === 'overview') {
        const r = await getDashboardStats();
        if (r.ok) setStats(r.data);
      } else if (k === 'users') {
        const r = await listUsers({ limit: 100 });
        setData(r.ok ? r.data : []);
      } else if (k === 'pending') {
        const r = await listProperties({ filter: 'pending' });
        setData(r.ok ? r.data : []);
      } else if (k === 'photos') {
        const r = await listPhotosForReview();
        setData(r.ok ? r.data : []);
      } else if (k === 'moncash') {
        const r = await listPayments({ filter: 'pending' });
        setData(r.ok ? r.data : []);
      } else if (k === 'revenue') {
        const r = await listPayments({ filter: 'all' });
        setData(r.ok ? r.data : []);
      } else if (k === 'kyc') {
        const r = await listPendingKyc();
        setData(r.ok ? r.data : []);
      } else if (k === 'reports') {
        const r = await listReports();
        setData(r.ok ? r.data : []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (admin === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={M.text} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (admin === false) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={M.text} />
          </Pressable>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={M.muted} />
          <Text style={styles.deniedTxt}>Acces refuse</Text>
          <Text style={styles.deniedSub}>Reserve aux administrateurs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={M.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Dashboard administratif</Text>
          <Text style={styles.subtitle}>{activeTab?.label || ''}</Text>
        </View>
        <Pressable onPress={() => loadTab(tab, true)} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color={M.text} />
        </Pressable>
      </View>

      {/* Onglets scrollables */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Ionicons name={t.icon} size={14} color={active ? '#fff' : M.textSoft} />
                <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenu */}
      {tab === 'overview' ? (
        <Overview stats={stats} loading={loading} onRefresh={() => loadTab('overview', true)} refreshing={refreshing} />
      ) : (
        <ListView
          tab={tab}
          data={data}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadTab(tab, true)}
          reload={() => loadTab(tab, true)}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================
// VUE D'ENSEMBLE - cartes de stats
// ============================================
function Overview({ stats, loading, onRefresh, refreshing }) {
  if (loading || !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={M.text} />
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={M.text} />}
    >
      <Section title="Utilisateurs" icon="people">
        <View style={styles.gridRow}>
          <StatCard label="Total" value={stats.users.total} icon="people-outline" />
          <StatCard label="Nouveaux aujourd'hui" value={`+${stats.users.newToday}`} highlight icon="trending-up-outline" />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Acheteurs / Locataires" value={stats.users.buyers} small />
          <StatCard label="Proprietaires" value={stats.users.owners} small />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Agences" value={stats.users.agencies} small />
          <StatCard label="Admins" value={stats.users.admins} small />
        </View>
      </Section>

      <Section title="Annonces" icon="home">
        <View style={styles.gridRow}>
          <StatCard label="En ligne" value={stats.properties.active} highlight icon="checkmark-circle-outline" />
          <StatCard label="En attente" value={stats.properties.pending} icon="hourglass-outline" />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Rejetees" value={stats.properties.rejected} small />
          <StatCard label="Vendues" value={stats.properties.sold} small />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Total" value={stats.properties.total} small />
          <StatCard label="Nouvelles aujourd'hui" value={`+${stats.properties.newToday}`} small />
        </View>
      </Section>

      <Section title="Revenus" icon="cash">
        <View style={styles.gridRow}>
          <StatCard label="Total cumule" value={fmt(stats.revenue.total)} highlight icon="wallet-outline" />
          <StatCard label="Ce mois" value={fmt(stats.revenue.thisMonth)} icon="calendar-outline" />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Aujourd'hui" value={fmt(stats.revenue.today)} small />
          <StatCard label="Rembourses" value={fmt(stats.revenue.refunded)} small danger />
        </View>
      </Section>

      <Section title="KYC Agences" icon="shield-checkmark">
        <View style={styles.gridRow}>
          <StatCard label="En attente" value={stats.kyc.pending} highlight icon="hourglass-outline" />
          <StatCard label="Approuves" value={stats.kyc.approved} icon="checkmark-done-outline" />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Rejetes" value={stats.kyc.rejected} small danger />
          <View style={{ flex: 1 }} />
        </View>
      </Section>

      <Section title="Signalements" icon="alert-circle">
        <View style={styles.gridRow}>
          <StatCard label="Ouverts" value={stats.reports.open} danger icon="warning-outline" />
          <StatCard label="Resolus" value={stats.reports.resolved} small icon="checkmark-outline" />
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, icon, children }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={styles.sectionHeader}>
        {icon && <Ionicons name={icon} size={14} color={M.muted} style={{ marginRight: 6 }} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatCard({ label, value, highlight, danger, small, icon }) {
  return (
    <View style={[
      styles.statCard,
      highlight && styles.statCardHi,
      small && styles.statCardSmall,
      danger && !highlight && styles.statCardDanger,
    ]}>
      {icon && (
        <Ionicons
          name={icon}
          size={small ? 14 : 16}
          color={highlight ? '#FFFFFF' : (danger ? M.danger : M.muted)}
          style={{ marginBottom: 6 }}
        />
      )}
      <Text style={[
        styles.statVal,
        small && { fontSize: 18 },
        highlight && { color: '#fff' },
        danger && !highlight && { color: M.danger },
      ]} numberOfLines={1}>{value}</Text>
      <Text style={[
        styles.statLbl,
        highlight && { color: '#D4D4D4' },
      ]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)) + ' F';
}

// ============================================
// LISTES (utilisateurs / annonces / photos / revenus / KYC / reports)
// ============================================
function ListView({ tab, data, loading, refreshing, onRefresh, reload }) {
  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={M.text} /></View>;
  }
  if (!data?.length) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle-outline" size={36} color={M.muted} />
        <Text style={styles.empty}>Rien a afficher</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={data}
      keyExtractor={(it, i) => String(it.id ?? i)}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={M.text} />}
      renderItem={({ item }) => {
        if (tab === 'users') return <UserRow item={item} reload={reload} />;
        if (tab === 'pending') return <PendingRow item={item} reload={reload} />;
        if (tab === 'photos') return <PhotoRow item={item} reload={reload} />;
        if (tab === 'moncash') return <MonCashPendingRow item={item} reload={reload} />;
        if (tab === 'revenue') return <PaymentRow item={item} reload={reload} />;
        if (tab === 'kyc') return <KycRow item={item} reload={reload} />;
        if (tab === 'reports') return <ReportRow item={item} reload={reload} />;
        return null;
      }}
    />
  );
}

function UserRow({ item, reload }) {
  const onBan = () => {
    Alert.alert(item.banned ? 'Debannir' : 'Bannir', `${item.full_name || item.email} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: async () => { await setUserBanned(item.id, !item.banned); reload(); },
      },
    ]);
  };
  const onFree = () => {
    const next = !item.publish_free;
    Alert.alert(
      next ? 'Publication gratuite' : 'Retirer publication gratuite',
      next
        ? `Autoriser ${item.full_name || item.email} a publier sans payer ?`
        : `Retirer l'exemption de paiement pour ${item.full_name || item.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            const r = await setUserPublishFree(item.id, next);
            if (!r.ok) Alert.alert('Erreur', r.error || '');
            reload();
          },
        },
      ]
    );
  };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.full_name || '(sans nom)'}</Text>
        <Text style={styles.rowSub}>{item.email}</Text>
        <View style={styles.tagsRow}>
          <Tag>{item.role || 'Utilisateur'}</Tag>
          {item.verified ? <Tag dark>Verifie</Tag> : null}
          {item.publish_free ? <Tag dark>Gratuit</Tag> : null}
          {item.banned ? <Tag danger>Banni</Tag> : null}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Pressable onPress={onFree} style={[styles.btn, item.publish_free ? styles.btnDanger : styles.btnOk]}>
          <Text style={styles.btnTxt}>{item.publish_free ? 'Retirer gratuit' : 'Publier gratis'}</Text>
        </Pressable>
        <Pressable onPress={onBan} style={[styles.btn, item.banned ? styles.btnOk : styles.btnDanger]}>
          <Text style={styles.btnTxt}>{item.banned ? 'Debannir' : 'Bannir'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PendingRow({ item, reload }) {
  // Etat optimiste pour faire disparaitre les boutons des qu'on a decide,
  // meme avant que le reload() de la liste n'ait fini.
  const [decided, setDecided] = useState(item.moderation_status);

  const decide = (action) => {
    Alert.alert(action === 'approved' ? 'Approuver' : 'Rejeter', item.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          setDecided(action);
          const r = await moderateProperty(item.id, action);
          if (!r?.ok && r?.error) { setDecided(item.moderation_status); Alert.alert('Erreur', r.error); }
          reload();
        },
      },
    ]);
  };
  return (
    <View style={styles.row}>
      {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : (
        <View style={[styles.thumb, { backgroundColor: M.card, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="image-outline" size={20} color={M.muted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title || 'Sans titre'}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {fmt(item.price)} | {item.city || item.location || '—'}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          Par {item.owner_name || 'inconnu'}{item.owner_phone ? ' | ' + item.owner_phone : ''} | {(item.images || []).length} photo(s)
        </Text>
      </View>
      {decided === 'approved' ? (
        <DecisionBadge kind="ok" label="Approuve" />
      ) : decided === 'rejected' ? (
        <DecisionBadge kind="danger" label="Rejete" />
      ) : (
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => decide('approved')} style={[styles.btn, styles.btnOk]}>
            <Text style={styles.btnTxt}>OK</Text>
          </Pressable>
          <Pressable onPress={() => decide('rejected')} style={[styles.btn, styles.btnDanger]}>
            <Text style={styles.btnTxt}>Rejeter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PhotoRow({ item, reload }) {
  const [decided, setDecided] = useState(null);
  // Annonces deja live — admin peut SEULEMENT rejeter (cache l'annonce)
  const reject = () => {
    Alert.alert('Rejeter cette annonce', `Les photos de "${item.title}" sont inappropriees ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
          setDecided('rejected');
          await moderateProperty(item.id, 'rejected', 'Photos non conformes');
          reload();
        },
      },
    ]);
  };
  return (
    <View style={styles.row}>
      {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowSub}>{(item.images || []).length} photos | {item.moderation_status}</Text>
      </View>
      {decided === 'rejected' ? (
        <DecisionBadge kind="danger" label="Rejete" />
      ) : (
        <Pressable onPress={reject} style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTxt}>Rejeter</Text>
        </Pressable>
      )}
    </View>
  );
}

function PaymentRow({ item, reload }) {
  const [refunded, setRefunded] = useState(!!item.refunded);
  const refund = () => {
    Alert.alert('Rembourser', `${fmt(item.amount)} a ${item.user_id?.slice(0, 8) || '?'}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rembourser',
        style: 'destructive',
        onPress: async () => {
          setRefunded(true);
          await refundPayment(item.id, 'Remboursement admin');
          reload();
        },
      },
    ]);
  };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{fmt(item.amount)}</Text>
        <Text style={styles.rowSub}>{item.method || '—'} | {new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
        <View style={styles.tagsRow}>
          <Tag dark={item.status === 'succeeded'} danger={item.status === 'failed'}>
            {item.status}
          </Tag>
          {refunded ? <Tag danger>Rembourse</Tag> : null}
        </View>
      </View>
      {item.status === 'succeeded' && !refunded ? (
        <Pressable onPress={refund} style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTxt}>Rembourser</Text>
        </Pressable>
      ) : refunded ? (
        <DecisionBadge kind="danger" label="Rembourse" />
      ) : null}
    </View>
  );
}

function MonCashPendingRow({ item, reload }) {
  const [decided, setDecided] = useState(item.status === 'succeeded' ? 'approved' : item.status === 'failed' ? 'rejected' : null);
  const approve = () => {
    Alert.alert(
      'Approuver ce paiement',
      `Verifie sur ton telephone que tu as bien recu ${fmt(item.amount)} avec la reference ${item.moncash_reference} de ${item.moncash_phone || '?'}.\n\nApprouver active immediatement le service du client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            setDecided('approved');
            const r = await approveMonCashPayment(item.id);
            if (!r.ok) { setDecided(null); Alert.alert('Erreur', r.error); }
            reload();
          },
        },
      ],
    );
  };
  const reject = () => {
    Alert.alert(
      'Rejeter ce paiement',
      'Le client sera notifie et pourra refaire la demarche.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            setDecided('rejected');
            const r = await rejectMonCashPayment(item.id, 'Reference introuvable sur MonCash');
            if (!r.ok) { setDecided(null); Alert.alert('Erreur', r.error); }
            reload();
          },
        },
      ],
    );
  };
  return (
    <View style={styles.row}>
      {item.property_image ? (
        <Image source={{ uri: item.property_image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: M.card, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="wallet-outline" size={20} color={M.muted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{fmt(item.amount)} {item.currency || 'HTG'}</Text>
        {item.property_title ? (
          <Text style={styles.rowSub} numberOfLines={1}>Pour : {item.property_title}</Text>
        ) : null}
        <Text style={styles.rowSub}>Payeur : {item.payer_name || 'inconnu'}{item.payer_phone ? ' | ' + item.payer_phone : ''}</Text>
        <Text style={styles.rowSub}>Ref : {item.moncash_reference || '—'} | Tel MonCash : {item.moncash_phone || '—'}</Text>
        <Text style={styles.rowSub}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
        <View style={styles.tagsRow}>
          <Tag>{item.purpose || 'listing'}</Tag>
          {item.property_id ? <Tag dark>Annonce liee</Tag> : null}
        </View>
      </View>
      {decided === 'approved' ? (
        <DecisionBadge kind="ok" label="Approuve" />
      ) : decided === 'rejected' ? (
        <DecisionBadge kind="danger" label="Rejete" />
      ) : (
        <View style={{ gap: 6 }}>
          <Pressable onPress={approve} style={[styles.btn, styles.btnOk]}>
            <Text style={styles.btnTxt}>Approuver</Text>
          </Pressable>
          <Pressable onPress={reject} style={[styles.btn, styles.btnDanger]}>
            <Text style={styles.btnTxt}>Rejeter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function KycRow({ item, reload }) {
  const [decided, setDecided] = useState(item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : null);
  const decide = (action) => {
    const reason = action === 'rejected' ? 'Documents illisibles ou incomplets' : null;
    Alert.alert(
      action === 'approved' ? 'Approuver KYC' : 'Rejeter KYC',
      action === 'rejected'
        ? 'L\'utilisateur pourra re-soumettre ses documents.'
        : 'L\'agence sera verifiee et pourra publier.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'OK', onPress: async () => {
          setDecided(action);
          await decideKyc(item.id, item.user_id, action, reason);
          reload();
        } },
      ],
    );
  };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.doc_type || 'Document'}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{item.user_id?.slice(0, 12)}...</Text>
        {item.file_url ? (
          <Pressable onPress={() => Linking.openURL(item.file_url)}>
            <Text style={styles.link}>Voir le document</Text>
          </Pressable>
        ) : null}
      </View>
      {decided === 'approved' ? (
        <DecisionBadge kind="ok" label="Approuve" />
      ) : decided === 'rejected' ? (
        <DecisionBadge kind="danger" label="Rejete" />
      ) : (
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => decide('approved')} style={[styles.btn, styles.btnOk]}>
            <Text style={styles.btnTxt}>OK</Text>
          </Pressable>
          <Pressable onPress={() => decide('rejected')} style={[styles.btn, styles.btnDanger]}>
            <Text style={styles.btnTxt}>Rejeter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ReportRow({ item, reload }) {
  const [resolved, setResolved] = useState(item.status === 'resolved');
  const resolve = async () => { setResolved(true); await resolveReport(item.id); reload(); };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.reason || 'Signalement'}</Text>
        <Text style={styles.rowSub}>{item.target_type} | {String(item.target_id).slice(0, 8)}</Text>
        {item.message ? <Text style={styles.rowSub} numberOfLines={2}>{item.message}</Text> : null}
      </View>
      {resolved ? (
        <DecisionBadge kind="ok" label="Resolu" />
      ) : (
        <Pressable onPress={resolve} style={[styles.btn, styles.btnOk]}>
          <Text style={styles.btnTxt}>Resoudre</Text>
        </Pressable>
      )}
    </View>
  );
}

function Tag({ children, dark, danger }) {
  return (
    <View style={[
      styles.tag,
      dark && { backgroundColor: M.text, borderColor: M.text },
      danger && { backgroundColor: M.danger, borderColor: M.danger },
    ]}>
      <Text style={[
        styles.tagTxt,
        (dark || danger) && { color: '#fff' },
      ]}>{children}</Text>
    </View>
  );
}

function DecisionBadge({ kind, label }) {
  const isOk = kind === 'ok';
  return (
    <View style={[
      styles.decision,
      isOk ? { backgroundColor: '#DCFCE7', borderColor: M.ok } : { backgroundColor: '#FEE2E2', borderColor: M.danger },
    ]}>
      <Ionicons
        name={isOk ? 'checkmark-circle' : 'close-circle'}
        size={14}
        color={isOk ? M.ok : M.danger}
      />
      <Text style={[styles.decisionTxt, { color: isOk ? M.ok : M.danger }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: M.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: M.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 11, color: M.muted, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: M.surface, borderWidth: 1, borderColor: M.border },
  tabsWrap: { backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  tabsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: M.border, backgroundColor: M.bg,
  },
  tabActive: { backgroundColor: M.text, borderColor: M.text },
  tabTxt: { fontSize: 12.5, fontWeight: '600', color: M.textSoft },
  tabTxtActive: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTxt: { fontSize: 16, fontWeight: '600', color: M.text, marginTop: 12 },
  deniedSub: { fontSize: 13, color: M.muted, marginTop: 4 },
  empty: { color: M.muted, marginTop: 8, fontSize: 13 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.8 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: M.border,
    borderRadius: 14, padding: 16,
  },
  statCardHi: { backgroundColor: M.text, borderColor: M.text },
  statCardSmall: { padding: 14 },
  statCardDanger: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  statVal: { fontSize: 24, fontWeight: '800', color: M.text, letterSpacing: -0.5 },
  statLbl: { fontSize: 11, color: M.muted, marginTop: 4, fontWeight: '600', lineHeight: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: M.surface, borderWidth: 1, borderColor: M.border,
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: M.card },
  rowTitle: { fontSize: 14, fontWeight: '700', color: M.text },
  rowSub: { fontSize: 12, color: M.muted, marginTop: 2 },
  link: { fontSize: 12, color: M.text, textDecorationLine: 'underline', marginTop: 4 },

  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnOk: { backgroundColor: M.text },
  btnDanger: { backgroundColor: M.danger },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: M.border, backgroundColor: M.bg },
  tagTxt: { fontSize: 10, fontWeight: '700', color: M.text },
  decision: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  decisionTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
});
