// Slice 'alertes': criteres sauvegardes par l'utilisateur pour recevoir
// des notifications quand un bien correspond.
import { create } from 'zustand';
import { notifyLocal, matchesCriteria } from '../services/notificationsService';

export const useAlerts = create((set, get) => ({
  alerts: [], // [{ id, label, criteria }]

  addAlert: (label, criteria) =>
    set((s) => ({ alerts: [{ id: 'alert-' + Date.now(), label, criteria }, ...s.alerts] })),

  removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  // A appeler quand de nouvelles annonces arrivent.
  checkProperty: async (property) => {
    const matches = get().alerts.filter((a) => matchesCriteria(property, a.criteria));
    for (const m of matches) {
      await notifyLocal({
        title: 'ORIZON - Nouvelle annonce',
        body: `${property.title} (${property.location}) correspond a "${m.label}"`,
        data: { propertyId: property.id, alertId: m.id },
      });
    }
    return matches.length;
  },
}));
