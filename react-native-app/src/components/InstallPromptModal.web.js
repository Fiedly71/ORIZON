// Pop-up d'installation PWA.
// - Android/Chrome/Edge: bouton "Installer" (utilise beforeinstallprompt natif).
// - iOS Safari: explication des etapes manuelles (Partager -> Sur l'ecran d'accueil).
// - Apparait a la 1ere visite, puis toutes les 5 visites tant que l'utilisateur n'a pas installe.
// - Detection "deja installe": display-mode standalone OU navigator.standalone (iOS).
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';

const VISITS_KEY = 'orizon.pwa.visits';
const DISMISSED_KEY = 'orizon.pwa.dismissedAt';
const FREQ = 5; // chaque 5 visites
const COOLDOWN_MS = 1000 * 60 * 60 * 24; // 24h apres "plus tard"

function isStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function detectPlatform() {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function InstallPromptModal() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [platform] = useState(detectPlatform());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return; // deja installe

    // Incremente le compteur de visites a chaque montage de l'app (1 fois par session).
    let visits = 0;
    try {
      visits = parseInt(localStorage.getItem(VISITS_KEY) || '0', 10) + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch {}

    // Cooldown apres "Plus tard"
    let dismissedAt = 0;
    try { dismissedAt = parseInt(localStorage.getItem(DISMISSED_KEY) || '0', 10); } catch {}
    const cooledDown = !dismissedAt || (Date.now() - dismissedAt) > COOLDOWN_MS;

    const shouldShow = cooledDown && (visits === 1 || visits % FREQ === 0);

    // Capture l'evenement Chrome/Edge install
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Si deja installe pendant la session, retire le compteur
    const onInstalled = () => {
      try { localStorage.setItem(VISITS_KEY, '0'); } catch {}
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    if (shouldShow) {
      // Petit delai pour laisser l'app se charger
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onLater = () => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const onInstall = async () => {
    if (!deferred) return;
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === 'accepted') {
        try { localStorage.setItem(VISITS_KEY, '0'); } catch {}
      }
    } catch {}
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onLater}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.iconWrap}>
              <Ionicons name="phone-portrait-outline" size={36} color={C.primary} />
            </View>
            <Text style={s.title}>Installe ORIZON sur ton telephone</Text>
            <Text style={s.subtitle}>
              Acces direct depuis ton ecran d'accueil, plus rapide, fonctionne meme avec une connexion faible.
            </Text>

            {platform === 'android' && (
              <>
                <View style={s.featuresRow}>
                  <Feature icon="flash-outline" txt="Plus rapide" />
                  <Feature icon="notifications-outline" txt="Notifs push" />
                  <Feature icon="wifi-outline" txt="Hors-ligne" />
                </View>
                <Text style={s.helpAndroid}>
                  C'est une application web installable: pas besoin de passer par le Play Store, aucun espace de stockage utilise pour le telechargement. Tu retrouves ORIZON comme une vraie app sur ton ecran d'accueil.
                </Text>
                {deferred ? (
                  <Pressable style={s.primaryBtn} onPress={onInstall}>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={s.primaryTxt}>Installer ORIZON</Text>
                  </Pressable>
                ) : (
                  <View style={s.steps}>
                    <Text style={s.stepsTitle}>Ouvre le menu du navigateur</Text>
                    <Step n="1" txt={'Touche les 3 points en haut a droite (\u22EE).'} />
                    <Step n="2" txt={'Choisis "Installer l\'application" ou "Ajouter a l\'ecran d\'accueil".'} />
                    <Step n="3" txt="Confirme. ORIZON apparait sur ton ecran d'accueil." />
                  </View>
                )}
              </>
            )}

            {platform === 'ios' && (
              <>
                <View style={s.featuresRow}>
                  <Feature icon="flash-outline" txt="Plus rapide" />
                  <Feature icon="home-outline" txt="Ecran accueil" />
                  <Feature icon="wifi-outline" txt="Hors-ligne" />
                </View>
                <Text style={s.helpIos}>
                  Sur iPhone, l'installation se fait depuis Safari en 3 etapes. Pas besoin d'App Store, c'est gratuit et instantane.
                </Text>
                <View style={s.steps}>
                  <Text style={s.stepsTitle}>Etapes pour iPhone (Safari)</Text>
                  <Step
                    n="1"
                    txt="Touche l'icone Partager en bas de Safari (carre avec une fleche vers le haut)."
                    icon="share-outline"
                  />
                  <Step
                    n="2"
                    txt={'Fais defiler et choisis "Sur l\'ecran d\'accueil".'}
                    icon="add-circle-outline"
                  />
                  <Step
                    n="3"
                    txt={'Touche "Ajouter" en haut a droite. ORIZON apparait sur ton ecran d\'accueil.'}
                    icon="checkmark-circle-outline"
                  />
                </View>
                <Text style={s.iosWarn}>
                  Important: ca ne marche que dans Safari. Si tu es dans Chrome ou Facebook, ouvre d'abord ce site dans Safari.
                </Text>
              </>
            )}

            {platform === 'desktop' && (
              <>
                <Text style={s.helpIos}>
                  Tu utilises un ordinateur. Tu peux installer ORIZON comme une app: cherche l'icone "Installer" dans la barre d'adresse de Chrome/Edge, ou ouvre ce site sur ton telephone pour une meilleure experience.
                </Text>
                {deferred && (
                  <Pressable style={s.primaryBtn} onPress={onInstall}>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={s.primaryTxt}>Installer ORIZON</Text>
                  </Pressable>
                )}
              </>
            )}

            <Pressable style={s.laterBtn} onPress={onLater}>
              <Text style={s.laterTxt}>Plus tard</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Feature({ icon, txt }) {
  return (
    <View style={s.feat}>
      <Ionicons name={icon} size={20} color={C.primary} />
      <Text style={s.featTxt}>{txt}</Text>
    </View>
  );
}

function Step({ n, txt, icon }) {
  return (
    <View style={s.step}>
      <View style={s.stepNum}><Text style={s.stepNumTxt}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.stepTxt}>{txt}</Text>
      </View>
      {icon ? <Ionicons name={icon} size={18} color={C.primary} style={{ marginLeft: 8 }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 460, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  iconWrap: { alignSelf: 'center', width: 64, height: 64, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  featuresRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  feat: { alignItems: 'center', gap: 4 },
  featTxt: { fontSize: 12, color: C.text, fontWeight: '600' },
  helpAndroid: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 14 },
  helpIos: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 12 },
  iosWarn: { fontSize: 12, color: '#B45309', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, marginTop: 4, lineHeight: 17 },
  steps: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  stepTxt: { fontSize: 13, color: C.text, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  laterBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 6 },
  laterTxt: { color: C.muted, fontSize: 13, fontWeight: '600' },
});
