// Nouveau point d'entree de l'app.
// Providers globaux: GestureHandler, SafeArea, BottomSheetModal, i18n auto.
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import RootNavigator from './navigation/RootNavigator';
import { detectAndApplyLanguage } from './i18n';
import { useProperty } from './store/useProperty';
import { initAnalytics } from './services/analyticsService';

export default function App() {
  useEffect(() => {
    detectAndApplyLanguage();
    useProperty.getState().hydrateFromCache?.();
    useProperty.getState().loadProperties?.();
    initAnalytics();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <RootNavigator />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
