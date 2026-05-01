import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';

export default function MiniAppSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string }>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Solicitud enviada</Text>
        <Text style={styles.subtitle}>Tu cita queda pendiente de aprobacion.</Text>
        <Text style={styles.message}>Te avisaremos por WhatsApp cuando sea aprobada.</Text>

        {params.appointmentId ? (
          <Text style={styles.meta}>Folio: {params.appointmentId}</Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/miniapp/booking')} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Solicitar otra cita</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.h2, color: colors.white, textAlign: 'center' },
  subtitle: { ...typography.subtitle, color: colors.gold, textAlign: 'center' },
  message: { ...typography.body, color: colors.gray300, textAlign: 'center' },
  meta: { ...typography.caption, color: colors.gray500, textAlign: 'center' },
  button: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  buttonText: { ...typography.button, color: colors.black },
});
