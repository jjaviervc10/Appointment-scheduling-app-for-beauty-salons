import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';

export default function MiniAppSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();

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

          {params.appointmentId ? (
            <View style={styles.receipt}>
              <Text style={styles.receiptLabel}>Folio</Text>
              <Text style={styles.receiptValue}>{params.appointmentId}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/miniapp/booking')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
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
});
