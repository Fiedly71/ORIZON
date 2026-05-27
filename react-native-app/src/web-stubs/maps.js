// Web stub for react-native-maps using Leaflet + OpenStreetMap (gratuit, open-source).
// Provides a real interactive map on web matching react-native-maps API shape.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletPromise = null;
function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const MapContext = React.createContext(null);

const MapView = React.forwardRef(({ children, style, initialRegion, region, onRegionChangeComplete }, ref) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !L || !containerRef.current || mapRef.current) return;
      const r = region || initialRegion || { latitude: 18.5944, longitude: -72.3074, latitudeDelta: 0.5, longitudeDelta: 0.5 };
      const map = L.map(containerRef.current, { zoomControl: true })
        .setView([r.latitude, r.longitude], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
      if (onRegionChangeComplete) {
        map.on('moveend', () => {
          const c = map.getCenter();
          const b = map.getBounds();
          onRegionChangeComplete({
            latitude: c.lat,
            longitude: c.lng,
            latitudeDelta: Math.abs(b.getNorth() - b.getSouth()),
            longitudeDelta: Math.abs(b.getEast() - b.getWest()),
          });
        });
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
      try { mapRef.current?.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  return (
    <View ref={ref} style={[styles.container, style]}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />
      {ready && (
        <MapContext.Provider value={{ map: mapRef.current, markersRef }}>
          {children}
        </MapContext.Provider>
      )}
    </View>
  );
});

export function Marker({ coordinate, title, description, onPress }) {
  const ctx = React.useContext(MapContext);
  useEffect(() => {
    if (!ctx?.map || !coordinate) return;
    const L = window.L;
    if (!L) return;
    const m = L.marker([coordinate.latitude, coordinate.longitude]);
    if (title) m.bindPopup(`<strong>${title}</strong><br>${description || ''}`);
    if (onPress) m.on('click', () => onPress());
    m.addTo(ctx.map);
    ctx.markersRef.current.push(m);
    return () => { try { ctx.map.removeLayer(m); } catch {} };
  }, [ctx, coordinate?.latitude, coordinate?.longitude]);
  return null;
}

export const Callout = () => null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240, position: 'relative', overflow: 'hidden' },
});

export default MapView;
