// Navigator racine. Bascule entre AuthNavigator et l'app principale
// selon l'etat d'authentification global (Zustand + Supabase).
import React, { useEffect, useRef } from 'react';
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
import CheckoutScreen from '../screens/CheckoutScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import MortgageScreen from '../screens/MortgageScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SellerStatsScreen from '../screens/SellerStatsScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import LegalScreen from '../screens/LegalScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import { useAuthStore } from '../store/useAuthStore';
import { restoreSession } from '../services/authService';
import { usePushSetup } from '../hooks/usePushSetup';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigationRef = useRef(null);
  usePushSetup(navigationRef);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={LegacyAppShell} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="SellWizard" component={SellWizardScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} />
            <Stack.Screen name="MyVisits" component={MyVisitsScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Mortgage" component={MortgageScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="SellerStats" component={SellerStatsScreen} />
            <Stack.Screen name="Alerts" component={PlaceholderScreen} initialParams={{ title: 'Alertes', note: 'Cree des criteres pour recevoir une notif quand un bien correspond.' }} />
            <Stack.Screen name="Kyc" component={PlaceholderScreen} initialParams={{ title: 'Verification (KYC)', note: 'Soumets ton selfie + piece pour obtenir le badge verifie.' }} />
            <Stack.Screen name="Settings" component={PlaceholderScreen} initialParams={{ title: 'Parametres', note: 'Langue, notifications, donnees.' }} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ kind: 'terms' }} />
            <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ kind: 'privacy' }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
