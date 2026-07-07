// Patch global Alert.alert : route vers le modal branded ORIZON (AlertHost)
// au lieu de window.alert (moche : "kayorizon.com dit ...") sur web
// et au lieu du dialog systeme natif iOS/Android (pour un design coherent).
import { Alert } from 'react-native';
import { showAlert } from '../services/alert';

Alert.alert = function orizonAlert(title, message, buttons) {
  // Detecte le tone selon le contenu du titre pour choisir l'icone/couleur
  const t = (title || '').toLowerCase();
  let tone = 'info';
  if (t.includes('erreur') || t.includes('échec') || t.includes('impossible')) tone = 'error';
  else if (t.includes('succès') || t.includes('confirm') || t.includes('envoyé') || t.includes('valid')) tone = 'success';
  else if (t.includes('attention') || t.includes('avertiss')) tone = 'warning';

  showAlert({
    title,
    message,
    buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK', style: 'default' }],
    tone,
  });
};

export {};
