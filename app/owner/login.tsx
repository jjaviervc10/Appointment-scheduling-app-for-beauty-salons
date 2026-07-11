/**
 * Owner access screen.
 * The backend decides whether first-time password setup is required.
 */

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

import { colors, radii, spacing, typography } from '../../src/theme';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useWebAuthn } from '../../src/hooks/useWebAuthn';
import {
  type AuthNextStep,
  getAuthNextStep,
  getOwnerSetupStatus,
  requestOwnerPasswordReset,
  requestOwnerSetup,
  verifyOwnerPasswordReset,
  verifyOwnerSetup,
} from '../../src/services/authApi';
import { clearSessionExit } from '../../src/utils/sessionExit';
import {
  formatMexicanPhoneForDisplay,
  isValidMexicanPhoneInput,
  toMexicanPhoneForAuthApi,
} from '../../src/utils/phone';

type OwnerAccessMode = 'loading' | 'error' | 'setup' | 'login' | 'password_reset';
type SetupStep = 'phone' | 'verify';
type PasswordResetStep = 'phone' | 'verify';

const autoSetupRequestKeys = new Set<string>();
const SETUP_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000;
const OWNER_PASSWORD_RESET_GENERIC_MESSAGE =
  'Si el número es válido, recibirás un código por WhatsApp.';

