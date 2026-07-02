// Alert branded ORIZON : remplace window.alert/confirm (moche "kayorizon.com dit")
// par un modal cohérent avec le design de l'app.
// Utilisation :
//   import { showAlert } from '../services/alert';
//   showAlert({ title, message, buttons: [{text, onPress, style}] });
// OU laisser Alert.alert() : patchAlertWeb.js le route automatiquement vers ici.

let listeners = new Set();
let nextId = 1;
const queue = [];
let current = null;

function emit() {
  const snapshot = current;
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch (_) {}
  });
}

function pump() {
  if (current) return;
  current = queue.shift() || null;
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(current);
  return () => { listeners.delete(fn); };
}

export function dismissCurrent(result) {
  if (!current) return;
  const c = current;
  current = null;
  try { c.resolver?.(result); } catch (_) {}
  emit();
  setTimeout(pump, 60); // laisse le modal s'animer
}

/**
 * Affiche une alerte branded ORIZON.
 * @param {{ title?: string, message?: string, buttons?: Array<{text, onPress?, style?: 'default'|'cancel'|'destructive'}>, icon?: string, tone?: 'info'|'success'|'warning'|'error' }} opts
 * @returns Promise<string|undefined> - la clé du bouton pressé
 */
export function showAlert(opts = {}) {
  const id = 'al-' + (nextId++);
  const buttons = Array.isArray(opts.buttons) && opts.buttons.length
    ? opts.buttons
    : [{ text: 'OK', style: 'default' }];
  return new Promise((resolve) => {
    queue.push({
      id,
      title: opts.title || '',
      message: opts.message || '',
      buttons,
      icon: opts.icon || null,
      tone: opts.tone || 'info',
      resolver: resolve,
    });
    pump();
  });
}
