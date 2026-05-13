// AdminScreen - Vrai tableau de bord administrateur ORIZON.
// Stats en haut + 6 sections : utilisateurs, annonces, photos, revenus, KYC agences, signalements.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert,
  ActivityIndicator, ScrollView, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  isAdmin,
  getDashboardStats,
  listUsers, setUserBanned,
  listProperties, moderateProperty,
  listPhotosForReview,
  listPayments, refundPayment,
  listPendingKyc, decideKyc,
  listReports, resolveReport,
} from '../services/adminService';

// Palette monochrome (alignee avec ProfileScreen)
const M = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  card: '#F5F5F5',
  border: '#E5E5E5',
  text: '#0A0A0A',
  muted: '#737373',
  danger: '#DC2626',
  ok: '#16A34A',
};

const TABS = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: 'grid-outline' },
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'pending', label: 'En attente', icon: 'time-outline' },
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={M.text} />
        </Pressable>
        <Text style={styles.title}>Tableau de bord</Text>
        <Pressable onPress={() => loadTab(tab, true)} hitSlop={10}>
          <Ionicons name="refresh" size={20} color={M.text} />
        </Pressable>
      </View>

      {/* Onglets scrollables */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons name={t.icon} size={14} color={active ? '#fff' : M.text} />
              <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={M.text} />}
    >
      <Section title="Utilisateurs">
        <View style={styles.gridRow}>
          <StatCard label="Total" value={stats.users.total} />
          <StatCard label="Aujourd'hui" value={`+${stats.users.newToday}`} highlight />
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

      <Section title="Annonces">
        <View style={styles.gridRow}>
          <StatCard label="Live" value={stats.properties.active} highlight />
          <StatCard label="En attente" value={stats.properties.pending} />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Rejetees" value={stats.properties.rejected} small />
          <StatCard label="Vendues" value={stats.properties.sold} small />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Total" value={stats.properties.total} small />
          <StatCard label="Aujourd'hui" value={`+${stats.properties.newToday}`} small />
        </View>
      </Section>

      <Section title="Revenus">
        <View style={styles.gridRow}>
          <StatCard label="Total" value={fmt(stats.revenue.total)} highlight />
          <StatCard label="Ce mois" value={fmt(stats.revenue.thisMonth)} />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Aujourd'hui" value={fmt(stats.revenue.today)} small />
          <StatCard label="Rembourses" value={fmt(stats.revenue.refunded)} small danger />
        </View>
      </Section>

      <Section title="KYC Agences">
        <View style={styles.gridRow}>
          <StatCard label="En attente" value={stats.kyc.pending} highlight />
          <StatCard label="Approuves" value={stats.kyc.approved} />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Rejetes" value={stats.kyc.rejected} small danger />
          <View style={{ flex: 1 }} />
        </View>
      </Section>

      <Section title="Signalements">
        <View style={styles.gridRow}>
          <StatCard label="Ouverts" value={stats.reports.open} danger />
          <StatCard label="Resolus" value={stats.reports.resolved} small />
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value, highlight, danger, small }) {
  return (
    <View style={[
      styles.statCard,
      highlight && styles.statCardHi,
      small && styles.statCardSmall,
    ]}>
      <Text style={[
        styles.statVal,
        highlight && { color: '#fff' },
        danger && { color: M.danger },
      ]}>{value}</Text>
      <Text style={[
        styles.statLbl,
        highlight && { color: '#E5E5E5' },
      ]}>{label}</Text>
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
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.full_name || '(sans nom)'}</Text>
        <Text style={styles.rowSub}>{item.email}</Text>
        <View style={styles.tagsRow}>
          <Tag>{item.role || 'Utilisateur'}</Tag>
          {item.verified ? <Tag dark>Verifie</Tag> : null}
          {item.banned ? <Tag danger>Banni</Tag> : null}
        </View>
      </View>
      <Pressable onPress={onBan} style={[styles.btn, item.banned ? styles.btnOk : styles.btnDanger]}>
        <Text style={styles.btnTxt}>{item.banned ? 'Debannir' : 'Bannir'}</Text>
      </Pressable>
    </View>
  );
}

