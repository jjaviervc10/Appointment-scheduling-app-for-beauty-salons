import React from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { InstagramPublishDestination } from '../../types/marketing-media.types';

interface Props {
  visible: boolean;
  loading: boolean;
  error: string | null;
  destination: InstagramPublishDestination;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InstagramPublishConfirmModal({
  visible,
  loading,
  error,
  destination,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconRow}>
            <Ionicons name="warning-outline" size={32} color={colors.warning} />
          </View>

          <Text style={styles.title}>
            {destination === 'story' ? 'Publicar historia en Instagram' : 'Publicar en Instagram'}
          </Text>
          <Text style={styles.message}>
            {destination === 'story'
              ? 'Esta acción publicará una historia visible en Instagram. ¿Deseas continuar?'
              : 'Esta acción publicará contenido visible en Instagram. ¿Deseas continuar?'}
          </Text>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.black} size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color={colors.black} />
                  <Text style={styles.confirmText}>Publicar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  confirmBtn: {
    backgroundColor: colors.gold,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    ...typography.button,
    color: colors.gray400,
  },
  confirmText: {
    ...typography.button,
    color: colors.black,
  },
});
