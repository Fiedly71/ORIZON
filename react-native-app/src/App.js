// Nouveau point d'entree de l'app.
// Providers globaux: GestureHandler, SafeArea, BottomSheetModal, i18n auto.
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './navigation/RootNavigator';
import { detectAndApplyLanguage } from './i18n';
import { useProperty } from './store/useProperty';
import { useUI } from './store/useUI';
import { initAnalytics } from './services/analyticsService';

export default function App() {
  useEffect(() => {
    (async () => {
      await useUI.getState().hydrate?.();
      detectAndApplyLanguage();
      useProperty.getState().hydrateFromCache?.();
      useProperty.getState().loadProperties?.();
      initAnalytics();
    })();
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#FFFFFF', true);
      RNStatusBar.setBarStyle('dark-content', true);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
        <BottomSheetModalProvider>
          <RootNavigator />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
