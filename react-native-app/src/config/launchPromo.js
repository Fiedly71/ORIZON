// Launch promo : publication gratuite pendant la fenetre de lancement.
// Du 15 juin 2026 (00:00) au 1er juillet 2026 (00:00 exclusif).
// Pendant cette periode : aucun ecran MonCash/Checkout, le bouton "Poster"
// publie directement (paid + approved cote DB via trigger).
export const LAUNCH_FREE_START = '2026-06-15';
export const LAUNCH_FREE_END = '2026-07-01'; // exclusif

export function isLaunchFreeActive(now = new Date()) {
  try {
    const today = now.toISOString().slice(0, 10);
    return today >= LAUNCH_FREE_START && today < LAUNCH_FREE_END;
  } catch {
    return false;
  }
}

// Date de fin formatee pour affichage (30 juin 2026).
export const LAUNCH_FREE_END_LABEL = '30 juin 2026';
