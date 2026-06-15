/**
 * Auth context — manages owner and client session state.
 * Validates stored tokens on mount via /me endpoints.
 * Provides login/logout actions consumed by auth screens and layouts.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  loginOwner as apiLoginOwner,
  logoutOwner as apiLogoutOwner,
  getOwnerMe,
  requestOtp as apiRequestOtp,
  verifyOtp as apiVerifyOtp,
  logoutClient as apiLogoutClient,
  getClientMe,
  type OwnerProfile,
  type ClientProfile,
} from '../services/authApi';

import {
  clearClientToken,
  clearOwnerToken,
  getClientToken,
  getOwnerToken,
  setClientToken,
  setOwnerToken,
} from '../utils/tokenStorage';

import { setOnUnauthorized } from '../services/apiClient';

// ── Context value type ─────────────────────────────────────────

interface AuthContextValue {
  // Owner
  ownerToken: string | null;
  ownerProfile: OwnerProfile | null;
  ownerLoading: boolean;
  // Client
  clientToken: string | null;
  clientProfile: ClientProfile | null;
  clientLoading: boolean;
  // Owner actions
  loginOwner: (phone: string, password: string) => Promise<void>;
  setOwnerSession: (token: string, owner: OwnerProfile) => Promise<void>;
  logoutOwner: () => Promise<void>;
  // Client actions
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logoutClient: () => Promise<void>;
}

// ── Context creation ───────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ownerToken, setOwnerTokenState] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfileState] = useState<OwnerProfile | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);

  const [clientToken, setClientTokenState] = useState<string | null>(null);
  const [clientProfile, setClientProfileState] = useState<ClientProfile | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  // ── Bootstrap: validate stored tokens on mount ─────────────

  useEffect(() => {
    let cancelled = false;

    async function initOwner() {
      try {
        const token = await getOwnerToken();
        if (!token) return;
        const res = await getOwnerMe(token);
        if (!cancelled) {
          setOwnerTokenState(token);
          setOwnerProfileState(res.owner);
        }
      } catch {
        await clearOwnerToken();
      } finally {
        if (!cancelled) setOwnerLoading(false);
      }
    }

    async function initClient() {
      try {
        const token = await getClientToken();
        if (!token) return;
        const res = await getClientMe(token);
        if (!cancelled) {
          setClientTokenState(token);
          setClientProfileState(res.session);
        }
      } catch {
        await clearClientToken();
      } finally {
        if (!cancelled) setClientLoading(false);
      }
    }

    void initOwner().finally(() => {
      if (!cancelled) setOwnerLoading(false);
    });

    void initClient().finally(() => {
      if (!cancelled) setClientLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Register 401 handler for apiClient ────────────────────

  useEffect(() => {
    setOnUnauthorized(async () => {
      setOwnerTokenState(null);
      setOwnerProfileState(null);
      await clearOwnerToken();
    });
  }, []);

  // ── Owner actions ──────────────────────────────────────────

  const loginOwner = useCallback(async (phone: string, password: string) => {
    const res = await apiLoginOwner(phone, password);
    await setOwnerToken(res.token);
    setOwnerTokenState(res.token);
    setOwnerProfileState(res.owner);
  }, []);

  /**
   * Used after passkey login to inject the session obtained externally.
   */
  const setOwnerSession = useCallback(
    async (token: string, owner: OwnerProfile) => {
      await setOwnerToken(token);
      setOwnerTokenState(token);
      setOwnerProfileState(owner);
    },
    [],
  );

  const logoutOwner = useCallback(async () => {
    const token = ownerToken;
    setOwnerTokenState(null);
    setOwnerProfileState(null);
    await clearOwnerToken();
    if (token) {
      try {
        await apiLogoutOwner(token);
      } catch {
        // Ignore — session already cleared locally
      }
    }
  }, [ownerToken]);

  // ── Client actions ─────────────────────────────────────────

  const requestOtp = useCallback(async (phone: string) => {
    await apiRequestOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const res = await apiVerifyOtp(phone, code);
    await setClientToken(res.token);
    setClientTokenState(res.token);
    setClientProfileState(res.client);
  }, []);

  const logoutClient = useCallback(async () => {
    const token = clientToken;
    setClientTokenState(null);
    setClientProfileState(null);
    await clearClientToken();
    if (token) {
      try {
        await apiLogoutClient(token);
      } catch {
        // Ignore — session already cleared locally
      }
    }
  }, [clientToken]);

  return (
    <AuthContext.Provider
      value={{
        ownerToken,
        ownerProfile,
        ownerLoading,
        clientToken,
        clientProfile,
        clientLoading,
        loginOwner,
        setOwnerSession,
        logoutOwner,
        requestOtp,
        verifyOtp,
        logoutClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Consumer hook ──────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
