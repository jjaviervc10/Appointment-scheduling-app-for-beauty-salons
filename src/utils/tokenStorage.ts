/**
 * Token storage utilities.
 * Uses AsyncStorage on all platforms (which maps to localStorage on web).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNER_TOKEN_KEY = 'jl-barber-owner-token';
const CLIENT_TOKEN_KEY = 'jl-barber-client-token';

// ── Owner token ────────────────────────────────────────────────

export async function getOwnerToken(): Promise<string | null> {
  return AsyncStorage.getItem(OWNER_TOKEN_KEY);
}

export async function setOwnerToken(token: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_TOKEN_KEY, token);
}

export async function clearOwnerToken(): Promise<void> {
  await AsyncStorage.removeItem(OWNER_TOKEN_KEY);
}

// ── Client token ───────────────────────────────────────────────

export async function getClientToken(): Promise<string | null> {
  return AsyncStorage.getItem(CLIENT_TOKEN_KEY);
}

export async function setClientToken(token: string): Promise<void> {
  await AsyncStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export async function clearClientToken(): Promise<void> {
  await AsyncStorage.removeItem(CLIENT_TOKEN_KEY);
}
