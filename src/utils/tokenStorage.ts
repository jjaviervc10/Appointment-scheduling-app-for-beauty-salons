/**
 * Token storage utilities.
 * Uses AsyncStorage on all platforms (which maps to localStorage on web).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNER_TOKEN_KEY = 'jl-barber-owner-token';
const CLIENT_TOKEN_KEY = 'jl-barber-client-token';
const OWNER_EXPIRES_AT_KEY = 'jl-barber-owner-expires-at';
const CLIENT_EXPIRES_AT_KEY = 'jl-barber-client-expires-at';

// ── Owner token ────────────────────────────────────────────────

export async function getOwnerToken(): Promise<string | null> {
  return AsyncStorage.getItem(OWNER_TOKEN_KEY);
}

export async function setOwnerToken(token: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_TOKEN_KEY, token);
}

export async function clearOwnerToken(): Promise<void> {
  await AsyncStorage.multiRemove([OWNER_TOKEN_KEY, OWNER_EXPIRES_AT_KEY]);
}

export async function getOwnerExpiresAt(): Promise<string | null> {
  return AsyncStorage.getItem(OWNER_EXPIRES_AT_KEY);
}

export async function setOwnerExpiresAt(expiresAt: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_EXPIRES_AT_KEY, expiresAt);
}

// ── Client token ───────────────────────────────────────────────

export async function getClientToken(): Promise<string | null> {
  return AsyncStorage.getItem(CLIENT_TOKEN_KEY);
}

export async function setClientToken(token: string): Promise<void> {
  await AsyncStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export async function clearClientToken(): Promise<void> {
  await AsyncStorage.multiRemove([CLIENT_TOKEN_KEY, CLIENT_EXPIRES_AT_KEY]);
}

export async function getClientExpiresAt(): Promise<string | null> {
  return AsyncStorage.getItem(CLIENT_EXPIRES_AT_KEY);
}

export async function setClientExpiresAt(expiresAt: string): Promise<void> {
  await AsyncStorage.setItem(CLIENT_EXPIRES_AT_KEY, expiresAt);
}
