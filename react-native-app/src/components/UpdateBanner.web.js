// Banniere "Nouvelle version disponible" - apparait quand le service worker
// detecte un nouveau bundle deploye sur Vercel. Un clic recharge proprement.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';

export default function UpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    let reg = null;
    let timer = null;

    const watch = (registration) => {
      reg = registration;
      // Detecte un SW en attente immediatement.
      if (registration.waiting) setAvailable(true);
      registration.addEventListener?.('updatefound', () => {
        const sw = registration.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((r) => { if (r) watch(r); });

    // Force la verification d'une update au focus + toutes les 60s.
    const checkUpdate = async () => {
      try {
        const r = await navigator.serviceWorker.getRegistration();
        if (r) await r.update();
      } catch {}
    };
    window.addEventListener('focus', checkUpdate);
    timer = setInterval(checkUpdate, 60000);

    // Quand un nouveau SW prend le controle, on recharge.
    navigator.serviceWorker.addEventListener?.('controllerchange', () => {
      try { window.location.reload(); } catch {}
    });

    return () => {
      window.removeEventListener('focus', checkUpdate);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (Platform.OS !== 'web' || !available) return null;

  const apply = async () => {
    try {
      const r = await navigator.serviceWorker.getRegistration();
      if (r && r.waiting) {
        r.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <Ionicons name="sync-circle" size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nouvelle version disponible</Text>
          <Text style={styles.sub}>Recharge pour profiter des dernieres mises a jour.</Text>
        </View>
        <Pressable style={styles.cta} onPress={apply}>
          <Text style={styles.ctaTxt}>Recharger</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, padding: 12, alignItems: 'center', zIndex: 9999 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 560,
    backgroundColor: C.primary, padding: 12, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  title: { color: '#fff', fontWeight: '800', fontSize: 13 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  cta: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  ctaTxt: { color: C.primary, fontWeight: '800', fontSize: 12 },
});
