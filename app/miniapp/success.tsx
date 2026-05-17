import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import { returnToWhatsApp, useMiniAppExitGuard } from '../../src/hooks/useMiniAppExitGuard';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Strip all non-digit characters so the phone can be appended to a wa.me URL. */
function normalizePhoneForWaMe(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Build the best WhatsApp URL available from the params passed to success.
 *
 * Priority:
 *  1. returnUrl / waReturnUrl — an explicit deep-link supplied by the backend
 *  2. phone               — construct https://wa.me/<digits>
 *  3. (none)              — returnToWhatsApp() will fall back to whatsapp://
 */
function buildWhatsAppTarget(returnUrl: string, phone: string): string | undefined {
  if (returnUrl) return returnUrl; // validated inside returnToWhatsApp/getSafeWhatsAppUrl
  if (phone) {
    const digits = normalizePhoneForWaMe(phone);
    if (digits) return `https://wa.me/${digits}`;
  }
  return undefined;
}

export default function MiniAppSuccessScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string | string[];
    returnUrl?: string | string[];
    waReturnUrl?: string | string[];
    returnTo?: string | string[];
    phone?: string | string[];
  }>();

  const appointmentId = firstParam(params.appointmentId);
  const whatsappReturnUrl = firstParam(params.returnUrl).trim() || firstParam(params.waReturnUrl).trim();
  const returnTo = firstParam(params.returnTo).trim();
  const phone = firstParam(params.phone).trim();

  const isWhatsAppReturn = returnTo === 'whatsapp';

  // Shown after 2.5 s if the user is still on the page (WhatsApp may not have opened).
  const [showFallbackHint, setShowFallbackHint] = useState(false);

  const handleReturnToWhatsApp = useCallback(() => {
    const target = buildWhatsAppTarget(whatsappReturnUrl, phone);
    // returnToWhatsApp uses openViaAnchor on web (works in Chrome Custom Tab)
    // and Linking.openURL on native. Both handle https://wa.me/ and whatsapp:// correctly.
    void returnToWhatsApp(target);

    // If the user is still on the page 2.5 s later, WhatsApp may not have opened.
    // Show a hint so they know they can return manually.
    setTimeout(() => setShowFallbackHint(true), 2500);
  }, [whatsappReturnUrl, phone]);

  useMiniAppExitGuard(handleReturnToWhatsApp);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo-whatsapp.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>

          <Text style={styles.title}>Solicitud enviada</Text>
          <Text style={styles.subtitle}>Tu cita queda pendiente de aprobación</Text>
          <Text style={styles.message}>Te avisaremos por WhatsApp cuando sea aprobada</Text>

          {appointmentId ? (
            <View style={styles.receipt}>
              <Text style={styles.receiptLabel}>Folio</Text>
              <Text style={styles.receiptValue}>{appointmentId}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleReturnToWhatsApp}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isWhatsAppReturn ? 'Volver al chat de WhatsApp' : 'Finalizar'}
            </Text>
          </TouchableOpacity>

          {showFallbackHint ? (
            <Text style={styles.fallbackHint}>
              Si WhatsApp no se abre automáticamente, vuelve manualmente al chat.
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logo: { width: 42, height: 42 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 40, fontWeight: '700', color: colors.black },
  title: { ...typography.h2, color: colors.black, textAlign: 'center' },
  subtitle: { ...typography.subtitle, color: colors.goldDark, textAlign: 'center' },
  message: { ...typography.body, color: colors.gray600, textAlign: 'center' },
  receipt: {
    alignSelf: 'stretch',
    backgroundColor: colors.gray50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    gap: spacing.xs,
  },
  receiptLabel: { ...typography.caption, color: colors.gray500, textAlign: 'center' },
  receiptValue: { ...typography.caption, color: colors.gray700, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    minHeight: 60,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  buttonText: { ...typography.button, color: colors.black },
  fallbackHint: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
