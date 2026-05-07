// MainTabs - Navigation par onglets bas Airbnb-style :
// Explorer / Favoris / Voyages / Messages / Profil
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import TripsScreen from '../screens/TripsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: C.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Explore: focused ? 'search' : 'search-outline',
            Favorites: focused ? 'heart' : 'heart-outline',
            Trips: focused ? 'airplane' : 'airplane-outline',
            Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
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
        name="Trips"
        component={TripsScreen}
        options={{ title: 'Voyages' }}
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
