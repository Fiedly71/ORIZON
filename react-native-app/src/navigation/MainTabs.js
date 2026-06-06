// MainTabs - Navigation par onglets bas Airbnb-style :
// Explorer / Favoris / [Publier (publishers seulement)] / Messages / Profil
// Adapte aux barres systeme Android (gesture nav) via useSafeAreaInsets.
import React from 'react';
import { Platform, Pressable, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuthStore } from '../store/useAuthStore';
import { canPublish } from '../services/authService';
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
  const isPublisher = canPublish(user);
  // Web : pas de safe-area native, on garde une hauteur compacte mais suffisante pour labels.
  // Mobile natif : ajoute l'inset bottom (home indicator iOS / gesture bar Android).
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 28 : Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const topPad = isWeb ? 10 : 8;
  const tabHeight = isWeb ? 92 : 56 + bottomPad;

  return (
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
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 18,
          marginTop: 4,
          marginBottom: 0,
          paddingBottom: 0,
          includeFontPadding: false,
        },
        tabBarItemStyle: isWeb
          ? { paddingTop: 6, paddingBottom: 4, overflow: 'visible' }
          : undefined,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Explore: focused ? 'search' : 'search-outline',
            Favorites: focused ? 'heart' : 'heart-outline',
            Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
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
      />
      {isPublisher && (
        <Tab.Screen
          name="Publish"
          component={PublishPlaceholder}
          options={({ navigation }) => ({
            title: 'Publier',
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <PublishButton
                onPress={() => navigation.getParent()?.navigate('SellWizard')}
              />
            ),
          })}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.getParent()?.navigate('SellWizard');
            },
          })}
        />
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  publishWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
