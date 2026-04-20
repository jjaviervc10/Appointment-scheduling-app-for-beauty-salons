import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  ImageStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

const FEATURES = [
  { icon: 'calendar-outline' as const, title: 'Reserva fácil', desc: 'Elige día y hora\nen segundos' },
  { icon: 'person-outline' as const, title: 'Atención privada', desc: 'Un servicio exclusivo\npara ti' },
  { icon: 'time-outline' as const, title: 'Sin esperas', desc: 'Agenda tu cita y\nevita filas' },
];

/**
 * Splash / Brand Home screen.
 * Premium dark background with gold branding.
 */
export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: useNative,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: useNative,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, useNative]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} bounces={false}>
      {/* ── Dark hero section ── */}
      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require('../assets/LogoMejoradoJMiChipleras2.png')}
            style={styles.logoImage as ImageStyle}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* ── Welcome text ── */}
      <Animated.View style={[styles.welcomeSection, { opacity: fadeAnim }]}>
        <Text style={styles.welcomeTitle}>
          Bienvenida a <Text style={styles.welcomeItalic}>tu mejor versión</Text>
        </Text>
        <Text style={styles.welcomeDesc}>
          Reserva tu cita con Jaquelina López y disfruta{'\n'}de una experiencia personalizada.
        </Text>

        {/* Decorative divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Ionicons name="diamond" size={12} color={colors.gold} />
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>

      {/* ── Features row ── */}
      <Animated.View style={[styles.featuresCard, { opacity: fadeAnim }]}>
        {FEATURES.map((f, i) => (
          <View key={f.title} style={[styles.featureItem, i < FEATURES.length - 1 && styles.featureBorder]}>
            <View style={styles.featureIconCircle}>
              <Ionicons name={f.icon} size={22} color={colors.gold} />
            </View>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}
      </Animated.View>

      {/* ── CTA Buttons ── */}
      <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/(client)/home')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar" size={20} color={colors.black} />
          <Text style={styles.primaryButtonText}>Reservar ahora</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.black} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/(client)/booking')}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={20} color={colors.gold} />
          <Text style={styles.secondaryButtonText}>Ver disponibilidad</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.gold} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ownerButton}
          onPress={() => router.replace('/(owner)/dashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.ownerButtonText}>Panel del estudio</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Trust badge ── */}
      <View style={styles.trustBadge}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.gold} />
        <View style={styles.trustTextBlock}>
          <Text style={styles.trustTitle}>Tu cita está 100% segura</Text>
          <Text style={styles.trustDesc}>Confirmación inmediata por WhatsApp</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
  },

  // Hero
  hero: {
    backgroundColor: colors.black,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 280,
    height: 220,
  },

  // Welcome
  welcomeSection: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeItalic: {
    fontStyle: 'italic',
    color: colors.gold,
  },
  welcomeDesc: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dividerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.gray700,
  },

  // Features
  featuresCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray800,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    ...shadows.card,
    zIndex: 1,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  featureBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.gray600,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  featureTitle: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 12,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
  },

  // Buttons
  buttonsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.black,
    flex: 1,
    fontSize: 17,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.gray900,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.gold,
    flex: 1,
    fontSize: 17,
  },
  ownerButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ownerButtonText: {
    ...typography.bodySmall,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },

  // Trust badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  trustTextBlock: { flex: 1 },
  trustTitle: { ...typography.subtitle, color: colors.white, fontSize: 14 },
  trustDesc: { ...typography.caption, color: colors.gray500, marginTop: 2 },
});
