// Navigator racine. Bascule entre AuthNavigator et l'app principale
// selon l'etat d'authentification global (Zustand + Supabase).
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
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
import ConfirmEmailScreen from '../screens/ConfirmEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import MortgageScreen from '../screens/MortgageScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SellerStatsScreen from '../screens/SellerStatsScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';
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
import KycScreen from '../screens/KycScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SectionDetailScreen from '../screens/SectionDetailScreen';
import MonCashManualScreen from '../screens/MonCashManualScreen';
import PlansScreen from '../screens/PlansScreen';
import { restoreSession } from '../services/authService';
import { usePushSetup } from '../hooks/usePushSetup';

const Stack = createNativeStackNavigator();

// Deep links : orizon://property/:id  &  https://orizon.app/property/:id
const linking = {
  prefixes: ['orizon://', 'https://orizon.app', 'https://www.orizon.app'],
  config: {
    screens: {
      App: {
        screens: {
          Explore: 'explore',
          Favorites: 'tab/favorites',
          Messages: 'tab/messages',
          ProfileTab: 'tab/account',
        },
      },
      PropertyDetail: 'property/:id',
      Conversation: 'chat/:id',
      Compare: 'compare',
      Map: 'map',
      Mortgage: 'mortgage',
      MyListings: 'my-listings',
      MyVisits: 'my-visits',
      Payments: 'payments',
      SellWizard: 'sell',
      Profile: 'profile',
      EditProfile: 'profile/edit',
      Settings: 'settings',
      Help: 'help',
      About: 'about',
      Support: 'support',
      Kyc: 'kyc',
      Alerts: 'alerts',
      SellerStats: 'stats',
      BoostListing: 'boost/:id',
      Plans: 'plans',
      Terms: 'légal/terms',
      Privacy: 'légal/privacy',
      ResetPassword: 'reset-password',
      ConfirmEmail: 'confirm-email',
      Auth: { screens: { Login: 'login', Register: 'register', Onboarding: 'onboarding', ForgotPassword: 'forgot-password' } },
    },
  },
};

export default function RootNavigator() {
  const navRef = navigationRef;
  usePushSetup(navRef);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      {/*
        Mode invité (browse-as-guest) : MainTabs est TOUJOURS monté.
        Un visiteur non-connecté peut scroller ExploreScreen. Toute action
        réelle (voir un bien, rechercher, favoris, messages, publier, profil,
        etc.) est interceptée par requireAuth() qui redirige vers l'Auth stack.
        L'Auth stack (Login/Register/Onboarding/ForgotPassword) reste
        accessible via `navigation.navigate('Auth', { screen: 'Login' })`.
      */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="App" component={MainTabs} />
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ animation: 'slide_from_bottom' }} />
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
        <Stack.Screen name="Kyc" component={KycScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SectionDetail" component={SectionDetailScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ kind: 'terms' }} />
        <Stack.Screen name="Privacy" component={LegalScreen} initialParams={{ kind: 'privacy' }} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="Conversation" component={ConversationScreen} />
        <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="MonCashManual" component={MonCashManualScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Plans" component={PlansScreen} />
        <Stack.Screen name="BoostListing" component={BoostListingScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
        <Stack.Screen name="AgencyManage" component={AgencyManageScreen} />
        <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
