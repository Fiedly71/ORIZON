// Ref de navigation globale exportée pour être utilisée en dehors des composants React
// (utils, services). Évite les bugs de navigation.getParent() qui échouent après
// fermeture d'un modal.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// Navigate depuis n'importe où — silencieux si nav pas prête.
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    try { navigationRef.navigate(name, params); } catch {}
  }
}

// Reset la stack racine (utile après logout).
export function resetToRoot(routeName = 'App', params) {
  if (navigationRef.isReady()) {
    try {
      navigationRef.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    } catch {}
  }
}

// Ouvre l'Auth stack (Login/Register/ForgotPassword).
export function goToAuth(screen = 'Login') {
  navigate('Auth', { screen });
}
