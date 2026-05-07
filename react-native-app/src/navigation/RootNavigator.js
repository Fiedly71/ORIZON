// Navigator racine. Bascule entre AuthNavigator et l'app principale
// selon l'etat d'authentification global (Zustand + Supabase).
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import AuthNavigator from './AuthNavigator';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
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
import ConversationScreen from '../screens/ConversationScreen';
import PhoneVerifyScreen from '../screens/PhoneVerifyScreen';
import AdminScreen from '../screens/AdminScreen';
import SavedSearchesScreen from '../screens/SavedSearchesScreen';
import SupportScreen from '../screens/SupportScreen';
import BoostListingScreen from '../screens/BoostListingScreen';
import CompareScreen from '../screens/CompareScreen';
import AgencyManageScreen from '../screens/AgencyManageScreen';
import { useAuthStore } from '../store/useAuthStore';
import { restoreSession } from '../services/authService';
import { usePushSetup } from '../hooks/usePushSetup';

const Stack = createNativeStackNavigator();

// Deep links : orizon://property/:id  &  https://orizon.app/property/:id
const linking = {
  prefixes: ['orizon://', 'https://orizon.app', 'https://www.orizon.app'],
  config: {
    screens: {
      App: { screens: { Explore: 'explore' } },
      PropertyDetail: 'property/:id',
      Conversation: 'chat/:id',
      Compare: 'compare',
      Auth: { screens: { Login: 'login', Register: 'register' } },
    },
  },
};

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigationRef = useRef(null);
  usePushSetup(navigationRef);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={MainTabs} />
            <Stack.Screen
              name="PropertyDetail"
              component={PropertyDetailScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
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
            <Stack.Screen name="Alerts" component={SavedSearchesScreen} />
            <Stack.Screen name="Kyc" component={PlaceholderScreen} initialParams={{ title: 'Verification (KYC)', note: 'Soumets ton selfie + piece pour obtenir le badge verifie.' }} />
            <Stack.Screen name="Settings" component={PlaceholderScreen} initialParams={{ title: 'Parametres', note: 'Langue, notifications, donnees.' }} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ kind: 'terms' }} />
            <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ kind: 'privacy' }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="BoostListing" component={BoostListingScreen} />
            <Stack.Screen name="Compare" component={CompareScreen} />
            <Stack.Screen name="AgencyManage" component={AgencyManageScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
