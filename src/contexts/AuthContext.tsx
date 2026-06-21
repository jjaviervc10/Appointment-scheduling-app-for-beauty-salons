/**
 * Auth context — manages owner and client session state.
 * Restores exactly one session with owner taking precedence over client.
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
  getClientExpiresAt,
  getClientToken,
  getOwnerExpiresAt,
  getOwnerToken,
  setClientExpiresAt,
  setClientToken,
  setOwnerExpiresAt,
  setOwnerToken,
} from '../utils/tokenStorage';

import { setOnUnauthorized } from '../services/apiClient';

export type AuthStatus = 'loading' | 'owner' | 'client' | 'anonymous';

interface AuthContextValue {
  authStatus: AuthStatus;
  ownerToken: string | null;
  ownerExpiresAt: string | null;
  ownerProfile: OwnerProfile | null;
  ownerLoading: boolean;

  clientToken: string | null;
  clientExpiresAt: string | null;
  clientProfile: ClientProfile | null;
  clientLoading: boolean;

  loginOwner: (phone: string, password: string) => Promise<void>;
  setOwnerSession: (
    token: string,
    owner: OwnerProfile,
    expiresAt?: string,
  ) => Promise<void>;
  logoutOwner: () => Promise<void>;

  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logoutClient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [ownerToken, setOwnerTokenState] = useState<string | null>(null);
  const [ownerExpiresAt, setOwnerExpiresAtState] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfileState] = useState<OwnerProfile | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);

  const [clientToken, setClientTokenState] = useState<string | null>(null);
  const [clientExpiresAt, setClientExpiresAtState] = useState<string | null>(null);
  const [clientProfile, setClientProfileState] = useState<ClientProfile | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function isLocallyExpired(expiresAt: string | null): boolean {
      if (!expiresAt) {
        // Existing installations stored tokens before expiration keys existed.
        return false;
      }

      const expiresAtMs = Date.parse(expiresAt);
      return !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
    }

    async function restoreSession() {
      try {
        const ownerTokenCandidate = await getOwnerToken();
        const ownerExpiresAtCandidate = await getOwnerExpiresAt();

        if (ownerTokenCandidate) {
          if (isLocallyExpired(ownerExpiresAtCandidate)) {
            await clearOwnerToken();
          } else {
            try {
              const response = await getOwnerMe(ownerTokenCandidate);

              if (!cancelled) {
                setOwnerTokenState(ownerTokenCandidate);
                setOwnerExpiresAtState(ownerExpiresAtCandidate);
                setOwnerProfileState(response.owner);
                setClientTokenState(null);
                setClientExpiresAtState(null);
                setClientProfileState(null);
                setAuthStatus('owner');
              }
              return;
            } catch {
              await clearOwnerToken();
            }
          }
        }

        const clientTokenCandidate = await getClientToken();
        const clientExpiresAtCandidate = await getClientExpiresAt();

        if (clientTokenCandidate) {
          if (isLocallyExpired(clientExpiresAtCandidate)) {
            await clearClientToken();
          } else {
            try {
              const response = await getClientMe(clientTokenCandidate);

              if (!cancelled) {
                setOwnerTokenState(null);
                setOwnerExpiresAtState(null);
                setOwnerProfileState(null);
                setClientTokenState(clientTokenCandidate);
                setClientExpiresAtState(clientExpiresAtCandidate);
                setClientProfileState(response.identity);
                setAuthStatus('client');
              }
              return;
            } catch {
              await clearClientToken();
            }
          }
        }

        if (!cancelled) {
          setAuthStatus('anonymous');
        }
      } catch {
        if (!cancelled) {
          setAuthStatus('anonymous');
        }
      } finally {
        if (!cancelled) {
          setOwnerLoading(false);
          setClientLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOnUnauthorized(async (auth) => {
      if (auth === 'owner') {
        setOwnerTokenState(null);
        setOwnerExpiresAtState(null);
        setOwnerProfileState(null);
        await clearOwnerToken();
        setAuthStatus((current) => current === 'owner' ? 'anonymous' : current);
        return;
      }

      setClientTokenState(null);
      setClientExpiresAtState(null);
      setClientProfileState(null);
      await clearClientToken();
      setAuthStatus((current) => current === 'client' ? 'anonymous' : current);
    });
  }, []);

  const loginOwner = useCallback(async (phone: string, password: string) => {
    const res = await apiLoginOwner(phone, password);
    await setOwnerToken(res.token);
    await setOwnerExpiresAt(res.expiresAt);
    setOwnerTokenState(res.token);
    setOwnerExpiresAtState(res.expiresAt);
    setOwnerProfileState(res.owner);
    setClientTokenState(null);
    setClientExpiresAtState(null);
    setClientProfileState(null);
    setAuthStatus('owner');
  }, []);

  const setOwnerSession = useCallback(
    async (token: string, owner: OwnerProfile, expiresAt?: string) => {
      await setOwnerToken(token);
      if (expiresAt) {
        await setOwnerExpiresAt(expiresAt);
      }
      setOwnerTokenState(token);
      setOwnerExpiresAtState(expiresAt ?? null);
      setOwnerProfileState(owner);
      setClientTokenState(null);
      setClientExpiresAtState(null);
      setClientProfileState(null);
      setAuthStatus('owner');
    },
    [],
  );

  const logoutOwner = useCallback(async () => {
    const token = ownerToken;

    if (token) {
      try {
        await apiLogoutOwner(token);
      } catch {
        // The local session is cleared even if remote revocation fails.
      }
    }

    setOwnerTokenState(null);
    setOwnerExpiresAtState(null);
    setOwnerProfileState(null);
    await clearOwnerToken();
    setAuthStatus((current) => current === 'owner' ? 'anonymous' : current);
  }, [ownerToken]);

  const requestOtp = useCallback(async (phone: string) => {
    await apiRequestOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const res = await apiVerifyOtp(phone, code);
    await setClientToken(res.token);
    await setClientExpiresAt(res.expiresAt);

    // An already active owner session always wins over a client login.
    if (authStatus === 'owner') {
      return;
    }

    setClientTokenState(res.token);
    setClientExpiresAtState(res.expiresAt);
    setClientProfileState(res.client);
    setAuthStatus('client');
  }, [authStatus]);

  const logoutClient = useCallback(async () => {
    const token = clientToken;

    if (token) {
      try {
        await apiLogoutClient(token);
      } catch {
        // The local session is cleared even if remote revocation fails.
      }
    }

    setClientTokenState(null);
    setClientExpiresAtState(null);
    setClientProfileState(null);
    await clearClientToken();
    setAuthStatus((current) => current === 'owner' ? 'owner' : 'anonymous');
  }, [clientToken]);

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        ownerToken,
        ownerExpiresAt,
        ownerProfile,
        ownerLoading,
        clientToken,
        clientExpiresAt,
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

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
