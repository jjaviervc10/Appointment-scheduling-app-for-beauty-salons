import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithInstallState = Navigator & {
  getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform?: string; url?: string }>>;
  standalone?: boolean;
};

const INSTALLED_STORAGE_KEY = 'jl-barber-pwa-installed';

function wasMarkedInstalled() {
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markInstalled() {
  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
  } catch {
    // Some browsers block localStorage in private modes.
  }
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as NavigatorWithInstallState;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

async function isAppAlreadyInstalled() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplay()) return true;
  if (wasMarkedInstalled()) return true;

  const navigatorWithInstallState = window.navigator as NavigatorWithInstallState;
  if (!navigatorWithInstallState.getInstalledRelatedApps) return false;

  try {
    const installedApps = await navigatorWithInstallState.getInstalledRelatedApps();
    return installedApps.length > 0;
  } catch {
    return false;
  }
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
  const [showManualHelp, setShowManualHelp] = useState(false);
  const installHelp = useMemo(() => getInstallHelp(), []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    let isActive = true;

    void isAppAlreadyInstalled().then((installed) => {
      if (!isActive) return;
      setIsInstalled(installed);
      setIsVisible(!installed);
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      markInstalled();
      setIsInstalled(true);
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      isActive = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) {
      setShowManualHelp(true);
      return;
    }

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
            : showManualHelp
              ? installHelp
              : 'Toca el boton para instalarla o ver los pasos rapidos.'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={installApp}
        style={({ pressed }) => [styles.installButton, pressed && styles.pressed]}
      >
        <Ionicons name="download-outline" size={18} color={colors.black} />
        <Text style={styles.installButtonText}>Instalar aplicacion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    minWidth: 220,
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
  pressed: {
    opacity: 0.8,
  },
});
