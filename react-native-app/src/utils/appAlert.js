// Alerte universelle : utilise window.alert / window.confirm sur le web
// (car Alert.alert de react-native-web ne fait rien), et Alert.alert sur natif.
import { Alert, Platform } from 'react-native';

export function appAlert(title, message, buttons) {
  // Pas de boutons -> simple notif.
  if (!buttons || buttons.length === 0) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`${title}\n\n${message || ''}`);
      }
      return;
    }
    Alert.alert(title, message);
    return;
  }

  // Avec boutons : sur web, utilise confirm() pour 1 ou 2 boutons.
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const destructiveBtn = buttons.find((b) => b.style === 'destructive');
    const okBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];

    if (buttons.length === 1) {
      window.alert(`${title}\n\n${message || ''}`);
      try { okBtn?.onPress?.(); } catch {}
      return;
    }

    const ok = window.confirm(`${title}\n\n${message || ''}`);
    try {
      if (ok) (destructiveBtn || okBtn)?.onPress?.();
      else cancelBtn?.onPress?.();
    } catch {}
    return;
  }

  Alert.alert(title, message, buttons);
}

export default appAlert;
