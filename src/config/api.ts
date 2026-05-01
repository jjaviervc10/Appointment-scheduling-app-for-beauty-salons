import Constants from 'expo-constants';

function readEnvVar(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const processValue = processEnv?.[name];
  if (processValue && processValue.trim().length > 0) {
    return processValue;
  }

  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const extraValue = extra?.[name];
  if (extraValue && extraValue.trim().length > 0) {
    return extraValue;
  }

  return undefined;
}

export const API_BASE_URL = readEnvVar('EXPO_PUBLIC_API_BASE_URL') ?? 'http://localhost:3000';
export const OWNER_SECRET = readEnvVar('EXPO_PUBLIC_OWNER_SECRET');
