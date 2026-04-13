import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { MOCK_SERVICES } from '../../src/services/mock-data';

export default function ClientHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Dark branded header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/LogoJL.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerSubtitle}>Bienvenida a</Text>
          <Text style={styles.headerTitle}>Jaquelina López</Text>
          <Text style={styles.headerBadge}>BARBER STUDIO</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick booking CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => router.push('/(client)/booking')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaTitle}>Reservar cita</Text>
          <Text style={styles.ctaSubtitle}>Elige servicio, fecha y horario</Text>
        </TouchableOpacity>

        {/* Services preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros servicios</Text>
          {MOCK_SERVICES.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDesc}>{service.description}</Text>
              </View>
              <View style={styles.serviceMeta}>
                <Text style={styles.servicePrice}>
                  ${service.price?.toLocaleString()}
                </Text>
                <Text style={styles.serviceDuration}>{service.duration_minutes} min</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerLogo: { width: 56, height: 56 },
  headerTextBlock: { flex: 1 },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginBottom: spacing.xxs,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerBadge: {
    ...typography.caption,
    color: colors.gold,
    letterSpacing: 3,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  ctaCard: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  ctaTitle: {
    ...typography.h2,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    ...typography.body,
    color: colors.gray800,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  serviceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceName: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  serviceDesc: {
    ...typography.bodySmall,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  serviceMeta: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    ...typography.subtitle,
    color: colors.gold,
  },
  serviceDuration: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  logoutText: {
    ...typography.subtitle,
    color: colors.error,
  },
});
