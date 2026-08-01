// Guard "connexion requise" pour le mode invité (browse-as-guest).
// Utilise navigationRef global — marche même après fermeture d'un modal.
import { useAuthStore } from '../store/useAuthStore';
import { goToAuth } from '../navigation/navigationRef';
import { showAlert } from '../services/alert';

export function isAuthenticated() {
  return !!useAuthStore.getState().isAuthenticated;
}

// Guard action-par-action (ex: voir une annonce).
// Modal simple avec 2 boutons "Se connecter" / "Créer un compte".
export function requireAuth(_navigation, action = 'continuer') {
  if (isAuthenticated()) return true;
  showAlert({
    title: 'Connexion requise',
    message: `Connecte-toi pour ${action}.`,
    buttons: [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Se connecter', onPress: () => goToAuth('Login') },
      { text: 'Créer un compte', onPress: () => goToAuth('Register') },
    ],
  });
  return false;
}

// Redirection silencieuse directe vers Login (tabs Favoris, Messages, Profil).
export function redirectToAuth(_navigation, screen = 'Login') {
  if (isAuthenticated()) return true;
  goToAuth(screen);
  return false;
}
