/**
 * useWebAuthn — WebAuthn / Passkey operations hook.
 * Only active on web platform with HTTPS.
 * Uses @simplewebauthn/browser with dynamic import (web-only).
 */

import { useCallback, useState } from 'react';

import {
  deletePasskey,
  getWebAuthnLoginOptions,
  getWebAuthnRegisterOptions,
  listPasskeys,
  verifyWebAuthnLogin,
  verifyWebAuthnRegistration,
  type PasskeyCredential,
} from '../services/authApi';
import type { OwnerProfile } from '../services/authApi';
import { detectWebAuthnSupport } from '../utils/webauthn';

// ── Types ──────────────────────────────────────────────────────

interface UseWebAuthnReturn {
  isSupported: boolean;
  hasPasskeys: boolean | null;
  passkeys: PasskeyCredential[];
  isLoading: boolean;
  error: string | null;
  checkPasskeys: () => Promise<boolean>;
  loadPasskeys: (token: string) => Promise<void>;
  registerPasskey: (token: string, deviceName?: string) => Promise<void>;
  loginWithPasskey: () => Promise<{
    token: string;
    expiresAt: string;
    owner: OwnerProfile;
  }>;
  revokePasskey: (token: string, passkeyId: string) => Promise<void>;
  clearError: () => void;
}

// ── Hook ───────────────────────────────────────────────────────

export function useWebAuthn(): UseWebAuthnReturn {
  const { isSupported } = detectWebAuthnSupport();

  const [hasPasskeys, setHasPasskeys] = useState<boolean | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Probe the login/options endpoint to see if any passkeys are registered.
   * Returns true if passkeys exist, false if 404 (none registered) or unsupported.
   */
  const checkPasskeys = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setHasPasskeys(false);
      return false;
    }
    try {
      await getWebAuthnLoginOptions();
      setHasPasskeys(true);
      return true;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        setHasPasskeys(false);
        return false;
      }
      // Network or other error — leave hasPasskeys as null (unknown)
      return false;
    }
  }, [isSupported]);

  /**
   * Load list of registered passkeys for the authenticated owner.
   */
  const loadPasskeys = useCallback(
    async (token: string): Promise<void> => {
      if (!isSupported) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await listPasskeys(token);
        setPasskeys(res.passkeys);
      } catch {
        setError('No se pudieron cargar los dispositivos autorizados.');
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported],
  );

  /**
   * Register a new passkey for the logged-in owner.
   * Requires an active owner session token (from password login).
   */
  const registerPasskey = useCallback(
    async (token: string, deviceName?: string): Promise<void> => {
      if (!isSupported) {
        throw new Error('WebAuthn no disponible en este dispositivo.');
      }
      setIsLoading(true);
      setError(null);
      try {
        const { startRegistration } = await import('@simplewebauthn/browser');
        const optionsRes = await getWebAuthnRegisterOptions(token, deviceName);
        const regResponse = await startRegistration({
          optionsJSON: optionsRes.options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'],
        });
        await verifyWebAuthnRegistration(token, regResponse, deviceName);
        setHasPasskeys(true);
      } catch (err: unknown) {
        const domErr = err as { name?: string; status?: number; message?: string };
        if (domErr.name === 'NotAllowedError') {
          setError('No se detectó la huella. Inténtalo de nuevo.');
        } else if (domErr.name === 'AbortError') {
          setError('Proceso cancelado. Puedes intentarlo cuando quieras.');
        } else if (domErr.name === 'InvalidStateError') {
          setError('Este dispositivo ya tiene huella configurada.');
        } else {
          setError(domErr.message ?? 'No se pudo configurar la huella. Inténtalo de nuevo.');
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported],
  );

  /**
   * Authenticate using a registered passkey. Does not require a session token.
   */
  const loginWithPasskey = useCallback(async (): Promise<{
    token: string;
    expiresAt: string;
    owner: OwnerProfile;
  }> => {
    if (!isSupported) {
      throw new Error('WebAuthn no disponible en este dispositivo.');
    }
    setIsLoading(true);
    setError(null);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optionsRes = await getWebAuthnLoginOptions();
      const authResponse = await startAuthentication({
        optionsJSON: optionsRes.options as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'],
      });
      const session = await verifyWebAuthnLogin(authResponse);
      return {
        token: session.token,
        expiresAt: session.expiresAt,
        owner: session.owner,
      };
    } catch (err: unknown) {
      const domErr = err as { name?: string; status?: number; message?: string };
      if (domErr.name === 'NotAllowedError') {
        setError('No se detectó la huella. Inténtalo de nuevo o usa tu contraseña.');
      } else if (domErr.name === 'AbortError') {
        setError('Proceso cancelado. Puedes intentarlo cuando quieras.');
      } else if (domErr.status === 404) {
        setError('No hay huella configurada. Usa tu contraseña para entrar.');
        setHasPasskeys(false);
      } else if (domErr.status === 401) {
        setError('La huella no coincide. Usa tu contraseña para entrar.');
      } else {
        setError(domErr.message ?? 'No se pudo verificar la huella.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Revoke a registered passkey by its ID.
   */
  const revokePasskey = useCallback(
    async (token: string, passkeyId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await deletePasskey(token, passkeyId);
        setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
      } catch {
        setError('No se pudo eliminar el dispositivo. Inténtalo de nuevo.');
        throw new Error('No se pudo eliminar el dispositivo.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isSupported,
    hasPasskeys,
    passkeys,
    isLoading,
    error,
    checkPasskeys,
    loadPasskeys,
    registerPasskey,
    loginWithPasskey,
    revokePasskey,
    clearError,
  };
}
