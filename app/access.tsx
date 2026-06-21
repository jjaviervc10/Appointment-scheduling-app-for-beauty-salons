import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthContext } from '../src/contexts/AuthContext';
import {
  getAuthNextStep,
  requestOwnerSetup,
  verifyOwnerSetup,
} from '../src/services/authApi';
import { useWebAuthn } from '../src/hooks/useWebAuthn';
import { isHttpError } from '../src/types/api';
import { colors, radii, spacing, typography } from '../src/theme';
import { clearSessionExit } from '../src/utils/sessionExit';

type AccessState =
  | 'phone'
  | 'resolving_next_step'
  | 'client_otp'
  | 'owner_password'
  | 'owner_setup'
  | 'error';

function getResolutionError(error: unknown): string {
  if (isHttpError(error)) {
    if (error.status === 400) return 'Revisa el número ingresado.';
    if (error.status === 429) return 'Demasiados intentos. Espera unos minutos.';
    if (error.status >= 500) return 'No pudimos completar la solicitud.';
  }

  return 'Revisa tu conexión e intenta nuevamente.';
}

function normalizeMexicanPhoneInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '');

  if (digits.length >= 13 && digits.startsWith('521')) {
    return digits.slice(3, 13);
  }

  if (digits.length >= 12 && digits.startsWith('52')) {
    return digits.slice(2, 12);
  }

  return digits.slice(0, 10);
}

