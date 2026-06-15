/**
 * Owner login screen.
 * Supports:
 *   - Phone + password login
 *   - Passkey / biometric login (web only, when passkeys exist)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../src/theme';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useWebAuthn } from '../../src/hooks/useWebAuthn';
import { clearSessionExit } from '../../src/utils/sessionExit';

export default function OwnerLoginScreen() {
  const router = useRouter();
  const { loginOwner, setOwnerSession } = useAuthContext();
  const webAuthn = useWebAuthn();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedPasskeys, setCheckedPasskeys] = useState(false);

  // ── Check if any passkeys exist (probe login/options endpoint) ──

  useEffect(() => {
    if (webAuthn.isSupported) {
      webAuthn.checkPasskeys().finally(() => setCheckedPasskeys(true));
    } else {
      setCheckedPasskeys(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webAuthn.isSupported]);

  // ── Password login ──────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    const phoneVal = phone.trim();
    const passwordVal = password;

    if (!phoneVal || !passwordVal) {
      setError('Ingresa tu teléfono y contraseña.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loginOwner(phoneVal, passwordVal);
      clearSessionExit();
      router.replace('/(owner)/dashboard');
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 429) {
        setError('Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
      } else {
        // 401, 400, network — always show the same generic message (anti-enumeration)
        setError('Credenciales inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [phone, password, loginOwner, router]);

  // ── Passkey login ────────────────────────────────────────────

  const handlePasskeyLogin = useCallback(async () => {
    setError(null);
    try {
      const session = await webAuthn.loginWithPasskey();
      await setOwnerSession(session.token, session.owner);
      clearSessionExit();
      router.replace('/(owner)/dashboard');
    } catch {
      // error already set inside useWebAuthn
    }
  }, [webAuthn, setOwnerSession, router]);

  // ── Computed state ───────────────────────────────────────────

  const showPasskeyButton =
    checkedPasskeys && webAuthn.isSupported && webAuthn.hasPasskeys === true;

  const displayError = error ?? webAuthn.error;

  // ── Render ───────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={36} color={colors.gold} />
          </View>
          <Text style={styles.title}>Panel del estudio</Text>
          <Text style={styles.subtitle}>Acceso exclusivo para el propietario</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>

          {/* Phone field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.gray600}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="6143278357"
                placeholderTextColor={colors.gray700}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                editable={!isLoading}
                accessible
                accessibilityLabel="Teléfono del propietario"
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.gray600}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.gray700}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
                accessible
                accessibilityLabel="Contraseña"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray500}
                />
              </Pressable>
            </View>
          </View>

          {/* Error message */}
          {displayError ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Passkey button — only shown when supported + passkeys exist */}
          {showPasskeyButton ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[
                  styles.passkeyButton,
                  webAuthn.isLoading && styles.buttonDisabled,
                ]}
                onPress={handlePasskeyLogin}
                disabled={webAuthn.isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Entrar con huella o Face ID"
              >
                {webAuthn.isLoading ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <>
                    <Ionicons name="finger-print" size={22} color={colors.gold} />
                    <Text style={styles.passkeyButtonText}>
                      Entrar con huella / Face ID
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* ── Back link ── */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <Ionicons name="arrow-back-outline" size={16} color={colors.gray500} />
          <Text style={styles.backLinkText}>Volver al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gold + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },

  // Form
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.gray400,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    paddingVertical: spacing.sm,
    outlineStyle: 'none',
  } as any,
  inputFlex: {
    flex: 1,
  },
  eyeButton: {
    padding: spacing.xs,
  },

  // Error
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

  // Login button
  loginButton: {
    height: 52,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  loginButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray800,
  },
  dividerText: {
    color: colors.gray600,
    fontSize: 12,
  },

  // Passkey button
  passkeyButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  passkeyButtonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },

  // Back link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    color: colors.gray500,
    fontSize: 14,
  },
});
