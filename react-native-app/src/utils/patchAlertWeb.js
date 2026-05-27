// Patch global Alert.alert sur le web.
// react-native-web n'implemente pas Alert.alert (silent no-op) -> remplace par window.alert/confirm
// pour que tous les ecrans existants utilisant Alert.alert affichent quelque chose.
import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const buildText = (title, message) => {
    if (title && message) return `${title}\n\n${message}`;
    return title || message || '';
  };

  Alert.alert = function patchedAlert(title, message, buttons) {
    const text = buildText(title, message);

    if (!buttons || buttons.length === 0) {
      try { window.alert(text); } catch {}
      return;
    }

    if (buttons.length === 1) {
      try { window.alert(text); } catch {}
      try { buttons[0]?.onPress?.(); } catch {}
      return;
    }

    // 2+ boutons -> confirm()
    const cancelBtn = buttons.find((b) => b && b.style === 'cancel');
    const destructiveBtn = buttons.find((b) => b && b.style === 'destructive');
    const okBtn =
      destructiveBtn ||
      buttons.find((b) => b && b.style !== 'cancel') ||
      buttons[buttons.length - 1];

    let confirmed = false;
    try { confirmed = window.confirm(text); } catch {}

    try {
      if (confirmed) okBtn?.onPress?.();
      else (cancelBtn || buttons[0])?.onPress?.();
    } catch {}
  };
}

export {};
