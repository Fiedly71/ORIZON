// Navigator racine. Bascule entre AuthNavigator et l'app principale
// selon l'etat d'authentification global (Zustand + Supabase).
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegacyAppShell from '../LegacyAppShell';
import AuthNavigator from './AuthNavigator';
import MapScreen from '../screens/MapScreen';
import SellWizardScreen from '../screens/SellWizardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import MyVisitsScreen from '../screens/MyVisitsScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import MortgageScreen from '../screens/MortgageScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { useAuthStore } from '../store/useAuthStore';
import { restoreSession } from '../services/authService';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={LegacyAppShell} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="SellWizard" component={SellWizardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} />
            <Stack.Screen name="MyVisits" component={MyVisitsScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Mortgage" component={MortgageScreen} />
            <Stack.Screen name="Favorites" component={PlaceholderScreen} initialParams={{ title: 'Favoris', note: 'Tes biens preferes apparaitront ici.' }} />
            <Stack.Screen name="Alerts" component={PlaceholderScreen} initialParams={{ title: 'Alertes', note: 'Cree des criteres pour recevoir une notif quand un bien correspond.' }} />
            <Stack.Screen name="Kyc" component={PlaceholderScreen} initialParams={{ title: 'Verification (KYC)', note: 'Soumets ton selfie + piece pour obtenir le badge verifie.' }} />
            <Stack.Screen name="Settings" component={PlaceholderScreen} initialParams={{ title: 'Parametres', note: 'Langue, notifications, donnees.' }} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
