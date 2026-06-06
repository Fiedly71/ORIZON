// ConfirmEmailScreen
// Cible du lien dans l'email "verification".
// Supabase ouvre l'app via deep link 'orizon://confirm-email' ou web /confirm-email
// avec un token dans l'URL. Le client Supabase echange ce token contre une session
// automatiquement (option detectSessionInUrl). Ici on attend que la session soit
// hydratee, puis on redirige vers Explore avec un message "Email confirme".
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { restoreSession } from '../services/authService';

export default function ConfirmEmailScreen({ navigation }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Laisse Supabase finir l'echange token -> session
      await new Promise((r) => setTimeout(r, 600));
      await restoreSession();
      if (cancelled) return;

      const showOk = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            window.history.replaceState({}, '', '/explore?email_confirmed=1');
          } catch (_) {}
        }
        Alert.alert('Email confirme', 'Bienvenue sur ORIZON. Tu peux explorer les annonces.');
      };

      if (useAuthStore.getState().isAuthenticated) {
        navigation.reset({ index: 0, routes: [{ name: 'App' }] });
        setTimeout(showOk, 200);
      } else {
        // pas de session -> renvoyer sur Login avec un message
        Alert.alert(
          'Email confirme',
          'Ton email est confirme. Connecte-toi pour acceder a ton compte.',
        );
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }
    })();
    return () => { cancelled = true; };
    // isAuthenticated ajoute pour re-essayer si la session est hydratee tardivement
  }, [isAuthenticated, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.box}>
        <Ionicons name="mail-open-outline" size={48} color={C.primary} />
        <Text style={styles.title}>Confirmation en cours...</Text>
        <Text style={styles.txt}>Nous validons ton email. Un instant.</Text>
        <ActivityIndicator color={C.primary} style={{ marginTop: 18 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 16 },
  txt: { fontSize: 14, color: C.muted, marginTop: 8, textAlign: 'center' },
});