function PendingRow({ item, reload }) {
  const decide = (action) => {
    Alert.alert(action === 'approved' ? 'Approuver' : 'Rejeter', item.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => { await moderateProperty(item.id, action); reload(); },
      },
    ]);
  };
  return (
    <View style={styles.row}>
      {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowSub}>{fmt(item.price)} | {item.city || '—'}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Pressable onPress={() => decide('approved')} style={[styles.btn, styles.btnOk]}>
          <Text style={styles.btnTxt}>OK</Text>
        </Pressable>
        <Pressable onPress={() => decide('rejected')} style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTxt}>Rejeter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PhotoRow({ item, reload }) {
  // Annonces deja live — admin peut SEULEMENT rejeter (cache l'annonce)
  const reject = () => {
    Alert.alert('Rejeter cette annonce', `Les photos de "${item.title}" sont inappropriees ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
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
      <Pressable onPress={reject} style={[styles.btn, styles.btnDanger]}>
        <Text style={styles.btnTxt}>Rejeter</Text>
      </Pressable>
    </View>
  );
}

function PaymentRow({ item, reload }) {
  const refund = () => {
    Alert.alert('Rembourser', `${fmt(item.amount)} a ${item.user_id?.slice(0, 8) || '?'}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rembourser',
        style: 'destructive',
        onPress: async () => { await refundPayment(item.id, 'Remboursement admin'); reload(); },
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
          {item.refunded ? <Tag danger>Rembourse</Tag> : null}
        </View>
      </View>
      {item.status === 'succeeded' && !item.refunded ? (
        <Pressable onPress={refund} style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTxt}>Rembourser</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function KycRow({ item, reload }) {
  const decide = (action) => {
    const reason = action === 'rejected' ? 'Documents illisibles ou incomplets' : null;
    Alert.alert(
      action === 'approved' ? 'Approuver KYC' : 'Rejeter KYC',
      action === 'rejected'
        ? 'L\'utilisateur pourra re-soumettre ses documents.'
        : 'L\'agence sera verifiee et pourra publier.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'OK', onPress: async () => { await decideKyc(item.id, item.user_id, action, reason); reload(); } },
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
      <View style={{ gap: 6 }}>
        <Pressable onPress={() => decide('approved')} style={[styles.btn, styles.btnOk]}>
          <Text style={styles.btnTxt}>OK</Text>
        </Pressable>
        <Pressable onPress={() => decide('rejected')} style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTxt}>Rejeter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReportRow({ item, reload }) {
  const resolve = async () => { await resolveReport(item.id); reload(); };
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.reason || 'Signalement'}</Text>
        <Text style={styles.rowSub}>{item.target_type} | {String(item.target_id).slice(0, 8)}</Text>
        {item.message ? <Text style={styles.rowSub} numberOfLines={2}>{item.message}</Text> : null}
      </View>
      {item.status !== 'resolved' ? (
        <Pressable onPress={resolve} style={[styles.btn, styles.btnOk]}>
          <Text style={styles.btnTxt}>Resoudre</Text>
        </Pressable>
      ) : <Tag dark>Resolu</Tag>}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: M.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: M.text },
  tabs: { maxHeight: 44, backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: M.border, backgroundColor: M.bg,
  },
  tabActive: { backgroundColor: M.text, borderColor: M.text },
  tabTxt: { fontSize: 12, fontWeight: '600', color: M.text },
  tabTxtActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTxt: { fontSize: 16, fontWeight: '600', color: M.text, marginTop: 12 },
  deniedSub: { fontSize: 13, color: M.muted, marginTop: 4 },
  empty: { color: M.muted, marginTop: 8, fontSize: 13 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: M.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: M.surface, borderWidth: 1, borderColor: M.border,
    borderRadius: 12, padding: 14,
  },
  statCardHi: { backgroundColor: M.text, borderColor: M.text },
  statCardSmall: { padding: 12 },
  statVal: { fontSize: 22, fontWeight: '800', color: M.text },
  statLbl: { fontSize: 11, color: M.muted, marginTop: 2, fontWeight: '600' },

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
});
