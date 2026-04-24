// Navigator d'authentification (Onboarding + Login + Register)
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [initial, setInitial] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setInitial(v ? 'Login' : 'Onboarding'))
      .catch(() => setInitial('Login'));
  }, []);

  if (!initial) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
