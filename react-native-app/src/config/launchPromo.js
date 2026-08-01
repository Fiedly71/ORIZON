// Launch promo : publication gratuite pendant la fenetre de lancement.
// Étendue jusqu'au 31 août 2026 inclus (le temps de brancher MonCash prod + Stripe).
// Pendant cette période : les plans sont affichés à titre informatif, mais aucun
// paiement n'est prélevé — toutes les publications sont GRATUITES et le trigger
// DB force payment_status='paid' + moderation_status='approved' pour les
// utilisateurs marqués publish_free.
export const LAUNCH_FREE_START = '2026-06-15';
export const LAUNCH_FREE_END = '2026-09-01'; // exclusif => couvre jusqu'au 31 août 2026 inclus

export function isLaunchFreeActive(now = new Date()) {
  try {
    const today = now.toISOString().slice(0, 10);
    return today >= LAUNCH_FREE_START && today < LAUNCH_FREE_END;
  } catch {
    return false;
  }
}

// Date de fin formatee pour affichage (31 août 2026).
export const LAUNCH_FREE_END_LABEL = '31 août 2026';

