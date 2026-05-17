import React, { useCallback, useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import { returnToWhatsApp, useMiniAppExitGuard } from '../../src/hooks/useMiniAppExitGuard';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Normalise a phone string to digits-only for wa.me (strips +, spaces, dashes). */
function normalizePhoneForWaMe(phone: string): string {
  return phone.replace(/\D/g, '');
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

  const [waLinkFailed, setWaLinkFailed] = useState(false);

  const handleReturnToWhatsApp = useCallback(async () => {
    if (isWhatsAppReturn && phone) {
      const digits = normalizePhoneForWaMe(phone);
      const waUrl = `https://wa.me/${digits}`;
      try {
        const supported = await Linking.canOpenURL(waUrl);
        if (supported) {
          await Linking.openURL(waUrl);
          return;
        }
      } catch {
        // fall through to returnToWhatsApp
      }
      setWaLinkFailed(true);
      return;
    }
    void returnToWhatsApp(whatsappReturnUrl);
  }, [isWhatsAppReturn, phone, whatsappReturnUrl]);

  useMiniAppExitGuard(handleReturnToWhatsApp);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/LogoJL.png')} style={styles.logo} resizeMode="contain" />
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

          {waLinkFailed ? (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackText}>Puedes volver manualmente al chat de WhatsApp</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={() => void handleReturnToWhatsApp()}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {isWhatsAppReturn ? 'Volver a WhatsApp' : 'Volver al chat de WhatsApp'}
              </Text>
            </TouchableOpacity>
          )}
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
  fallbackBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.gray50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
  },
  fallbackText: { ...typography.body, color: colors.gray600, textAlign: 'center' },
});
