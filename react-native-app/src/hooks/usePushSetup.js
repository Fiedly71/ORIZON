// Hook d'initialisation des notifications push.
// - Enregistre le ExpoPushToken cote Supabase quand l'utilisateur est authentifie.
// - Ecoute les notifications recues (foreground) et les taps utilisateur,
//   et navigue vers l'ecran cible si un payload `data.screen` est fourni.
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { registerForPushAsync } from '../services/notificationsService';

export function usePushSetup(navigationRef) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const registeredFor = useRef(null);

  // Enregistrement du token apres login.
  useEffect(() => {
    if (!isAuth || !userId) return;
    if (registeredFor.current === userId) return;
    registeredFor.current = userId;
    registerForPushAsync().catch(() => {});
  }, [isAuth, userId]);

  // Listeners notification.
  useEffect(() => {
    const sub1 = Notifications.addNotificationReceivedListener(() => {
      // hook silencieux: on pourrait push un toast ici.
    });
    const sub2 = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp?.notification?.request?.content?.data || {};
      const screen = data.screen;
      const params = data.params || {};
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
