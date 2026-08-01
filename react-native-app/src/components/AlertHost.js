// AlertHost - Modal simple et propre (sans brand header).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { C, radii, spacing } from '../theme/colors';
import { subscribe, dismissCurrent } from '../services/alert';

export default function AlertHost() {
  const [alertItem, setAlertItem] = useState(null);

  useEffect(() => subscribe(setAlertItem), []);

  if (!alertItem) return null;

  const handlePress = (btn) => {
    dismissCurrent(btn?.text);
    setTimeout(() => { try { btn?.onPress?.(); } catch (_) {} }, 0);
  };

  const handleBackdrop = () => {
    const cancel = alertItem.buttons.find((b) => b?.style === 'cancel');
    if (cancel) handlePress(cancel);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleBackdrop}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleBackdrop}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {alertItem.title ? (
            <Text style={styles.title}>{alertItem.title}</Text>
          ) : null}
          {alertItem.message ? (
            <Text style={styles.message}>{alertItem.message}</Text>
          ) : null}
          <View style={styles.buttonsCol}>
            {alertItem.buttons.map((btn, i) => {
              const isCancel = btn?.style === 'cancel';
              const isDestructive = btn?.style === 'destructive';
              return (
                <Pressable
                  key={String(i)}
                  onPress={() => handlePress(btn)}
                  style={[
                    styles.btn,
                    isCancel && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                    !isCancel && !isDestructive && styles.btnPrimary,
                  ]}
                >
                  <Text style={[
                    styles.btnTxt,
                    isCancel && styles.btnCancelTxt,
                    isDestructive && styles.btnDestructiveTxt,
                  ]}>
                    {btn?.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonsCol: { gap: 8, marginTop: 8 },
  btn: {
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: C.primary },
  btnCancel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  btnDestructive: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnCancelTxt: { color: C.text, fontWeight: '600' },
  btnDestructiveTxt: { color: '#EF4444', fontWeight: '700' },
});
