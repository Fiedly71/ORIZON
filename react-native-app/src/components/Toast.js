// Toast - Mini systeme de toast in-app sans dependance externe.
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, radii, spacing } from '../theme/colors';

const ToastCtx = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback((msg, opts = {}) => {
    setToast({ msg, type: opts.type || 'info' });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
        .start(() => setToast(null));
    }, opts.duration || 2400);
  }, [opacity]);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const colors = {
    info: { bg: C.text, icon: 'information-circle' },
    success: { bg: C.success, icon: 'checkmark-circle' },
    error: { bg: C.danger, icon: 'alert-circle' },
    warning: { bg: '#F59E0B', icon: 'warning' },
  };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View style={[styles.wrap, { opacity, backgroundColor: colors[toast.type].bg }]} pointerEvents="box-none">
          <Pressable style={styles.row} onPress={() => setToast(null)}>
            <Ionicons name={colors[toast.type].icon} size={20} color="#fff" />
            <Text style={styles.txt}>{toast.msg}</Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 90, left: spacing.xxl, right: spacing.xxl,
    borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    zIndex: 9999,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txt: { color: '#fff', flex: 1, fontSize: 14, fontWeight: '600' },
});
