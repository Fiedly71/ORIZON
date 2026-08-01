// Hook d'initialisation des notifications push.
// - Enregistre le ExpoPushToken côté Supabase à chaque login.
// - Écoute les notifications foreground (toast) et les taps (navigation).
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { registerForPushAsync, notifyLocal } from '../services/notificationsService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: Platform.OS !== 'web', // Web : pas de toast natif possible
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export function usePushSetup(navigationRef) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const registeredFor = useRef(null);

  // Ré-enregistre le token à chaque changement d'utilisateur (ex: après login).
  useEffect(() => {
    if (!isAuth || !userId) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userId) return;
    registeredFor.current = userId;
    registerForPushAsync().catch(() => {});
  }, [isAuth, userId]);

  // Listeners notification.
  useEffect(() => {
    // Notification reçue en foreground : affiche un toast local (Android/iOS).
    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification?.request?.content || {};
      if (Platform.OS === 'web' && title) {
        // Sur Web: pas de toast natif — la notification arrive via le SW.
        return;
      }
      if (title) {
        notifyLocal({ title, body: body || '', data: data || {} }).catch(() => {});
      }
    });

    // Tap sur une notification : navigue vers l'écran cible.
    const sub2 = Notifications.addNotificationResponseReceivedListener((resp) => {
      const notifData = resp?.notification?.request?.content?.data || {};
      const screen = notifData.screen;
      const params = notifData.params || {};
      if (screen && navigationRef?.current?.isReady?.()) {
        try { navigationRef.current.navigate(screen, params); } catch {}
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [navigationRef]);
}
