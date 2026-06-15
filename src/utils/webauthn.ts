/**
 * WebAuthn / Passkey support detection utilities.
 * Only available on web platform with HTTPS.
 */

import { Platform } from 'react-native';

export interface WebAuthnSupportResult {
  isSupported: boolean;
  reason?: 'not-web' | 'no-secure-context' | 'api-unavailable';
}

export function detectWebAuthnSupport(): WebAuthnSupportResult {
  if (Platform.OS !== 'web') {
    return { isSupported: false, reason: 'not-web' };
  }

  if (typeof window === 'undefined') {
    return { isSupported: false, reason: 'api-unavailable' };
  }

  if (!window.isSecureContext) {
    return { isSupported: false, reason: 'no-secure-context' };
  }

  if (typeof window.PublicKeyCredential === 'undefined') {
    return { isSupported: false, reason: 'api-unavailable' };
  }

  return { isSupported: true };
}

export function getWebAuthnUnsupportedMessage(
  reason?: WebAuthnSupportResult['reason'],
): string {
  switch (reason) {
    case 'not-web':
      return 'La huella solo está disponible en la versión web de la app.';
    case 'no-secure-context':
      return 'La huella solo está disponible en la versión segura (HTTPS) de la app.';
    case 'api-unavailable':
      return 'Tu navegador no soporta acceso con huella. Usa tu contraseña.';
    default:
      return 'Acceso con huella no disponible en este dispositivo.';
  }
}
