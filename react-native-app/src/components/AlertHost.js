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

const TONE_ACCENT = {
  info: { bg: '#EFF6FF', ring: '#1D4ED8', icon: 'information-circle', iconColor: '#1D4ED8' },
  success: { bg: '#ECFDF5', ring: '#059669', icon: 'checkmark-circle', iconColor: '#059669' },
  warning: { bg: '#FFFBEB', ring: '#D97706', icon: 'alert-circle', iconColor: '#D97706' },
  error: { bg: '#FEF2F2', ring: '#DC2626', icon: 'close-circle', iconColor: '#DC2626' },
};

export default function AlertHost() {
  const [alertItem, setAlertItem] = useState(null);

  useEffect(() => subscribe(setAlertItem), []);

  if (!alertItem) return null;

  const tone = TONE_ACCENT[alertItem.tone] || TONE_ACCENT.info;
  const iconName = alertItem.icon || tone.icon;

  const handlePress = (btn) => {
    dismissCurrent(btn?.text);
    setTimeout(() => { try { btn?.onPress?.(); } catch (_) {} }, 0);
  };

  const handleBackdrop = () => {
    // Ferme via le bouton "cancel" si present, sinon ne fait rien (evite dismiss accidentel)
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
          {/* Header gradient badge ORIZON */}
          <View style={styles.header}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandTxt}>ORIZON</Text>
            </View>
          </View>

          <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
            <Ionicons name={iconName} size={38} color={tone.iconColor} />
          </View>

          {alertItem.title ? (
            <Text style={styles.title}>{alertItem.title}</Text>
          ) : null}
          {alertItem.message ? (
            <Text style={styles.message}>{alertItem.message}</Text>
          ) : null}

          <View style={styles.buttonsRow}>
            {alertItem.buttons.map((btn, i) => {
              const isCancel = btn?.style === 'cancel';
              const isDestructive = btn?.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;
              return (
                <Pressable
                  key={String(i)}
                  onPress={() => handlePress(btn)}
                  style={[
                    styles.btn,
                    isCancel && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                    isPrimary && styles.btnPrimary,
                  ]}
                >
                  <Text
                    style={[
                      styles.btnTxt,
                      isCancel && styles.btnCancelTxt,
                      isDestructive && styles.btnDestructiveTxt,
                      isPrimary && styles.btnPrimaryTxt,
                    ]}
                  >
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 24px 60px rgba(15,23,42,0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandBadge: {
    backgroundColor: '#F5B301',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  brandTxt: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnPrimary: { backgroundColor: C.primary },
  btnPrimaryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnCancel: { backgroundColor: '#F1F5F9' },
  btnCancelTxt: { color: C.text, fontWeight: '600', fontSize: 15 },
  btnDestructive: { backgroundColor: '#DC2626' },
  btnDestructiveTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnTxt: { fontSize: 15, fontWeight: '600' },
});
