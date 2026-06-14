// Hook responsive ORIZON.
// Breakpoints : mobile <640, tablet 640-1024, desktop >=1024, wide >=1440.
// Utilise pour adapter grilles, max-width, padding, navigation.
import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
  wide: 1440,
};

// maxWidth du contenu central sur grand ecran (ailleurs : zone padding latere).
export const CONTENT_MAX_WIDTH = 1280;
// maxWidth d'un formulaire / detail (Profile, Login, Wizard, etc.).
export const FORM_MAX_WIDTH = 720;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isWide = width >= BREAKPOINTS.wide;
  const isMobile = width < BREAKPOINTS.tablet;

  // Nombre de colonnes pour la grille de proprietes.
  let columns = 1;
  if (isWide) columns = 4;
  else if (isDesktop) columns = 3;
  else if (isTablet) columns = 2;

  // Padding lateral selon la taille.
  const sidePadding = isDesktop ? 32 : isTablet ? 24 : 16;

  // Largeur dispo pour le contenu centre.
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const innerWidth = contentWidth - sidePadding * 2;
  const gap = isMobile ? 0 : 16;
  const cardWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    columns,
    sidePadding,
    contentMaxWidth: CONTENT_MAX_WIDTH,
    formMaxWidth: FORM_MAX_WIDTH,
    contentWidth,
    cardWidth,
    gap,
  };
}
