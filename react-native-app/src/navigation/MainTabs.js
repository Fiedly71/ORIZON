// MainTabs - Navigation par onglets bas Airbnb-style :
// Explorer / Favoris / [Publier (publishers seulement)] / Messages / Profil
// Adapte aux barres systeme Android (gesture nav) via useSafeAreaInsets.
import React, { useEffect } from 'react';
import { Platform, Pressable, View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmailVerifyBanner from '../components/EmailVerifyBanner';
import { useAuthStore } from '../store/useAuthStore';
import { useMessages } from '../store/useMessages';
import { canPublish } from '../services/authService';
import { requireEmailVerified } from '../utils/emailVerifyGuard';
import { requireAuth, redirectToAuth } from '../utils/requireAuth';
import { C } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Placeholder vide : on n'affiche jamais cet ecran, on intercepte le clic via tabBarButton
function PublishPlaceholder() { return null; }

function PublishButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.publishWrap}
      accessibilityRole="button"
      accessibilityLabel="Publier une annonce"
    >
      <View style={styles.publishBtn}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const isPublisher = canPublish(user);
  // En mode invité (non connecté) on affiche l'onglet Publier pour tous :
  // le tap redirigera vers l'inscription (compte Propriétaire/Agence).
  const showPublish = !isAuthed || isPublisher;
  const unreadTotal = useMessages((s) => s.unreadTotal);
  const refreshMsgs = useMessages((s) => s.refresh);
  const subscribeMsgs = useMessages((s) => s.subscribe);
  const unsubscribeMsgs = useMessages((s) => s.unsubscribe);

  // Charge le compteur unread + subscribe realtime quand l'utilisateur est connecte
  useEffect(() => {
    if (!user?.id) return undefined;
    refreshMsgs();
    subscribeMsgs();
    return () => { unsubscribeMsgs(); };
  }, [user?.id, refreshMsgs, subscribeMsgs, unsubscribeMsgs]);
  // Web : hauteur réduite pour ne pas prendre trop de place dans le viewport.
  // Mobile natif : hauteur minimale + inset bottom (home bar iOS / gesture Android).
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 6 : Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);
  const topPad = isWeb ? 6 : 6;
  const tabHeight = isWeb ? 58 : 50 + bottomPad;

  return (
    <View style={{ flex: 1 }}>
      <EmailVerifyBanner />
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: topPad,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          lineHeight: 14,
          marginTop: 2,
          marginBottom: 0,
          paddingBottom: 0,
          includeFontPadding: false,
        },
        tabBarItemStyle: isWeb
          ? { paddingTop: 4, paddingBottom: 2, overflow: 'visible' }
          : undefined,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Explore: focused ? 'search' : 'search-outline',
            Favorites: focused ? 'heart' : 'heart-outline',
            Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          const iconName = icons[route.name] || 'ellipse';
          if (route.name === 'Messages' && unreadTotal > 0) {
            return (
              <View style={styles.iconBadgeWrap}>
                <Ionicons name={iconName} size={22} color={color} />
                <View style={styles.redDot}>
                  {unreadTotal > 9 ? (
                    <Text style={styles.redDotTxt}>9+</Text>
                  ) : unreadTotal > 1 ? (
                    <Text style={styles.redDotTxt}>{unreadTotal}</Text>
                  ) : null}
                </View>
              </View>
            );
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: 'Explorer' }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favoris' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              redirectToAuth(navigation, 'Login');
            }
          },
        })}
      />
      {showPublish && (
        <Tab.Screen
          name="Publish"
          component={PublishPlaceholder}
          options={({ navigation }) => ({
            title: 'Publier',
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <PublishButton
                onPress={() => {
                  if (!isAuthed) { requireAuth(navigation, 'publier une annonce'); return; }
                  if (!isPublisher) {
                    // Utilisateur connecté mais compte Acheteur/Locataire :
                    // on le renvoie vers l'aide pour changer de rôle / créer un compte publieur.
                    navigation.getParent()?.navigate('Support');
                    return;
                  }
                  if (!requireEmailVerified('publier une annonce')) return;
                  navigation.getParent()?.navigate('SellWizard');
                }}
              />
            ),
          })}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              if (!isAuthed) { requireAuth(navigation, 'publier une annonce'); return; }
              if (!isPublisher) { navigation.getParent()?.navigate('Support'); return; }
              if (!requireEmailVerified('publier une annonce')) return;
              navigation.getParent()?.navigate('SellWizard');
            },
          })}
        />
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              redirectToAuth(navigation, 'Login');
            }
          },
        })}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              redirectToAuth(navigation, 'Login');
            }
          },
        })}
      />
    </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  publishWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  iconBadgeWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  redDotTxt: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
});
