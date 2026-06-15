/**
 * Authentication API service.
 * Uses direct fetch (not apiRequest) to avoid circular dependencies
 * and because auth endpoints manage their own tokens.
 */

import { API_BASE_URL } from '../config/api';

// ── Response types ─────────────────────────────────────────────

export interface OwnerProfile {
  id: string;
  phone: string;
  role: string;
  createdAt?: string;
}

export interface OwnerLoginResponse {
  ok: true;
  token: string;
  expiresAt: string;
  owner: OwnerProfile;
}

export interface ClientProfile {
  sessionId: string;
  identityId: string;
  phone: string;
  clientId: string | null;
}

export interface ClientLoginResponse {
  ok: true;
  token: string;
  expiresAt: string;
  client: ClientProfile;
}

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// ── Internal fetch helper ──────────────────────────────────────

async function authFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const err = Object.assign(
      new Error((body.error as string | undefined) ?? 'Error desconocido'),
      { status: res.status },
    );
    throw err;
  }

  return body as T;
}

// ── Owner auth ─────────────────────────────────────────────────

export async function loginOwner(
  phone: string,
  password: string,
): Promise<OwnerLoginResponse> {
  return authFetch<OwnerLoginResponse>('/api/auth/owner/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function logoutOwner(token: string): Promise<void> {
  await authFetch('/api/auth/owner/logout', { method: 'POST' }, token);
}

export async function getOwnerMe(
  token: string,
): Promise<{ ok: true; owner: OwnerProfile }> {
  return authFetch('/api/auth/owner/me', {}, token);
}

// ── Client auth (OTP via WhatsApp) ────────────────────────────

export async function requestOtp(phone: string): Promise<void> {
  await authFetch('/api/auth/client/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<ClientLoginResponse> {
  return authFetch<ClientLoginResponse>('/api/auth/client/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export async function logoutClient(token: string): Promise<void> {
  await authFetch('/api/auth/client/logout', { method: 'POST' }, token);
}

export async function getClientMe(
  token: string,
): Promise<{ ok: true; session: ClientProfile }> {
  return authFetch('/api/auth/client/me', {}, token);
}

// ── WebAuthn / Passkeys (owner, web-only) ─────────────────────

export async function getWebAuthnRegisterOptions(
  token: string,
  deviceName?: string,
): Promise<{ ok: true; options: Record<string, unknown> }> {
  return authFetch(
    '/api/auth/owner/webauthn/register/options',
    {
      method: 'POST',
      body: JSON.stringify({ deviceName: deviceName ?? 'Mi dispositivo' }),
    },
    token,
  );
}

export async function verifyWebAuthnRegistration(
  token: string,
  response: unknown,
  deviceName?: string,
): Promise<{ ok: true; passkey: PasskeyCredential }> {
  return authFetch(
    '/api/auth/owner/webauthn/register/verify',
    {
      method: 'POST',
      body: JSON.stringify({ response, deviceName: deviceName ?? 'Mi dispositivo' }),
    },
    token,
  );
}

export async function getWebAuthnLoginOptions(): Promise<{
  ok: true;
  options: Record<string, unknown>;
}> {
  return authFetch('/api/auth/owner/webauthn/login/options', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function verifyWebAuthnLogin(
  response: unknown,
): Promise<OwnerLoginResponse> {
  return authFetch<OwnerLoginResponse>(
    '/api/auth/owner/webauthn/login/verify',
    { method: 'POST', body: JSON.stringify({ response }) },
  );
}

export async function listPasskeys(
  token: string,
): Promise<{ ok: true; passkeys: PasskeyCredential[] }> {
  return authFetch('/api/auth/owner/webauthn/passkeys', {}, token);
}

export async function deletePasskey(
  token: string,
  passkeyId: string,
): Promise<void> {
  await authFetch(
    `/api/auth/owner/webauthn/passkeys/${passkeyId}`,
    { method: 'DELETE' },
    token,
  );
}
