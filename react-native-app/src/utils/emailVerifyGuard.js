// Gardes d'action pour les utilisateurs dont l'email n'est pas vérifié.
// Renvoie true si l'action est autorisée. Sinon affiche une alerte et
// renvoie false.
import { useAuthStore } from '../store/useAuthStore';
import { resendEmailVerification } from '../services/authService';
import { appAlert } from './appAlert';

export function isEmailVerified(user) {
  const u = user || useAuthStore.getState().user;
  if (!u) return false;
  return !!(u.emailConfirmedAt || u.emailVerified);
}

// Guard générique. Renvoie true si OK. Sinon prompt de renvoi + false.
// action : label court (ex. 'publier une annonce') utilisé dans le message.
export function requireEmailVerified(action = 'continuer') {
  const user = useAuthStore.getState().user;
  if (!user) {
    appAlert('Connexion requise', `Connecte-toi pour ${action}.`);
    return false;
  }
  if (isEmailVerified(user)) return true;

  appAlert(
    'Email non vérifié',
    `Tu dois vérifier ton email pour ${action}. Un lien de vérification t'a été envoyé lors de l'inscription.`,
    [
      { text: 'Plus tard', style: 'cancel' },
      {
        text: 'Renvoyer le mail',
        onPress: async () => {
          const r = await resendEmailVerification();
          appAlert(
            'Email de vérification',
            r.ok ? 'Email renvoyé. Vérifie ta boîte de réception (et les spams).' : (r.error || 'Échec de l\'envoi.'),
          );
        },
      },
    ],
  );
  return false;
}
