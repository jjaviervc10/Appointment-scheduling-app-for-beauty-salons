import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../src/theme';

/**
 * Splash / Brand Home screen.
 * Premium dark background with gold branding.
 * Dual entry points: client booking or owner panel.
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
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Brand Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require('../assets/LogoMejoradoJMiChipleras2.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Entry Buttons */}
        <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(client)/home')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Reservar ahora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(owner)/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Panel del estudio</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom decorative lines */}
      <View style={styles.bottomDecor}>
        <View style={styles.decorLine} />
        <View style={[styles.decorLine, styles.decorLineShort]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.huge,
  },
  logoImage: {
    width: 260,
    height: 200,
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.black,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.gray600,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.gray400,
  },
  bottomDecor: {
    alignItems: 'center',
    paddingBottom: spacing.xxxl,
    gap: spacing.xs,
  },
  decorLine: {
    width: 60,
    height: 1,
    backgroundColor: colors.gray800,
  },
  decorLineShort: {
    width: 30,
  },
});
