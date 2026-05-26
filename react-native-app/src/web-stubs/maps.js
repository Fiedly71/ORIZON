// Web stub for react-native-maps
// On web we render a simple placeholder; a future iteration could use
// react-leaflet or Mapbox GL JS.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  text: { color: '#6B7280', fontSize: 14 },
});

const MapView = ({ children, style, ...rest }) => (
  <View style={[styles.container, style]}>
    <Text style={styles.text}>Carte interactive (disponible sur l'app mobile)</Text>
  </View>
);

export const Marker = () => null;
export const Callout = () => null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

export default MapView;
