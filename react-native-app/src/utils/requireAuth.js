// Guard "connexion requise" pour le mode invité (browse-as-guest).
// Un visiteur non-connecté peut scroller ExploreScreen, mais dès qu'il tente
// une action réelle (voir un bien, rechercher, ouvrir favoris/messages/publier,
// consulter un profil, etc.), on ouvre une modal l'invitant à s'inscrire/connecter.
import { useAuthStore } from '../store/useAuthStore';
import { appAlert } from './appAlert';

// Renvoie true si l'utilisateur est connecté (session Supabase active OU mode mock).
export function isAuthenticated() {
  return !!useAuthStore.getState().isAuthenticated;
}

// Guard action-par-action. Renvoie true si autorisé, sinon montre une alerte
// avec CTA "Se connecter" / "Créer un compte" qui redirigent vers l'écran Auth.
//
// Usage :
//   if (!requireAuth(navigation, 'voir cette annonce')) return;
//
// `navigation` peut être n'importe quel objet de navigation (Tab, Stack, root).
// On utilise navigation.getParent() pour remonter au Root si nécessaire.
export function requireAuth(navigation, action = 'continuer') {
  if (isAuthenticated()) return true;

  const goAuth = (screen) => {
    try {
      // Remonte au Root pour atteindre l'Auth stack quel que soit le point de départ.
      let nav = navigation;
      while (nav?.getParent && nav.getParent()) nav = nav.getParent();
      if (nav?.navigate) {
        nav.navigate('Auth', { screen });
      }
    } catch {}
  };

  appAlert(
    'Connexion requise',
    `Crée un compte gratuit ou connecte-toi pour ${action}. C'est rapide (2 minutes) et 100 % gratuit pour les acheteurs et locataires.`,
    [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Se connecter', onPress: () => goAuth('Login') },
      { text: 'Créer un compte', onPress: () => goAuth('Register') },
    ],
  );
  return false;
}

// Variante silencieuse qui ouvre directement l'écran de login sans alerte.
// Utile pour les taps sur des onglets protégés (Favoris/Messages/Profil).
export function redirectToAuth(navigation, screen = 'Register') {
  if (isAuthenticated()) return true;
  try {
    let nav = navigation;
    while (nav?.getParent && nav.getParent()) nav = nav.getParent();
    nav?.navigate?.('Auth', { screen });
  } catch {}
  return false;
}
