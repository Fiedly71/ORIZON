// AgencyManageScreen - Creer / gerer une agence + inviter des agents.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';
import {
  getMyAgencies, createAgency, listAgents, inviteAgent, removeAgent,
} from '../services/agencyService';
import { useToast } from '../components/Toast';

export default function AgencyManageScreen({ navigation }) {
  const toast = useToast();
  const [agencies, setAgencies] = useState([]);
  const [active, setActive] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', phone: '', email: '', address: '' });
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getMyAgencies();
    if (r.ok) {
      setAgencies(r.data);
      if (r.data[0] && !active) setActive(r.data[0]);
    }
    setLoading(false);
  }, [active]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (active) listAgents(active.id).then((r) => r.ok && setAgents(r.data));
  }, [active]);

  const onCreate = async () => {
    if (!form.name) { Alert.alert('ORIZON', 'Nom de l\'agence requis.'); return; }
    const r = await createAgency(form);
    if (r.ok) {
      toast.show('Agence créée', { type: 'success' });
      setCreateOpen(false); setForm({ name: '', description: '', phone: '', email: '', address: '' });
      load();
    } else Alert.alert('Erreur', r.error);
  };

  const onInvite = async () => {
    if (!inviteEmail || !active) return;
    const r = await inviteAgent(active.id, inviteEmail);
    if (r.ok) {
      toast.show('Invitation envoyée', { type: 'success' });
      setInviteOpen(false); setInviteEmail('');
      listAgents(active.id).then((x) => x.ok && setAgents(x.data));
    } else Alert.alert('Erreur', r.error);
  };

  const onRemove = (m) => {
    Alert.alert('Retirer', `Retirer cet agent ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        const r = await removeAgent(active.id, m.user_id);
        if (r.ok) listAgents(active.id).then((x) => x.ok && setAgents(x.data));
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Mon agence</Text>
        <Pressable onPress={() => setCreateOpen(true)} hitSlop={10}>
          <Ionicons name="add" size={24} color={C.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : agencies.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="business-outline" size={48} color={C.muted} />
          <Text style={{ marginTop: spacing.md, color: C.muted, textAlign: 'center' }}>
            Tu n'as pas encore d'agence. Cree-en une pour publier au nom d'une marque
            et inviter des agents.
          </Text>
          <Pressable style={styles.cta} onPress={() => setCreateOpen(true)}>
            <Text style={styles.ctaTxt}>Créer mon agence</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {/* Selecteur d'agence */}
          {agencies.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {agencies.map((a) => (
                <Pressable key={a.id} onPress={() => setActive(a)} style={[styles.tab, active?.id === a.id && styles.tabActive]}>
                  <Text style={[styles.tabTxt, active?.id === a.id && { color: '#fff' }]}>{a.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {active && (
            <>
              <View style={styles.card}>
                <Text style={styles.agName}>{active.name}</Text>
                {active.description && <Text style={styles.agDesc}>{active.description}</Text>}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' }}>
                  {active.phone && <Chip icon="call" txt={active.phone} />}
                  {active.email && <Chip icon="mail" txt={active.email} />}
                  {active.address && <Chip icon="location" txt={active.address} />}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Équipe ({agents.length})</Text>
                <Pressable onPress={() => setInviteOpen(true)}>
                  <Ionicons name="person-add" size={22} color={C.primary} />
                </Pressable>
              </View>

              {agents.map((m) => (
                <View key={m.user_id} style={styles.agentCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agentName}>{m.profiles?.full_name || m.invited_email || 'Agent'}</Text>
                    <Text style={styles.agentRole}>{m.role} · {m.status}</Text>
                  </View>
                  {m.role !== 'owner' && (
                    <Pressable onPress={() => onRemove(m)} hitSlop={6}>
                      <Ionicons name="trash-outline" size={20} color={C.danger} />
                    </Pressable>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal creer agence */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Créer une agence</Text>
            {['name','description','phone','email','address'].map((f) => (
              <TextInput key={f} value={form[f]} onChangeText={(v) => setForm({ ...form, [f]: v })}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)} placeholderTextColor={C.muted}
                style={styles.input} />
            ))}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: C.surface }]} onPress={() => setCreateOpen(false)}>
                <Text style={{ color: C.text, fontWeight: '600' }}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: C.primary }]} onPress={onCreate}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Créer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal invite */}
      <Modal visible={inviteOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inviter un agent</Text>
            <TextInput value={inviteEmail} onChangeText={setInviteEmail}
              placeholder="email@example.com" placeholderTextColor={C.muted}
              style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.help}>L'agent doit deja avoir un compte ORIZON.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: C.surface }]} onPress={() => setInviteOpen(false)}>
                <Text style={{ color: C.text, fontWeight: '600' }}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: C.primary }]} onPress={onInvite}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Inviter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ icon, txt }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={11} color={C.text} />
      <Text style={styles.chipTxt}>{txt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  cta: { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.md, marginTop: spacing.lg },
  ctaTxt: { color: '#fff', fontWeight: '700' },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: C.surface, marginRight: spacing.md },
  tabActive: { backgroundColor: C.primary },
  tabTxt: { color: C.text, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: C.border },
  agName: { fontSize: 18, fontWeight: '800', color: C.text },
  agDesc: { fontSize: 13, color: C.muted, marginTop: 4 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  agentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  agentName: { fontSize: 14, fontWeight: '700', color: C.text },
  agentRole: { fontSize: 12, color: C.muted, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: C.surface },
  chipTxt: { fontSize: 11.5, color: C.text, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xxl },
  modalCard: { backgroundColor: '#fff', borderRadius: radii.lg, padding: spacing.xxl },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, color: C.text },
  modalBtn: { flex: 1, paddingVertical: spacing.lg, borderRadius: radii.md, alignItems: 'center' },
  help: { fontSize: 11.5, color: C.muted, marginTop: 6 },
});
