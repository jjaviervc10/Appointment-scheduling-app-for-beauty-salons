import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Linking, Platform } from 'react-native';

const WHATSAPP_SCHEME = 'whatsapp://';

function getSafeWhatsAppUrl(returnUrl?: string) {
  if (!returnUrl) return WHATSAPP_SCHEME;

  const trimmedUrl = returnUrl.trim();
  const isWhatsAppUrl =
    trimmedUrl.startsWith('whatsapp://') ||
    trimmedUrl.startsWith('https://wa.me/') ||
    trimmedUrl.startsWith('https://api.whatsapp.com/');

  return isWhatsAppUrl ? trimmedUrl : WHATSAPP_SCHEME;
}

export async function returnToWhatsApp(returnUrl?: string) {
  if (typeof window !== 'undefined') {
    window.close();
  }

  const targetUrl = getSafeWhatsAppUrl(returnUrl);

  try {
    await Linking.openURL(targetUrl);
  } catch (error) {
    console.warn('[MINIAPP EXIT] Could not open WhatsApp', error);

    if (targetUrl !== WHATSAPP_SCHEME) {
      try {
        await Linking.openURL(WHATSAPP_SCHEME);
      } catch (fallbackError) {
        console.warn('[MINIAPP EXIT] Could not open WhatsApp fallback', fallbackError);
      }
    }
  }
}

export function useMiniAppExitGuard(onExit: () => void) {
  const isExitingRef = useRef(false);

  const guardedExit = useCallback(() => {
    if (isExitingRef.current) return true;

    isExitingRef.current = true;
    onExit();

    setTimeout(() => {
      isExitingRef.current = false;
    }, 800);

    return true;
  }, [onExit]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', guardedExit);
    return () => subscription.remove();
  }, [guardedExit]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const historyState = {
      ...(window.history.state ?? {}),
      __miniappExitGuard: true,
    };

    window.history.pushState(historyState, '', window.location.href);

    const handlePopState = () => {
      guardedExit();

      window.history.pushState(historyState, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [guardedExit]);
}