export default function AccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string }>();
  const {
    authStatus,
    loginOwner,
    requestOtp,
    verifyOtp,
    setOwnerSession,
  } = useAuthContext();
  const webAuthn = useWebAuthn();
  const [accessState, setAccessState] = useState<AccessState>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedPasskeys, setCheckedPasskeys] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const clientDestination = params.intent === 'booking'
    ? '/client/booking'
    : '/client/appointments';

  useEffect(() => {
    if (authStatus === 'owner') {
      router.replace('/owner/dashboard');
    } else if (authStatus === 'client') {
      router.replace(clientDestination);
    }
  }, [authStatus, clientDestination, router]);

  useEffect(() => {
    if (accessState !== 'owner_password') {
      setCheckedPasskeys(false);
      return;
    }

    if (!webAuthn.isSupported) {
      setCheckedPasskeys(true);
      return;
    }

    void webAuthn.checkPasskeys().finally(() => setCheckedPasskeys(true));
  }, [accessState, webAuthn.checkPasskeys, webAuthn.isSupported]);

  const clearCredentials = useCallback(() => {
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
  }, []);

  const changePhone = useCallback(() => {
    clearCredentials();
    setAccessState('phone');
    setTimeout(() => phoneInputRef.current?.focus(), 100);
  }, [clearCredentials]);

  const handleContinue = useCallback(async () => {
    const normalizedInput = normalizeMexicanPhoneInput(phone);

    if (normalizedInput.length !== 10) {
      setError('Ingresa un número de WhatsApp válido.');
      return;
    }

    setPhone(normalizedInput);
    clearCredentials();
    setAccessState('resolving_next_step');

    try {
      const response = await getAuthNextStep(normalizedInput);
      if (response.nextStep === 'client_otp') {
        await requestOtp(normalizedInput);
      } else if (response.nextStep === 'owner_setup') {
        await requestOwnerSetup(normalizedInput);
      }
      setAccessState(response.nextStep);
    } catch (resolutionError) {
      setError(getResolutionError(resolutionError));
      setAccessState('error');
    }
  }, [clearCredentials, phone, requestOtp]);

  const handleClientVerify = useCallback(async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await verifyOtp(phone, otp);
      clearSessionExit();
      router.replace(clientDestination);
    } catch (verifyError) {
      setError(
        isHttpError(verifyError) && verifyError.status === 429
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'Código incorrecto o expirado. Solicita uno nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [clientDestination, otp, phone, router, verifyOtp]);

  const handleOwnerLogin = useCallback(async () => {
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await loginOwner(phone, password);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch (loginError) {
      setError(
        isHttpError(loginError) && loginError.status === 429
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'Teléfono o contraseña incorrectos.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [loginOwner, password, phone, router]);

  const handleOwnerSetup = useCallback(async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const session = await verifyOwnerSetup(phone, otp, password);
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch (setupError) {
      setError(
        isHttpError(setupError) && setupError.status === 401
          ? 'Código incorrecto o expirado.'
          : 'No se pudo activar el acceso. Revisa los datos.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmPassword, otp, password, phone, router, setOwnerSession]);

  const handlePasskeyLogin = useCallback(async () => {
    setError(null);
    try {
      const session = await webAuthn.loginWithPasskey();
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch {
      // useWebAuthn exposes the user-facing error.
    }
  }, [router, setOwnerSession, webAuthn]);

  if (authStatus === 'loading' || authStatus === 'owner' || authStatus === 'client') {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

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
        <Pressable
          style={styles.closeButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <Ionicons name="close" size={24} color={colors.gray400} />
        </Pressable>

        {accessState === 'phone' ? (
          <PhoneStep
            ref={phoneInputRef}
            phone={phone}
            error={error}
            onChangePhone={(value) => {
              setPhone(normalizeMexicanPhoneInput(value));
              setError(null);
            }}
            onContinue={handleContinue}
          />
        ) : null}

        {accessState === 'resolving_next_step' ? <ResolvingStep /> : null}

        {accessState === 'client_otp' ? (
          <ClientOtpStep
            phone={phone}
            otp={otp}
            onChangeOtp={setOtp}
            error={error}
            isSubmitting={isSubmitting}
            onVerify={handleClientVerify}
            onChangePhone={changePhone}
          />
        ) : null}

        {accessState === 'owner_password' ? (
          <PasswordStep
            phone={phone}
            password={password}
            showPassword={showPassword}
            onChangePassword={setPassword}
            onTogglePassword={() => setShowPassword((current) => !current)}
            error={error ?? webAuthn.error}
            isSubmitting={isSubmitting}
            showPasskey={
              checkedPasskeys &&
              webAuthn.isSupported &&
              webAuthn.hasPasskeys === true
            }
            passkeyLoading={webAuthn.isLoading}
            onLogin={handleOwnerLogin}
            onPasskeyLogin={handlePasskeyLogin}
            onChangePhone={changePhone}
          />
        ) : null}

        {accessState === 'owner_setup' ? (
          <SetupStep
            phone={phone}
            otp={otp}
            password={password}
            confirmPassword={confirmPassword}
            showPassword={showPassword}
            onChangeOtp={setOtp}
            onChangePassword={setPassword}
            onChangeConfirmPassword={setConfirmPassword}
            onTogglePassword={() => setShowPassword((current) => !current)}
            error={error}
            isSubmitting={isSubmitting}
            onActivate={handleOwnerSetup}
            onChangePhone={changePhone}
          />
        ) : null}

        {accessState === 'error' ? (
          <ErrorStep
            message={error ?? 'No pudimos continuar.'}
            onRetry={handleContinue}
            onChangePhone={changePhone}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface PhoneStepProps {
  phone: string;
  error: string | null;
  onChangePhone: (value: string) => void;
  onContinue: () => void;
}

const PhoneStep = React.forwardRef<TextInput, PhoneStepProps>(
  ({ phone, error, onChangePhone, onContinue }, ref) => (
    <View style={styles.step}>
      <StepHeader
        icon="chatbubble-ellipses-outline"
        title="Bienvenido"
        subtitle="Ingresa tu número de WhatsApp"
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Número de WhatsApp</Text>
        <View style={styles.phoneInputRow}>
          <Text style={styles.countryCode}>+52</Text>
          <View style={styles.phoneDivider} />
          <TextInput
            ref={ref}
            style={styles.input}
            value={phone}
            onChangeText={onChangePhone}
            placeholder="614 XXX XX XX"
            placeholderTextColor={colors.gray700}
            keyboardType="phone-pad"
            autoComplete="tel"
            returnKeyType="done"
            onSubmitEditing={onContinue}
            autoFocus
            accessibilityLabel="Número de WhatsApp"
          />
        </View>
      </View>

      {error ? <ErrorBox message={error} /> : null}

      <PrimaryButton label="Continuar" onPress={onContinue} />
      <Text style={styles.privacyText}>
        Usaremos tu número únicamente para identificar tu acceso.
      </Text>
    </View>
  ),
);

PhoneStep.displayName = 'PhoneStep';

function ResolvingStep() {
  return (
    <View style={[styles.step, styles.centeredStep]}>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={styles.resolvingTitle}>Preparando tu acceso</Text>
      <Text style={styles.subtitle}>Esto tomará solo un momento.</Text>
    </View>
  );
}

function ClientOtpStep({
  phone,
  otp,
  onChangeOtp,
  error,
  isSubmitting,
  onVerify,
  onChangePhone,
}: {
  phone: string;
  otp: string;
  onChangeOtp: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onVerify: () => void;
  onChangePhone: () => void;
}) {
  return (
    <View style={styles.step}>
      <StepHeader
        icon="shield-checkmark-outline"
        title="Verificación de identidad"
        subtitle="Recibirás un código de 6 dígitos por WhatsApp."
      />
      <PhoneSummary phone={phone} />
      <OtpField value={otp} onChangeText={onChangeOtp} />
      {error ? <ErrorBox message={error} /> : null}
      <PrimaryButton
        label="Verificar código"
        onPress={onVerify}
        disabled={otp.length !== 6 || isSubmitting}
        loading={isSubmitting}
      />
      <ChangePhoneButton onPress={onChangePhone} />
    </View>
  );
}

function PasswordStep({
  phone,
  password,
  showPassword,
  onChangePassword,
  onTogglePassword,
  error,
  isSubmitting,
  showPasskey,
  passkeyLoading,
  onLogin,
  onPasskeyLogin,
  onChangePhone,
}: {
  phone: string;
  password: string;
  showPassword: boolean;
  onChangePassword: (value: string) => void;
  onTogglePassword: () => void;
  error: string | null;
  isSubmitting: boolean;
  showPasskey: boolean;
  passkeyLoading: boolean;
  onLogin: () => void;
  onPasskeyLogin: () => void;
  onChangePhone: () => void;
}) {
  return (
    <View style={styles.step}>
      <StepHeader
        icon="lock-closed-outline"
        title="Acceso a tu cuenta"
        subtitle="Ingresa tu contraseña para continuar."
      />
      <PhoneSummary phone={phone} />
      <PasswordField
        label="Contraseña"
        value={password}
        showPassword={showPassword}
        onChangeText={onChangePassword}
        onToggle={onTogglePassword}
        autoComplete="current-password"
      />
      {error ? <ErrorBox message={error} /> : null}
      <PrimaryButton
        label="Entrar"
        onPress={onLogin}
        disabled={!password || isSubmitting}
        loading={isSubmitting}
      />
      {showPasskey ? (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            style={[styles.passkeyButton, passkeyLoading && styles.disabledButton]}
            onPress={onPasskeyLogin}
            disabled={passkeyLoading}
            accessibilityRole="button"
            accessibilityLabel="Entrar con huella o Face ID"
          >
            {passkeyLoading ? (
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
      <ChangePhoneButton onPress={onChangePhone} />
    </View>
  );
}

function SetupStep({
  phone,
  otp,
  password,
  confirmPassword,
  showPassword,
  onChangeOtp,
  onChangePassword,
  onChangeConfirmPassword,
  onTogglePassword,
  error,
  isSubmitting,
  onActivate,
  onChangePhone,
}: {
  phone: string;
  otp: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  onChangeOtp: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onTogglePassword: () => void;
  error: string | null;
  isSubmitting: boolean;
  onActivate: () => void;
  onChangePhone: () => void;
}) {
  return (
    <View style={styles.step}>
      <StepHeader
        icon="key-outline"
        title="Configura tu acceso"
        subtitle="Verifica tu número y crea una contraseña segura."
      />
      <PhoneSummary phone={phone} />
      <OtpField value={otp} onChangeText={onChangeOtp} />
      <PasswordField
        label="Nueva contraseña"
        value={password}
        showPassword={showPassword}
        onChangeText={onChangePassword}
        onToggle={onTogglePassword}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirmar contraseña"
        value={confirmPassword}
        showPassword={showPassword}
        onChangeText={onChangeConfirmPassword}
        onToggle={onTogglePassword}
        autoComplete="new-password"
      />
      {error ? <ErrorBox message={error} /> : null}
      <PrimaryButton
        label="Activar acceso"
        onPress={onActivate}
        disabled={
          otp.length !== 6 ||
          password.length < 8 ||
          password !== confirmPassword ||
          isSubmitting
        }
        loading={isSubmitting}
      />
      <ChangePhoneButton onPress={onChangePhone} />
    </View>
  );
}

function ErrorStep({
  message,
  onRetry,
  onChangePhone,
}: {
  message: string;
  onRetry: () => void;
  onChangePhone: () => void;
}) {
  return (
    <View style={styles.step}>
      <StepHeader
        icon="alert-circle-outline"
        title="No pudimos continuar"
        subtitle={message}
        iconColor={colors.error}
      />
      <PrimaryButton label="Reintentar" onPress={onRetry} />
      <ChangePhoneButton onPress={onChangePhone} />
    </View>
  );
}

function StepHeader({
  icon,
  title,
  subtitle,
  iconColor = colors.gold,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={34} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function PhoneSummary({ phone }: { phone: string }) {
  return (
    <View style={styles.phoneSummary}>
      <Ionicons name="logo-whatsapp" size={18} color={colors.gold} />
      <Text style={styles.phoneSummaryText}>+52 {phone}</Text>
    </View>
  );
}

function OtpField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Código de 6 dígitos</Text>
      <View style={styles.inputRow}>
        <Ionicons name="keypad-outline" size={18} color={colors.gray600} />
        <TextInput
          style={[styles.input, styles.otpInput]}
          value={value}
          onChangeText={(nextValue) =>
            onChangeText(nextValue.replace(/\D/g, '').slice(0, 6))
          }
          placeholder="_ _ _ _ _ _"
          placeholderTextColor={colors.gray700}
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel="Código de verificación"
        />
      </View>
    </View>
  );
}

function PasswordField({
  label,
  value,
  showPassword,
  onChangeText,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  showPassword: boolean;
  onChangeText: (value: string) => void;
  onToggle: () => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.gray600} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="••••••••"
          placeholderTextColor={colors.gray700}
          secureTextEntry={!showPassword}
          autoComplete={autoComplete}
          accessibilityLabel={label}
        />
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={colors.gray500}
          />
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.black} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function ChangePhoneButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.changePhoneButton}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons name="arrow-back-outline" size={16} color={colors.gold} />
      <Text style={styles.changePhoneText}>Cambiar teléfono</Text>
    </TouchableOpacity>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={17} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fullScreenLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.huge,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  centeredStep: {
    alignItems: 'center',
    minHeight: 260,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold + '18',
    marginBottom: spacing.xs,
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
  resolvingTitle: {
    ...typography.h3,
    color: colors.white,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  phoneInputRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  countryCode: {
    ...typography.subtitle,
    color: colors.white,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.gray700,
    marginHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    paddingVertical: spacing.md,
    outlineStyle: 'none',
  } as any,
  otpInput: {
    letterSpacing: 5,
    fontSize: 20,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.gold,
  },
  disabledButton: {
    opacity: 0.35,
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
    ...typography.caption,
    color: colors.gray600,
  },
  passkeyButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  passkeyButtonText: {
    ...typography.button,
    color: colors.gold,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.black,
  },
  privacyText: {
    ...typography.bodySmall,
    color: colors.gray600,
    textAlign: 'center',
  },
  phoneSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
  },
  phoneSummaryText: {
    ...typography.subtitle,
    color: colors.white,
  },
  changePhoneButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  changePhoneText: {
    ...typography.buttonSmall,
    color: colors.gold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.errorLight,
  },
  errorText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.error,
  },
});
