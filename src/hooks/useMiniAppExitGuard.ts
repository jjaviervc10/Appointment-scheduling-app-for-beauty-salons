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

/**
 * Opens a URL via a hidden anchor click.
 * On Android Chrome Custom Tab, this triggers the intent system without
 * causing a full page navigation event (avoids the black-screen flash).
 * window.close() is intentionally omitted — it only works for windows opened
 * via window.open(), never for pages opened from external links (e.g. WhatsApp).
 */
function openViaAnchor(url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function returnToWhatsApp(returnUrl?: string) {
  const targetUrl = getSafeWhatsAppUrl(returnUrl);

  if (typeof window !== 'undefined') {
    // In-app browser / Chrome Custom Tab (WhatsApp web link):
    // - window.close() doesn't work — page wasn't opened via window.open()
    // - Linking.openURL() on web calls window.open() which Chrome Custom Tab blocks
    // - window.location.href works but triggers a navigation event causing a black flash
    // Anchor click triggers the Android intent for whatsapp:// without a page navigation event.
    openViaAnchor(targetUrl);

    // Fallback after 1.5 s: if the custom scheme wasn't handled (WhatsApp not installed
    // or scheme unrecognized), navigate directly via location as last resort.
    if (targetUrl !== WHATSAPP_SCHEME) {
      setTimeout(() => openViaAnchor(WHATSAPP_SCHEME), 1500);
    }
    return;
  }

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
