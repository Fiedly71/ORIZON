// Route toutes les alertes vers Alert.alert — déjà patché par patchAlertWeb.js
// pour afficher le modal branded ORIZON au lieu des dialogs navigateur ("kayorizon.com dit...").
import { Alert } from 'react-native';

export function appAlert(title, message, buttons) {
  Alert.alert(
    title || '',
    message || '',
    Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }],
  );
}

export default appAlert;