function getStatus(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

function getOwnerModeFromNextStep(nextStep?: string): Exclude<OwnerAccessMode, 'loading' | 'error'> | null {
  if (nextStep === 'owner_password') return 'login';
  if (nextStep === 'owner_setup') return 'setup';
  return null;
}

function formatRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function OwnerLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; nextStep?: AuthNextStep }>();
  const { loginOwner, setOwnerSession } = useAuthContext();
  const webAuthn = useWebAuthn();

  const [mode, setMode] = useState<OwnerAccessMode>('loading');
  const [setupStep, setSetupStep] = useState<SetupStep>('phone');
  const [passwordResetStep, setPasswordResetStep] = useState<PasswordResetStep>('phone');
  const [phone, setPhone] = useState(() =>
    typeof params.phone === 'string' ? formatMexicanPhoneForDisplay(params.phone) : '',
  );
  const [setupPhone, setSetupPhone] = useState('');
  const [passwordResetPhone, setPasswordResetPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingSetupCode, setIsRequestingSetupCode] = useState(false);
  const [isRequestingPasswordResetCode, setIsRequestingPasswordResetCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [passwordResetNotice, setPasswordResetNotice] = useState<string | null>(null);
  const [setupCodeExpiresAt, setSetupCodeExpiresAt] = useState<number | null>(null);
  const [passwordResetCodeExpiresAt, setPasswordResetCodeExpiresAt] = useState<number | null>(null);
  const [remainingSetupCodeSeconds, setRemainingSetupCodeSeconds] = useState(0);
  const [remainingPasswordResetCodeSeconds, setRemainingPasswordResetCodeSeconds] = useState(0);
  const [passwordLoginFailed, setPasswordLoginFailed] = useState(false);
  const [checkedPasskeys, setCheckedPasskeys] = useState(() => !webAuthn.isSupported);
  const autoSetupRequestInFlightRef = useRef(false);

  const loadSetupStatus = useCallback(async () => {
    if (typeof params.phone === 'string' && isValidMexicanPhoneInput(params.phone)) {
      const authPhone = toMexicanPhoneForAuthApi(params.phone);
      setMode('loading');
      setError(null);

      try {
        const response = await getAuthNextStep(authPhone);
        const ownerModeFromPhone = getOwnerModeFromNextStep(response.nextStep);

        if (ownerModeFromPhone) {
          setMode(ownerModeFromPhone);
          setSetupStep('phone');
          return;
        }

        router.replace({
          pathname: '/client/login',
          params: { phone: authPhone },
        });
        return;
      } catch {
        setMode('error');
        setError('No se pudo consultar el estado de acceso. Revisa tu conexion e intenta de nuevo.');
        return;
      }
    }

    const ownerModeFromNextStep = getOwnerModeFromNextStep(params.nextStep);
    if (ownerModeFromNextStep) {
      setMode(ownerModeFromNextStep);
      setSetupStep('phone');
      setError(null);
      return;
    }

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
  }, [params.nextStep, params.phone, router]);

  useEffect(() => {
    void loadSetupStatus();
  }, [loadSetupStatus]);

  useEffect(() => {
    if (!setupCodeExpiresAt) {
      setRemainingSetupCodeSeconds(0);
      return;
    }

    const expiresAt = setupCodeExpiresAt;

    function updateRemainingTime() {
      setRemainingSetupCodeSeconds(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
    }

    updateRemainingTime();
    const intervalId = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, [setupCodeExpiresAt]);

  useEffect(() => {
    if (!passwordResetCodeExpiresAt) {
      setRemainingPasswordResetCodeSeconds(0);
      return;
    }

    const expiresAt = passwordResetCodeExpiresAt;

    function updateRemainingTime() {
      setRemainingPasswordResetCodeSeconds(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
    }

    updateRemainingTime();
    const intervalId = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, [passwordResetCodeExpiresAt]);

  useEffect(() => {
    if (mode !== 'login' && mode !== 'setup' && mode !== 'password_reset') return;

    if (webAuthn.isSupported) {
      webAuthn.checkPasskeys().finally(() => setCheckedPasskeys(true));
    } else {
      setCheckedPasskeys(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, webAuthn.isSupported]);

  const handleLogin = useCallback(async () => {
    const phoneVal = toMexicanPhoneForAuthApi(phone);
    const passwordVal = password;

    if (!isValidMexicanPhoneInput(phone) || !passwordVal) {
      setError('Ingresa tu teléfono y contraseña.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPasswordLoginFailed(false);

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
      } else if (status && status >= 500) {
        setError('No pudimos iniciar sesión por un problema del servidor. Intenta más tarde.');
      } else {
        setPasswordLoginFailed(true);
        setError('No pudimos iniciar sesión con esa contraseña.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, password, loginOwner, router]);

  const requestSetupCode = useCallback(async (options?: {
    successMessage?: string;
    validateNextStep?: boolean;
  }) => {
    if (isSubmitting || isRequestingSetupCode) {
      return false;
    }

    const phoneVal = toMexicanPhoneForAuthApi(phone);
    const validateNextStep = options?.validateNextStep ?? true;
    const successMessage =
      options?.successMessage ?? 'Te enviamos un código de verificación por WhatsApp.';

    if (!isValidMexicanPhoneInput(phone)) {
      setError('Ingresa tu teléfono.');
      return false;
    }

    setIsRequestingSetupCode(true);
    setError(null);
    setSetupNotice(null);
    setCode('');
    setPassword('');
    setConfirmPassword('');

    try {
      if (validateNextStep) {
        const response = await getAuthNextStep(phoneVal);

        if (response.nextStep === 'owner_password') {
          setMode('login');
          setSetupStep('phone');
          return false;
        }

        if (response.nextStep !== 'owner_setup') {
          router.replace({
            pathname: '/client/login',
            params: { phone: phoneVal },
          });
          return false;
        }
      }

      await requestOwnerSetup(phoneVal);
      setSetupPhone(phoneVal);
      setSetupStep('verify');
      setSetupCodeExpiresAt(Date.now() + SETUP_CODE_TTL_MS);
      setSetupNotice(successMessage);
      return true;
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 409) {
        setError('La configuracion inicial ya fue completada.');
        setMode('login');
      } else if (status === 429) {
        setError('Espera unos minutos antes de solicitar otro código.');
      } else if (status && status >= 500) {
        setError('No se pudo enviar el código. El servicio de mensajes no está disponible en este momento.');
      } else {
        setError('Revisa los datos ingresados.');
      }
      return false;
    } finally {
      setIsRequestingSetupCode(false);
    }
  }, [isRequestingSetupCode, isSubmitting, phone, router]);

  const handleSetupRequest = useCallback(async () => {
    await requestSetupCode({
      successMessage: 'Te enviamos un nuevo código por WhatsApp.',
      validateNextStep: true,
    });
  }, [requestSetupCode]);

  useEffect(() => {
    if (params.nextStep !== 'owner_setup') return;
    if (mode !== 'setup' || setupStep !== 'phone') return;
    if (autoSetupRequestInFlightRef.current) return;
    if (!isValidMexicanPhoneInput(phone)) return;

    const phoneVal = toMexicanPhoneForAuthApi(phone);
    const requestKey = `owner_setup:${phoneVal}`;

    if (autoSetupRequestKeys.has(requestKey)) return;

    autoSetupRequestKeys.add(requestKey);
    autoSetupRequestInFlightRef.current = true;

    void requestSetupCode({
      successMessage: 'Te enviamos un código de verificación por WhatsApp.',
      validateNextStep: false,
    }).then((sent) => {
      if (!sent) {
        autoSetupRequestKeys.delete(requestKey);
      }
      autoSetupRequestInFlightRef.current = false;
    });
  }, [mode, params.nextStep, phone, requestSetupCode, setupStep]);

  const handleSetupVerify = useCallback(async () => {
    const codeVal = code.trim();
    const passwordVal = password;

    if (setupCodeExpiresAt && Date.now() >= setupCodeExpiresAt) {
      setError('El código venció o no es válido. Solicita uno nuevo para continuar.');
      return;
    }

    if (!/^\d{6}$/.test(codeVal)) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    if (passwordVal.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordVal !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSetupNotice(null);

    try {
      const session = await verifyOwnerSetup(setupPhone, codeVal, passwordVal);
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      router.replace('/owner/dashboard');
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 400 || status === 401) {
        setSetupCodeExpiresAt(Date.now());
        setError('El código venció o no es válido. Solicita uno nuevo para continuar.');
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
  }, [code, password, confirmPassword, setupCodeExpiresAt, setupPhone, setOwnerSession, router]);

  const startPasswordReset = useCallback(() => {
    setMode('password_reset');
    setPasswordResetStep('phone');
    setError(null);
    setPasswordResetNotice(null);
    setPasswordResetCodeExpiresAt(null);
    setCode('');
    setPassword('');
    setConfirmPassword('');
  }, []);

  const handlePasswordResetRequest = useCallback(async () => {
    if (isSubmitting || isRequestingPasswordResetCode) {
      return;
    }

    const phoneVal = toMexicanPhoneForAuthApi(phone);

    if (!isValidMexicanPhoneInput(phone)) {
      setError('Ingresa tu teléfono.');
      return;
    }

    setIsRequestingPasswordResetCode(true);
    setError(null);
    setPasswordResetNotice(null);
    setCode('');
    setPassword('');
    setConfirmPassword('');

    try {
      await requestOwnerPasswordReset(phoneVal);
      setPasswordResetPhone(phoneVal);
      setPasswordResetStep('verify');
      setPasswordResetCodeExpiresAt(Date.now() + PASSWORD_RESET_CODE_TTL_MS);
      setPasswordResetNotice(OWNER_PASSWORD_RESET_GENERIC_MESSAGE);
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 401) {
        setError('No pudimos autorizar la solicitud. Vuelve a intentar.');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos.');
      } else if (status && status >= 500) {
        setError('No pudimos enviar el código por un problema del servidor.');
      } else if (!status) {
        setError('No pudimos conectar con el backend. Revisa tu conexión e intenta nuevamente.');
      } else {
        setError('No pudimos solicitar el código. Intenta nuevamente.');
      }
    } finally {
      setIsRequestingPasswordResetCode(false);
    }
  }, [isRequestingPasswordResetCode, isSubmitting, phone]);

  const handlePasswordResetVerify = useCallback(async () => {
    const codeVal = code.trim();
    const passwordVal = password;

    if (passwordResetCodeExpiresAt && Date.now() >= passwordResetCodeExpiresAt) {
      setError('Código inválido o expirado.');
      return;
    }

    if (!/^\d{6}$/.test(codeVal)) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    if (passwordVal.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordVal !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPasswordResetNotice(null);

    try {
      const session = await verifyOwnerPasswordReset(passwordResetPhone, codeVal, passwordVal);
      await setOwnerSession(session.token, session.owner, session.expiresAt);
      clearSessionExit();
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setPasswordResetPhone('');
      setPasswordResetNotice(null);
      setPasswordResetCodeExpiresAt(null);
      router.replace('/owner/dashboard');
    } catch (err: unknown) {
      const status = getStatus(err);
      if (status === 401) {
        setError('Código inválido o expirado.');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos.');
      } else if (status && status >= 500) {
        setError('No pudimos guardar la nueva contraseña por un problema del servidor.');
      } else if (!status) {
        setError('No pudimos conectar con el backend. Revisa tu conexión e intenta nuevamente.');
      } else {
        setError('No pudimos completar la recuperación. Revisa los datos.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    code,
    confirmPassword,
    password,
    passwordResetCodeExpiresAt,
    passwordResetPhone,
    router,
    setOwnerSession,
  ]);

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

  const goBackToPasswordResetPhone = useCallback(() => {
    setPasswordResetStep('phone');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setPasswordResetNotice(null);
    setPasswordResetCodeExpiresAt(null);
    setError(null);
  }, []);

  const goBackToLogin = useCallback(() => {
    setMode('login');
    setPasswordResetStep('phone');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setPasswordResetNotice(null);
    setPasswordResetCodeExpiresAt(null);
    setError(null);
  }, []);

  const showPasskeyButton =
    (mode === 'login' ||
      (mode === 'setup' && setupStep === 'phone') ||
      (mode === 'password_reset' && passwordResetStep === 'phone')) &&
    checkedPasskeys &&
    webAuthn.isSupported &&
    webAuthn.hasPasskeys === true;

  const displayError =
    error ??
    ((mode === 'login' || mode === 'setup' || mode === 'password_reset')
      ? webAuthn.error
      : null);
  const isSetupCodeExpired =
    mode === 'setup' &&
    setupStep === 'verify' &&
    setupCodeExpiresAt !== null &&
    remainingSetupCodeSeconds <= 0;
  const setupCodeTimerText =
    mode === 'setup' && setupStep === 'verify' && setupCodeExpiresAt !== null
      ? isSetupCodeExpired
        ? 'El código venció. Solicita uno nuevo.'
        : `El código vence en ${formatRemainingTime(remainingSetupCodeSeconds)}`
      : null;
  const setupRequestButtonLabel =
    params.nextStep === 'owner_setup' && isValidMexicanPhoneInput(phone)
      ? 'Reintentar envío de código'
      : 'Enviar código';
  const isPasswordResetCodeExpired =
    mode === 'password_reset' &&
    passwordResetStep === 'verify' &&
    passwordResetCodeExpiresAt !== null &&
    remainingPasswordResetCodeSeconds <= 0;
  const isPasswordResetPhoneStep = mode === 'password_reset' && passwordResetStep === 'phone';
  const isPasswordResetVerifyStep = mode === 'password_reset' && passwordResetStep === 'verify';
  const isPasswordResetVerifyReady =
    /^\d{6}$/.test(code.trim()) &&
    password.length >= 8 &&
    password === confirmPassword;
  const isPasswordResetActionBlocked =
    (isPasswordResetPhoneStep && !isValidMexicanPhoneInput(phone)) ||
    (isPasswordResetVerifyStep && !isPasswordResetVerifyReady);
  const passwordResetCodeTimerText =
    mode === 'password_reset' && passwordResetStep === 'verify' && passwordResetCodeExpiresAt !== null
      ? isPasswordResetCodeExpired
        ? 'El código venció. Solicita uno nuevo.'
        : `El código vence en ${formatRemainingTime(remainingPasswordResetCodeSeconds)}`
      : null;
  const isBusy = isSubmitting || isRequestingSetupCode || isRequestingPasswordResetCode;
  const primaryActionDisabled =
    isBusy || isSetupCodeExpired || isPasswordResetCodeExpired || isPasswordResetActionBlocked;
  const isPrimaryActionLoading =
    isSubmitting ||
    (mode === 'setup' && setupStep === 'phone' && isRequestingSetupCode) ||
    (mode === 'password_reset' &&
      passwordResetStep === 'phone' &&
      isRequestingPasswordResetCode);
  const setupFieldsEditable = !isBusy;
  const passwordResetFieldsEditable = !isBusy;
  const headerIcon =
    mode === 'setup'
      ? 'shield-checkmark-outline'
      : mode === 'password_reset'
        ? 'refresh-circle-outline'
        : 'key-outline';
  const headerTitle =
    mode === 'setup'
      ? 'Configurar acceso de duena'
      : mode === 'password_reset'
        ? 'Recuperar contraseña'
        : 'Panel del estudio';
  const headerSubtitle =
    mode === 'setup'
      ? 'Crea tu contraseña con verificación por WhatsApp'
      : mode === 'password_reset'
        ? 'Crea una nueva contraseña con código por WhatsApp'
        : 'Acceso exclusivo para la propietaria';
  const primaryAction =
    mode === 'setup'
      ? setupStep === 'phone'
        ? handleSetupRequest
        : handleSetupVerify
      : mode === 'password_reset'
        ? passwordResetStep === 'phone'
          ? handlePasswordResetRequest
          : handlePasswordResetVerify
        : handleLogin;
  const primaryActionLabel =
    mode === 'setup'
      ? setupStep === 'phone'
        ? setupRequestButtonLabel
        : 'Configurar acceso'
      : mode === 'password_reset'
        ? passwordResetStep === 'phone'
          ? 'Enviar código'
          : 'Guardar nueva contraseña'
        : 'Iniciar sesión';

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
            <Ionicons name={headerIcon} size={36} color={colors.gold} />
          </View>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
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
            {mode === 'password_reset' && passwordResetStep === 'verify' ? (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.info} />
                  <View style={styles.infoTextBlock}>
                    <Text style={styles.infoText}>
                      {passwordResetNotice ?? OWNER_PASSWORD_RESET_GENERIC_MESSAGE}
                    </Text>
                    {passwordResetCodeTimerText ? (
                      <Text style={isPasswordResetCodeExpired ? styles.expiredText : styles.timerText}>
                        {passwordResetCodeTimerText}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Field
                  icon="keypad-outline"
                  label="Código de 6 dígitos"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  editable={passwordResetFieldsEditable}
                  onSubmitEditing={handlePasswordResetVerify}
                />

                <PasswordField
                  label="Nueva contraseña"
                  value={password}
                  onChangeText={setPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={passwordResetFieldsEditable}
                />

                <PasswordField
                  label="Confirmar contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={passwordResetFieldsEditable}
                  onSubmitEditing={handlePasswordResetVerify}
                />
              </>
            ) : mode === 'setup' && setupStep === 'verify' ? (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.info} />
                  <View style={styles.infoTextBlock}>
                    <Text style={styles.infoText}>
                      {setupNotice ?? 'Te enviamos un código de verificación por WhatsApp.'}
                    </Text>
                    {setupCodeTimerText ? (
                      <Text style={isSetupCodeExpired ? styles.expiredText : styles.timerText}>
                        {setupCodeTimerText}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Field
                  icon="keypad-outline"
                  label="Código de 6 dígitos"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  editable={setupFieldsEditable}
                  onSubmitEditing={handleSetupVerify}
                />

                <PasswordField
                  label="Nueva contraseña"
                  value={password}
                  onChangeText={setPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={setupFieldsEditable}
                />

                <PasswordField
                  label="Confirmar contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  editable={setupFieldsEditable}
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
                  placeholder="+52 614 215 4006"
                  keyboardType="phone-pad"
                  editable={!isBusy}
                  onSubmitEditing={
                    mode === 'setup'
                      ? handleSetupRequest
                      : mode === 'password_reset'
                        ? handlePasswordResetRequest
                        : undefined
                  }
                  accessibilityLabel="Telefono de la propietaria"
                />

                {mode === 'login' ? (
                  <PasswordField
                    label="Contrasena"
                    value={password}
                    onChangeText={setPassword}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((value) => !value)}
                    editable={!isBusy}
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
              style={[styles.loginButton, primaryActionDisabled && styles.buttonDisabled]}
              onPress={primaryAction}
              disabled={primaryActionDisabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={primaryActionLabel}
            >
              {isPrimaryActionLoading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.loginButtonText}>{primaryActionLabel}</Text>
              )}
            </TouchableOpacity>

            {mode === 'login' ? (
              <>
                {passwordLoginFailed ? (
                  <Text style={styles.recoveryHint}>
                    Si no tienes contraseña o no la recuerdas, puedes crear una nueva con WhatsApp.
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={startPasswordReset}
                  accessibilityRole="button"
                  accessibilityLabel="Recuperar contraseña"
                  disabled={isBusy}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.gold} />
                  <Text style={styles.resendLinkText}>
                    {passwordLoginFailed ? 'Crear nueva contraseña' : 'Recuperar contraseña'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {mode === 'password_reset' && passwordResetStep === 'verify' ? (
              <>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={handlePasswordResetRequest}
                  accessibilityRole="button"
                  accessibilityLabel="Reenviar código"
                  disabled={isBusy}
                >
                  {isRequestingPasswordResetCode ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Ionicons name="refresh-outline" size={16} color={colors.gold} />
                  )}
                  <Text style={styles.resendLinkText}>
                    {isRequestingPasswordResetCode ? 'Reenviando...' : 'Reenviar código'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={goBackToPasswordResetPhone}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a teléfono"
                  disabled={isBusy}
                >
                  <Ionicons name="arrow-back-outline" size={16} color={colors.gray500} />
                  <Text style={styles.backLinkText}>Volver al teléfono</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {mode === 'password_reset' ? (
              <TouchableOpacity
                style={styles.backLink}
                onPress={goBackToLogin}
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                disabled={isBusy}
              >
                <Ionicons name="log-in-outline" size={16} color={colors.gray500} />
                <Text style={styles.backLinkText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            ) : null}

            {mode === 'setup' && setupStep === 'verify' ? (
              <>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={handleSetupRequest}
                  accessibilityRole="button"
                  accessibilityLabel="Reenviar código"
                  disabled={isBusy}
                >
                  {isRequestingSetupCode ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Ionicons name="refresh-outline" size={16} color={colors.gold} />
                  )}
                  <Text style={styles.resendLinkText}>
                    {isRequestingSetupCode ? 'Reenviando...' : 'Reenviar código'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={goBackToSetupPhone}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a teléfono"
                  disabled={isBusy}
                >
                  <Ionicons name="arrow-back-outline" size={16} color={colors.gray500} />
                  <Text style={styles.backLinkText}>Volver al teléfono</Text>
                </TouchableOpacity>
              </>
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
  },
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
  infoTextBlock: {
    flex: 1,
    gap: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },
  timerText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '600',
  },
  expiredText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
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
  recoveryHint: {
    color: colors.gray500,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
  resendLinkText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
});
