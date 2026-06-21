/**
 * Owner access screen.
 * The backend decides whether first-time password setup is required.
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
import {
  getOwnerSetupStatus,
  requestOwnerSetup,
  verifyOwnerSetup,
} from '../../src/services/authApi';
import { clearSessionExit } from '../../src/utils/sessionExit';

type OwnerAccessMode = 'loading' | 'error' | 'setup' | 'login';
type SetupStep = 'phone' | 'verify';

function getStatus(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

export default function OwnerLoginScreen() {
  const router = useRouter();
  const { loginOwner, setOwnerSession } = useAuthContext();
  const webAuthn = useWebAuthn();

  const [mode, setMode] = useState<OwnerAccessMode>('loading');
  const [setupStep, setSetupStep] = useState<SetupStep>('phone');
  const [phone, setPhone] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedPasskeys, setCheckedPasskeys] = useState(false);

  const loadSetupStatus = useCallback(async () => {
    setMode('loading');
    setError(null);

    try {
      const response = await getOwnerSetupStatus();
      setMode(response.setupRequired ? 'setup' : 'login');
      setSetupStep('phone');
    } catch {
      setMode('error');
      setError('No se pudo consultar el estado de acceso. Revisa tu conexion e intenta de nuevo.');
    }
  }, []);

  useEffect(() => {
    void loadSetupStatus();
  }, [loadSetupStatus]);

  useEffect(() => {
    if (mode !== 'login') return;

    if (webAuthn.isSupported) {
      webAuthn.checkPasskeys().finally(() => setCheckedPasskeys(true));
    } else {
      setCheckedPasskeys(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, webAuthn.isSupported]);

  const handleLogin = useCallback(async () => {
    const phoneVal = phone.trim();
    const passwordVal = password;

    if (!phoneVal || !passwordVal) {
      setError('Ingresa tu telefono y contrasena.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await loginOwner(phoneVal, passwordVal);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 400) {
        setError('Revisa los datos ingresados.');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera antes de reintentar.');
      } else {
        setError('Telefono o contrasena invalidos.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, password, loginOwner, router]);

  const handleSetupRequest = useCallback(async () => {
    const phoneVal = phone.trim();

    if (!phoneVal) {
      setError('Ingresa tu telefono.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await requestOwnerSetup(phoneVal);
      setSetupPhone(phoneVal);
      setSetupStep('verify');
      setCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 409) {
        setError('La configuracion inicial ya fue completada.');
        setMode('login');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError('Revisa los datos ingresados.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [phone]);

  const handleSetupVerify = useCallback(async () => {
    const codeVal = code.trim();
    const passwordVal = password;

    if (!/^\d{6}$/.test(codeVal)) {
      setError('El codigo debe tener exactamente 6 digitos.');
      return;
    }

    if (passwordVal.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordVal !== confirmPassword) {
      setError('La confirmacion de contrasena no coincide.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const session = await verifyOwnerSetup(setupPhone, codeVal, passwordVal);
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 400) {
        setError('Revisa los datos ingresados.');
      } else if (status === 401) {
        setError('Codigo invalido o expirado.');
      } else if (status === 409) {
        setError('La configuracion inicial ya fue completada.');
        setMode('login');
        setSetupStep('phone');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError('No se pudo completar la configuracion. Intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [code, password, confirmPassword, setupPhone, setOwnerSession, router]);

  const handlePasskeyLogin = useCallback(async () => {
    setError(null);
    try {
      const session = await webAuthn.loginWithPasskey();
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch {
      // Error is shown by useWebAuthn.
    }
  }, [webAuthn, setOwnerSession, router]);

  const goBackToSetupPhone = useCallback(() => {
    setSetupStep('phone');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  }, []);

  const showPasskeyButton =
    mode === 'login' &&
    checkedPasskeys &&
    webAuthn.isSupported &&
    webAuthn.hasPasskeys === true;

  const displayError = error ?? (mode === 'login' ? webAuthn.error : null);

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
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name={mode === 'setup' ? 'shield-checkmark-outline' : 'key-outline'} size={36} color={colors.gold} />
          </View>
          <Text style={styles.title}>
            {mode === 'setup' ? 'Configurar acceso de duena' : 'Panel del estudio'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'setup'
              ? 'Crea tu contrasena con verificacion por WhatsApp'
              : 'Acceso exclusivo para la propietaria'}
          </Text>
        </View>

        {mode === 'loading' ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={styles.stateText}>Consultando estado de acceso...</Text>
          </View>
        ) : mode === 'error' ? (
          <View style={styles.form}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={loadSetupStatus}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
            >
              <Text style={styles.loginButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {mode === 'setup' && setupStep === 'verify' ? (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.info} />
                  <Text style={styles.infoText}>
                    Enviamos un codigo por WhatsApp al telefono indicado.
                  </Text>
                </View>

                <Field
                  icon="keypad-outline"
                  label="Codigo de 6 digitos"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  onSubmitEditing={handleSetupVerify}
                />

                <PasswordField
                  label="Nueva contrasena"
                  value={password}
                  onChangeText={setPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={!isSubmitting}
                />

                <PasswordField
                  label="Confirmar contrasena"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={!isSubmitting}
                  onSubmitEditing={handleSetupVerify}
                />
              </>
            ) : (
              <>
                <Field
                  icon="call-outline"
                  label="Telefono"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="6143278357"
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                  onSubmitEditing={mode === 'setup' ? handleSetupRequest : undefined}
                  accessibilityLabel="Telefono de la propietaria"
                />

                {mode === 'login' ? (
                  <PasswordField
                    label="Contrasena"
                    value={password}
                    onChangeText={setPassword}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((value) => !value)}
                    editable={!isSubmitting}
                    onSubmitEditing={handleLogin}
                  />
                ) : null}
              </>
            )}

            {displayError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginButton, isSubmitting && styles.buttonDisabled]}
              onPress={
                mode === 'setup'
                  ? setupStep === 'phone'
                    ? handleSetupRequest
                    : handleSetupVerify
                  : handleLogin
              }
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                mode === 'setup'
                  ? setupStep === 'phone'
                    ? 'Enviar codigo'
                    : 'Configurar acceso'
                  : 'Iniciar sesion'
              }
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.loginButtonText}>
                  {mode === 'setup'
                    ? setupStep === 'phone'
                      ? 'Enviar codigo'
                      : 'Configurar acceso'
                    : 'Iniciar sesion'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'setup' && setupStep === 'verify' ? (
              <TouchableOpacity
                style={styles.backLink}
                onPress={goBackToSetupPhone}
                accessibilityRole="button"
                accessibilityLabel="Volver a telefono"
                disabled={isSubmitting}
              >
                <Ionicons name="arrow-back-outline" size={16} color={colors.gray500} />
                <Text style={styles.backLinkText}>Volver al telefono</Text>
              </TouchableOpacity>
            ) : null}

            {showPasskeyButton ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.passkeyButton, webAuthn.isLoading && styles.buttonDisabled]}
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
                      <Text style={styles.passkeyButtonText}>Entrar con huella / Face ID</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

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

interface FieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  editable: boolean;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable,
  onSubmitEditing,
  accessibilityLabel,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={colors.gray600} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray700}
          keyboardType={keyboardType}
          autoComplete={keyboardType === 'phone-pad' ? 'tel' : 'off'}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          accessible
          accessibilityLabel={accessibilityLabel ?? label}
        />
      </View>
    </View>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  editable: boolean;
  onSubmitEditing?: () => void;
}

function PasswordField({
  label,
  value,
  onChangeText,
  showPassword,
  onTogglePassword,
  editable,
  onSubmitEditing,
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.gray600} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={value}
          onChangeText={onChangeText}
          placeholder="********"
          placeholderTextColor={colors.gray700}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          accessible
          accessibilityLabel={label}
        />
        <Pressable
          onPress={onTogglePassword}
          style={styles.eyeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.gray500}
          />
        </Pressable>
      </View>
    </View>
  );
}

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
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateText: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
  },
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.infoLight,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
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
