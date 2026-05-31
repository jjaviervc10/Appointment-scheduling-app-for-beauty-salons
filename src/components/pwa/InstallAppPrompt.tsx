import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallState = 'idle' | 'checking' | 'prompting' | 'installing' | 'installed' | 'manual';

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

function getOpenInstalledHelp() {
  if (typeof navigator === 'undefined') {
    return 'Busca Barber Studio entre tus aplicaciones instaladas.';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  if (isIOS) {
    return 'La app queda en tu pantalla de inicio. Busca el icono Barber Studio y abrelo desde ahi.';
  }

  if (isAndroid) {
    return 'La app queda en tu pantalla de inicio o cajon de apps. Tambien puedes tocar Abrir en aplicacion si Chrome lo muestra arriba.';
  }

  return 'Chrome puede mostrar Abrir en aplicacion en la barra superior. Si no, busca Barber Studio en tus aplicaciones.';
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [progress, setProgress] = useState(0);
  const [showOpenHelp, setShowOpenHelp] = useState(false);
  const installHelp = useMemo(() => getInstallHelp(), []);
  const openInstalledHelp = useMemo(() => getOpenInstalledHelp(), []);

  const completeAsInstalled = useCallback(() => {
    markInstalled();
    setInstallPrompt(null);
    setProgress(100);
    setShowOpenHelp(false);
    setInstallState('installed');
    setIsVisible(true);
  }, []);

  const showManualInstallHelp = useCallback(() => {
    setProgress(100);
    setInstallState('manual');
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    let isActive = true;

    void isAppAlreadyInstalled().then((installed) => {
      if (!isActive) return;
      setInstallState(installed ? 'installed' : 'idle');
      setProgress(installed ? 100 : 0);
      setIsVisible(!isStandaloneDisplay());
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
      setInstallState('idle');
      setProgress(0);
    };

    const handleAppInstalled = () => {
      completeAsInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      isActive = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [completeAsInstalled]);

  useEffect(() => {
    if (installState === 'idle' || installState === 'manual' || installState === 'installed') {
      return undefined;
    }

    const maxProgress = installState === 'checking' ? 76 : installState === 'prompting' ? 48 : 92;
    const intervalId = window.setInterval(() => {
      setProgress((current) => Math.min(current + 8, maxProgress));
    }, 180);

    return () => window.clearInterval(intervalId);
  }, [installState]);

  const installApp = useCallback(async () => {
    if (installState === 'installed') {
      if (showOpenHelp) {
        setIsVisible(false);
        return;
      }

      setShowOpenHelp(true);
      return;
    }

    if (!installPrompt) {
      setInstallState('checking');
      setProgress(18);
      window.setTimeout(showManualInstallHelp, 650);
      return;
    }

    setInstallState('prompting');
    setProgress(28);

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);

    setInstallPrompt(null);

    if (choice?.outcome === 'accepted') {
      setInstallState('installing');
      setProgress(72);
      window.setTimeout(() => {
        completeAsInstalled();
      }, 1800);
      return;
    }

    showManualInstallHelp();
  }, [completeAsInstalled, installPrompt, installState, showManualInstallHelp, showOpenHelp]);

  if (Platform.OS !== 'web' || isStandaloneDisplay() || !isVisible) {
    return null;
  }

  const isBusy =
    installState === 'checking' || installState === 'prompting' || installState === 'installing';
  const isInstalledState = installState === 'installed';
  const title = isInstalledState ? 'Aplicacion instalada' : 'Instala Barber Studio';
  const iconName = isInstalledState ? 'checkmark-circle-outline' : 'download-outline';
  const iconColor = isInstalledState ? colors.gold : colors.black;
  const buttonText = isBusy
    ? 'Instalando...'
    : isInstalledState
      ? showOpenHelp
        ? 'Entendido'
        : 'Como abrirla'
      : 'Instalar aplicacion';
  const helpText = isInstalledState
    ? showOpenHelp
      ? openInstalledHelp
      : 'Listo. Se instalo correctamente. Puedes abrirla desde el icono instalado en tu dispositivo.'
    : installState === 'checking'
      ? 'Verificando si tu navegador permite instalacion directa...'
      : installState === 'prompting'
        ? 'Confirma la instalacion en la ventana del navegador.'
        : installState === 'installing'
          ? 'Instalando la app en tu dispositivo...'
          : installState === 'manual'
            ? installHelp
            : 'Toca el boton para instalarla o ver los pasos rapidos.';

  return (
    <View style={[styles.container, isInstalledState && styles.containerSuccess]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.help}>{helpText}</Text>
        {progress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={installApp}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.installButton,
          isInstalledState && styles.installedButton,
          isBusy && styles.disabledButton,
          pressed && !isBusy && styles.pressed,
        ]}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text style={[styles.installButtonText, isInstalledState && styles.installedButtonText]}>
          {buttonText}
        </Text>
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
  containerSuccess: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '12',
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
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radii.full,
    backgroundColor: colors.gray800,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
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
  installedButton: {
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.gray900,
  },
  installedButtonText: {
    color: colors.gold,
  },
  disabledButton: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
});
