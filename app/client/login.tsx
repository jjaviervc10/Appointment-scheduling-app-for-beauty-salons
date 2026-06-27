/**
 * Client login screen — OTP via WhatsApp.
 * Step 1: Enter phone → request OTP.
 * Step 2: Enter 6-digit code → verify → session granted.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { clearSessionExit } from '../../src/utils/sessionExit';
import { getAuthNextStep } from '../../src/services/authApi';
import {
  formatMexicanPhoneForDisplay,
  getMexicanPhoneLocalDigits,
  toMexicanPhoneForAuthApi,
} from '../../src/utils/phone';

type Step = 'phone' | 'code';

export default function ClientLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; intent?: string }>();
  const { requestOtp, verifyOtp } = useAuthContext();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(() =>
    typeof params.phone === 'string' ? getMexicanPhoneLocalDigits(params.phone) : '',
  );
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneSentTo, setPhoneSentTo] = useState('');

  const codeInputRef = useRef<TextInput>(null);

  // ── Step 1: request OTP ──────────────────────────────────────

  const handleRequestOtp = useCallback(async () => {
    const localDigits = getMexicanPhoneLocalDigits(phone);

    if (localDigits.length !== 10) {
      setError('Ingresa un número de teléfono válido.');
      return;
    }

    const authPhone = toMexicanPhoneForAuthApi(localDigits);

    setIsLoading(true);
    setError(null);

    try {
      const response = await getAuthNextStep(authPhone);

      if (response.nextStep === 'owner_password' || response.nextStep === 'owner_setup') {
        router.replace({
          pathname: '/owner/login',
          params: { phone: authPhone, nextStep: response.nextStep },
        });
        return;
      }

      await requestOtp(authPhone);
      setPhone(localDigits);
      setPhoneSentTo(authPhone);
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 200);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 429) {
        setError('Demasiados intentos. Espera un momento antes de volver a intentarlo.');
      } else if (e.status === 400) {
        setError('Número de teléfono no válido.');
      } else {
        setError('No se pudo enviar el código. Verifica tu internet e intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [phone, requestOtp, router]);

  // ── Step 2: verify OTP ───────────────────────────────────────

  const handleVerifyOtp = useCallback(async () => {
    const codeVal = code.trim();

    if (codeVal.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verifyOtp(phoneSentTo, codeVal);
      clearSessionExit();
      router.replace(params.intent === 'booking' ? '/client/booking' : '/client/appointments');
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 429) {
        setError('Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
      } else {
        // 401, 400 — always same message
        setError('Código incorrecto o expirado. Solicita uno nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [code, params.intent, phoneSentTo, verifyOtp, router]);

  // ── Go back to phone step ────────────────────────────────────

  const handleRetry = useCallback(() => {
    setStep('phone');
    setCode('');
    setError(null);
  }, []);

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
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.gold} />
          </View>
          <Text style={styles.title}>
            {step === 'phone' ? 'Acceder a mis citas' : 'Ingresa el código'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Recibirás un código de verificación por WhatsApp'
              : `Enviamos un código al número ${formatMexicanPhoneForDisplay(phoneSentTo)}`}
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>

          {step === 'phone' ? (
            /* ── Phone input ── */
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
                  onChangeText={(v) => setPhone(getMexicanPhoneLocalDigits(v))}
                  placeholder="614 000 0000"
                  placeholderTextColor={colors.gray700}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  returnKeyType="done"
                  onSubmitEditing={handleRequestOtp}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="Número de teléfono"
                />
              </View>
            </View>
          ) : (
            /* ── Code input ── */
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Código de 6 dígitos</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={colors.gray600}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={codeInputRef}
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor={colors.gray700}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="Código de verificación"
                />
              </View>
            </View>
          )}

          {/* Always-visible info note (step 1 and after sending) */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              Si el número es válido, recibirás un código por WhatsApp en breve.
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={step === 'phone' ? handleRequestOtp : handleVerifyOtp}
            disabled={isLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step === 'phone' ? 'Enviar código' : 'Verificar'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Retry link in step 2 */}
          {step === 'code' ? (
            <TouchableOpacity
              style={styles.retryLink}
              onPress={handleRetry}
              accessibilityRole="button"
            >
              <Text style={styles.retryLinkText}>Cambiar número o reenviar código</Text>
            </TouchableOpacity>
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
    lineHeight: 22,
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
  codeInput: {
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: '700',
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

  primaryButton: {
    height: 52,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  retryLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  retryLinkText: {
    color: colors.gold,
    fontSize: 14,
    textDecorationLine: 'underline',
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
