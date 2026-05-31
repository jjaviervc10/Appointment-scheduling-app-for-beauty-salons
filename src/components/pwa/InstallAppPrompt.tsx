import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getInstallHelp() {
  if (typeof navigator === 'undefined') {
    return 'Abre el menu del navegador y elige instalar o agregar a pantalla de inicio.';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  if (isIOS) {
    return 'iPhone/Safari: toca Compartir y luego Agregar a pantalla de inicio.';
  }

  if (isAndroid) {
    return 'Android/Chrome: abre el menu de tres puntos y toca Instalar app.';
  }

  return 'En Chrome o Edge: abre el menu del navegador y elige Instalar app.';
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const installHelp = useMemo(() => getInstallHelp(), []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    setIsInstalled(isStandaloneDisplay());
    setIsVisible(!isStandaloneDisplay());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }, [installPrompt]);

  if (Platform.OS !== 'web' || isInstalled || !isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Instala Barber Studio</Text>
        <Text style={styles.help}>
          {installPrompt
            ? 'Guarda esta agenda como app en tu dispositivo.'
            : installHelp}
        </Text>
      </View>

      {installPrompt ? (
        <Pressable
          accessibilityRole="button"
          onPress={installApp}
          style={({ pressed }) => [styles.installButton, pressed && styles.pressed]}
        >
          <Ionicons name="download-outline" size={18} color={colors.black} />
          <Text style={styles.installButtonText}>Instalar app</Text>
        </Pressable>
      ) : (
        <View style={styles.helpBadge}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.gold} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    ...shadows.card,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.subtitle,
    color: colors.white,
    fontSize: 14,
  },
  help: {
    ...typography.bodySmall,
    color: colors.gray400,
  },
  installButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.gold,
  },
  installButtonText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
  helpBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    backgroundColor: colors.gold + '12',
  },
  pressed: {
    opacity: 0.8,
  },
});
