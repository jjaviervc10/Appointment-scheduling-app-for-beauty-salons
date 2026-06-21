/**
 * Authentication API contracts.
 * All requests use the shared transport so timeouts, auth headers and errors
 * behave consistently across owner and client flows.
 */

import { apiRequest } from './apiClient';

export type AuthNextStep = 'client_otp' | 'owner_password' | 'owner_setup';

export interface OwnerProfile {
  id?: string;
  identityId?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

export interface OwnerLoginResponse {
  ok: true;
  token: string;
  expiresAt: string;
  owner: OwnerProfile;
}

export interface ClientProfile {
  identityId: string;
  phone: string;
  clientId: string | null;
  fullName?: string | null;
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

export interface OwnerSetupStatusResponse {
  ok: true;
  setupRequired: boolean;
}

export interface AuthNextStepResponse {
  ok: true;
  nextStep: AuthNextStep;
}

export function getAuthNextStep(phone: string): Promise<AuthNextStepResponse> {
  return apiRequest<AuthNextStepResponse>('/api/auth/next-step', {
    method: 'POST',
    auth: 'none',
    body: { phone },
  });
}

export function loginOwner(
  phone: string,
  password: string,
): Promise<OwnerLoginResponse> {
  return apiRequest<OwnerLoginResponse>('/api/auth/owner/login', {
    method: 'POST',
    auth: 'none',
    body: { phone, password },
  });
}

export function getOwnerSetupStatus(): Promise<OwnerSetupStatusResponse> {
  return apiRequest<OwnerSetupStatusResponse>('/api/auth/owner/setup-status', {
    auth: 'none',
  });
}

export async function requestOwnerSetup(phone: string): Promise<void> {
  await apiRequest('/api/auth/owner/setup/request', {
    method: 'POST',
    auth: 'none',
    body: { phone },
  });
}

export function verifyOwnerSetup(
  phone: string,
  code: string,
  password: string,
): Promise<OwnerLoginResponse> {
  return apiRequest<OwnerLoginResponse>('/api/auth/owner/setup/verify', {
    method: 'POST',
    auth: 'none',
    body: { phone, code, password },
  });
}

export async function logoutOwner(_token?: string): Promise<void> {
  await apiRequest('/api/auth/owner/logout', {
    method: 'POST',
    auth: 'owner',
  });
}

export function getOwnerMe(
  _token?: string,
): Promise<{ ok: true; owner: OwnerProfile }> {
  return apiRequest('/api/auth/owner/me', { auth: 'owner' });
}

export async function requestOtp(phone: string): Promise<void> {
  await apiRequest('/api/auth/client/request-otp', {
    method: 'POST',
    auth: 'none',
    body: { phone },
  });
}

export function verifyOtp(
  phone: string,
  code: string,
): Promise<ClientLoginResponse> {
  return apiRequest<ClientLoginResponse>('/api/auth/client/verify-otp', {
    method: 'POST',
    auth: 'none',
    body: { phone, code },
  });
}

export async function logoutClient(_token?: string): Promise<void> {
  await apiRequest('/api/auth/client/logout', {
    method: 'POST',
    auth: 'client',
  });
}

export function getClientMe(
  _token?: string,
): Promise<{ ok: true; identity: ClientProfile }> {
  return apiRequest('/api/auth/client/me', { auth: 'client' });
}

export function getWebAuthnRegisterOptions(
  _token: string,
  deviceName?: string,
): Promise<{ ok: true; options: Record<string, unknown> }> {
  return apiRequest('/api/auth/owner/webauthn/register/options', {
    method: 'POST',
    auth: 'owner',
    body: { deviceName: deviceName ?? 'Mi dispositivo' },
  });
}

export function verifyWebAuthnRegistration(
  _token: string,
  response: unknown,
  deviceName?: string,
): Promise<{ ok: true; passkey: PasskeyCredential }> {
  return apiRequest('/api/auth/owner/webauthn/register/verify', {
    method: 'POST',
    auth: 'owner',
    body: { response, deviceName: deviceName ?? 'Mi dispositivo' },
  });
}

export function getWebAuthnLoginOptions(): Promise<{
  ok: true;
  options: Record<string, unknown>;
}> {
  return apiRequest('/api/auth/owner/webauthn/login/options', {
    method: 'POST',
    auth: 'none',
    body: {},
  });
}

export function verifyWebAuthnLogin(
  response: unknown,
): Promise<OwnerLoginResponse> {
  return apiRequest('/api/auth/owner/webauthn/login/verify', {
    method: 'POST',
    auth: 'none',
    body: { response },
  });
}

export function listPasskeys(
  _token: string,
): Promise<{ ok: true; passkeys: PasskeyCredential[] }> {
  return apiRequest('/api/auth/owner/webauthn/passkeys', {
    auth: 'owner',
  });
}

export async function deletePasskey(
  _token: string,
  passkeyId: string,
): Promise<void> {
  await apiRequest(`/api/auth/owner/webauthn/passkeys/${passkeyId}`, {
    method: 'DELETE',
    auth: 'owner',
  });
}
