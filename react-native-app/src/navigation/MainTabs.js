// MainTabs - Navigation par onglets bas Airbnb-style :
// Explorer / Favoris / Messages / Profil
// Adapte aux barres systeme Android (gesture nav) via useSafeAreaInsets.
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  // Hauteur de base + bottom inset (gesture nav Android, home indicator iOS, web nav bar)
  const defaultPad = Platform.OS === 'web' ? 16 : Platform.OS === 'android' ? 12 : 8;
  const bottomPad = Math.max(insets.bottom, defaultPad);
  const tabHeight = (Platform.OS === 'web' ? 64 : 56) + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: Platform.OS === 'web' ? 4 : 0,
        },
        tabBarItemStyle: Platform.OS === 'web' ? { paddingVertical: 4 } : undefined,
        tabBarIcon: ({ color, size, focused }) => {
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
