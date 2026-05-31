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

type InstallGuide = {
  manualHelp: string;
  manualSteps: string[];
  openHelp: string;
  manualButtonText: string;
  manualAction: 'copyLink' | 'openChrome' | 'dismiss';
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

function getUserAgentFlags() {
  if (typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isFirefox: false,
      isChromium: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isFirefox = userAgent.includes('firefox') || userAgent.includes('fxios');
  const isChromium =
    userAgent.includes('chrome') ||
    userAgent.includes('crios') ||
    userAgent.includes('edg') ||
    userAgent.includes('opr');

  return {
    isIOS: /iphone|ipad|ipod/.test(userAgent),
    isAndroid: /android/.test(userAgent),
    isFirefox,
    isChromium,
  };
}

function getCurrentInstallUrl() {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.href);
  url.searchParams.set('pwaInstall', '1');
  return url.toString();
}

function getChromeIntentUrl(targetUrl: string) {
  const urlWithoutProtocol = targetUrl.replace(/^https?:\/\//, '');
  return `intent://${urlWithoutProtocol}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
    targetUrl
  )};end`;
}

function getInstallGuide(): InstallGuide {
  const { isIOS, isAndroid, isFirefox, isChromium } = getUserAgentFlags();

  if (isIOS) {
    return {
      manualHelp: 'En iPhone la instalacion se hace desde Safari.',
      manualSteps: [
        'Abre este link en Safari.',
        'Toca Compartir.',
        'Elige Agregar a pantalla de inicio.',
      ],
      openHelp: 'La app queda en tu pantalla de inicio. Busca el icono Barber Studio y abrelo desde ahi.',
      manualButtonText: 'Ver pasos',
      manualAction: 'dismiss',
    };
  }

  if (isFirefox && isAndroid) {
    return {
      manualHelp: 'Firefox no siempre permite instalar desde este boton. Te llevamos a Chrome para terminar.',
      manualSteps: [
        'Toca Abrir en Chrome.',
        'Cuando abra la pagina, toca Instalar aplicacion.',
        'Confirma la instalacion en Chrome.',
      ],
      openHelp:
        'La app queda en tu pantalla de inicio o cajon de apps. Si no la ves, buscala como Barber Studio.',
      manualButtonText: 'Abrir en Chrome',
      manualAction: 'openChrome',
    };
  }

  if (isFirefox) {
    return {
      manualHelp: 'Firefox en computadora no permite instalar esta app desde este boton.',
      manualSteps: [
        'Copia este link.',
        'Abre Chrome o Edge.',
        'Pega el link y toca Instalar aplicacion cuando aparezca.',
      ],
      openHelp:
        'En computadora, Chrome o Edge pueden mostrar Abrir en aplicacion en la barra superior. Tambien puedes buscar Barber Studio entre tus aplicaciones.',
      manualButtonText: 'Copiar link',
      manualAction: 'copyLink',
    };
  }

  if (isAndroid || isChromium) {
    return {
      manualHelp: 'Tu navegador puede instalarla desde su menu.',
      manualSteps: [
        'Abre el menu de tres puntos.',
        'Toca Instalar app o Agregar a pantalla principal.',
        'Confirma la instalacion.',
      ],
      openHelp:
        'La app queda en tu pantalla de inicio o cajon de apps. Tambien puedes tocar Abrir en aplicacion si Chrome lo muestra arriba.',
      manualButtonText: 'Ver pasos',
      manualAction: 'dismiss',
    };
  }

  return {
    manualHelp: 'Si no aparece instalacion directa, usa Chrome o Edge.',
    manualSteps: [
      'Abre este link en Chrome o Edge.',
      'Busca el icono de instalar en la barra superior.',
      'Confirma la instalacion.',
    ],
    openHelp:
      'Chrome o Edge pueden mostrar Abrir en aplicacion en la barra superior. Si no, busca Barber Studio entre tus aplicaciones.',
    manualButtonText: 'Ver pasos',
    manualAction: 'dismiss',
  };
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [progress, setProgress] = useState(0);
  const [showOpenHelp, setShowOpenHelp] = useState(false);
  const [didCopyLink, setDidCopyLink] = useState(false);
  const [didTryOpenChrome, setDidTryOpenChrome] = useState(false);
  const installGuide = useMemo(() => getInstallGuide(), []);

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

  const copyCurrentLink = useCallback(async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(getCurrentInstallUrl());
      setDidCopyLink(true);
    } catch {
      setDidCopyLink(false);
    }
  }, []);

  const openInChrome = useCallback(() => {
    if (typeof window === 'undefined') return;

    const targetUrl = getCurrentInstallUrl();
    setDidTryOpenChrome(true);
    window.location.href = getChromeIntentUrl(targetUrl);
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
    if (installState === 'manual') {
      if (installGuide.manualAction === 'copyLink') {
        void copyCurrentLink();
      } else if (installGuide.manualAction === 'openChrome') {
        if (didTryOpenChrome) {
          void copyCurrentLink();
        } else {
          openInChrome();
        }
      } else {
        setIsVisible(false);
      }
      return;
    }

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
  }, [
    completeAsInstalled,
    copyCurrentLink,
    installGuide.manualAction,
    installPrompt,
    installState,
    didTryOpenChrome,
    openInChrome,
    showManualInstallHelp,
    showOpenHelp,
  ]);

  if (Platform.OS !== 'web' || isStandaloneDisplay() || !isVisible) {
    return null;
  }

  const isBusy =
    installState === 'checking' || installState === 'prompting' || installState === 'installing';
  const isInstalledState = installState === 'installed';
  const { isChromium } = getUserAgentFlags();
  const wasOpenedForInstall =
    typeof window !== 'undefined' && window.location.search.includes('pwaInstall=1') && isChromium;
  const title = isInstalledState ? 'Aplicacion instalada' : 'Instala Barber Studio';
  const iconName = isInstalledState ? 'checkmark-circle-outline' : 'download-outline';
  const iconColor = isInstalledState ? colors.gold : colors.black;
  const buttonText = isBusy
    ? 'Instalando...'
      : isInstalledState
        ? showOpenHelp
          ? 'Entendido'
          : 'Como abrirla'
        : installState === 'manual'
          ? didCopyLink
            ? 'Link copiado'
            : didTryOpenChrome
              ? 'Copiar link'
            : installGuide.manualAction !== 'dismiss'
              ? installGuide.manualButtonText
              : 'Entendido'
        : 'Instalar aplicacion';
  const helpText = isInstalledState
    ? showOpenHelp
      ? installGuide.openHelp
      : 'Listo. Se instalo correctamente. Puedes abrirla desde el icono instalado en tu dispositivo.'
    : installState === 'checking'
      ? 'Verificando si tu navegador permite instalacion directa...'
      : installState === 'prompting'
        ? 'Confirma la instalacion en la ventana del navegador.'
        : installState === 'installing'
          ? 'Instalando la app en tu dispositivo...'
          : installState === 'manual'
            ? didCopyLink
              ? 'Listo. Ahora abre Chrome o Edge, pega el link y toca Instalar aplicacion.'
              : didTryOpenChrome
                ? 'Si Chrome no se abrio, es probable que no este instalado. Copia el link y abrelo en Chrome o Edge.'
              : installGuide.manualHelp
            : wasOpenedForInstall
              ? 'Ya estas en un navegador compatible. Toca Instalar aplicacion para terminar.'
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
        {installState === 'manual' ? (
          <View style={styles.steps}>
            {installGuide.manualSteps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
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
  steps: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  stepNumberText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.gray300,
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
