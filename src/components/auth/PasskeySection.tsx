/**
 * PasskeySection — passkey management for the owner settings screen.
 * Lists registered devices, allows adding new ones and revoking existing.
 * Only rendered on web with HTTPS (WebAuthn prerequisite).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import { useAuthContext } from '../../contexts/AuthContext';
import type { PasskeyCredential } from '../../services/authApi';
import { detectWebAuthnSupport } from '../../utils/webauthn';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function PasskeySection() {
  const { ownerToken } = useAuthContext();
  const webAuthn = useWebAuthn();
  const { isSupported, reason } = detectWebAuthnSupport();

  const [deviceName, setDeviceName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  // Load passkeys on mount
  useEffect(() => {
    if (ownerToken && isSupported) {
      void webAuthn.loadPasskeys(ownerToken);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerToken, isSupported]);

  // ── Register new passkey ─────────────────────────────────────

  const handleRegister = useCallback(async () => {
    if (!ownerToken) return;
    const name = deviceName.trim() || getDefaultDeviceName();
    setRegisterSuccess(false);
    webAuthn.clearError();
    try {
      await webAuthn.registerPasskey(ownerToken, name);
      setDeviceName('');
      setIsAdding(false);
      setRegisterSuccess(true);
      await webAuthn.loadPasskeys(ownerToken);
    } catch {
      // Error shown by webAuthn.error
    }
  }, [ownerToken, deviceName, webAuthn]);

  // ── Revoke a passkey ─────────────────────────────────────────

  const handleRevoke = useCallback(
    async (passkey: PasskeyCredential) => {
      if (!ownerToken) return;
      webAuthn.clearError();
      try {
        await webAuthn.revokePasskey(ownerToken, passkey.id);
        setRevokeConfirmId(null);
      } catch {
        // Error shown by webAuthn.error
      }
    },
    [ownerToken, webAuthn],
  );

  const confirmRevoke = useCallback(
    (passkey: PasskeyCredential) => {
      if (Platform.OS === 'web') {
        // Use browser confirm on web
        if (typeof window !== 'undefined') {
          const ok = window.confirm(
            `¿Eliminar acceso con huella del dispositivo "${passkey.deviceName}"?\n\nDeberás usar tu contraseña para entrar desde ese dispositivo.`,
          );
          if (ok) void handleRevoke(passkey);
        }
      } else {
        Alert.alert(
          'Eliminar dispositivo',
          `¿Eliminar acceso con huella del dispositivo "${passkey.deviceName}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => void handleRevoke(passkey),
            },
          ],
        );
      }
    },
    [handleRevoke],
  );

  // ── Not supported — show explanation ────────────────────────

  if (!isSupported) {
    return (
      <View style={styles.section}>
        <SectionTitle />
        <View style={styles.unsupportedBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.gray500} />
          <Text style={styles.unsupportedText}>
            {reason === 'no-secure-context'
              ? 'La huella solo está disponible en la versión segura (HTTPS) de la app.'
              : 'Tu navegador o dispositivo no soporta el acceso con huella.'}
          </Text>
        </View>
      </View>
    );
  }

  // ── Supported ───────────────────────────────────────────────

  return (
    <View style={styles.section}>
      <SectionTitle />

      {/* Success banner */}
      {registerSuccess && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          <Text style={styles.successText}>
            ¡Listo! La próxima vez puedes entrar con tu huella desde este dispositivo.
          </Text>
        </View>
      )}

      {/* Error from webAuthn operations */}
      {webAuthn.error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{webAuthn.error}</Text>
        </View>
      ) : null}

      {/* Passkey list */}
      {webAuthn.isLoading && webAuthn.passkeys.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.gold} />
          <Text style={styles.loadingText}>Cargando dispositivos...</Text>
        </View>
      ) : webAuthn.passkeys.length === 0 ? (
        <View style={styles.emptyRow}>
          <Ionicons name="finger-print" size={24} color={colors.gray700} />
          <Text style={styles.emptyText}>Ningún dispositivo configurado aún.</Text>
        </View>
      ) : (
        webAuthn.passkeys.map((pk) => (
          <View key={pk.id} style={styles.deviceRow}>
            <View style={styles.deviceIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.gold} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{pk.deviceName}</Text>
              <Text style={styles.deviceDate}>
                Agregado {formatDate(pk.createdAt)}
                {pk.lastUsedAt ? `  ·  Último uso ${formatDate(pk.lastUsedAt)}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmRevoke(pk)}
              style={styles.revokeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Eliminar ${pk.deviceName}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Add device button / form */}
      {isAdding ? (
        <View style={styles.addForm}>
          <Text style={styles.addLabel}>Nombre del dispositivo (opcional)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.nameInput}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder={getDefaultDeviceName()}
              placeholderTextColor={colors.gray700}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>
          <View style={styles.addActions}>
            <TouchableOpacity
              style={styles.cancelAddButton}
              onPress={() => {
                setIsAdding(false);
                setDeviceName('');
                webAuthn.clearError();
              }}
            >
              <Text style={styles.cancelAddText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmAddButton, webAuthn.isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={webAuthn.isLoading}
            >
              {webAuthn.isLoading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <>
                  <Ionicons name="finger-print" size={18} color={colors.black} />
                  <Text style={styles.confirmAddText}>Configurar huella</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setIsAdding(true); setRegisterSuccess(false); webAuthn.clearError(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.gold} />
          <Text style={styles.addButtonText}>Agregar este dispositivo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionTitle() {
  return (
    <View style={styles.titleRow}>
      <Ionicons name="finger-print" size={20} color={colors.gold} />
      <Text style={styles.sectionTitle}>Acceso con huella / Face ID</Text>
    </View>
  );
}

function getDefaultDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Mi dispositivo';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Mi dispositivo';
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
    fontSize: 15,
  },

  unsupportedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.gray900,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  unsupportedText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 18,
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray500,
  },

  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray600,
  },

  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  deviceDate: {
    fontSize: 11,
    color: colors.gray500,
  },
  revokeButton: {
    padding: spacing.xs,
  },

  addForm: {
    backgroundColor: colors.gray900,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addLabel: {
    fontSize: 12,
    color: colors.gray400,
  },
  inputRow: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  nameInput: {
    color: colors.white,
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  addActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelAddButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  cancelAddText: {
    color: colors.gray400,
    fontSize: 13,
  },
  confirmAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.gold,
  },
  confirmAddText: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    color: colors.gold,
    fontSize: 14,
  },
});
