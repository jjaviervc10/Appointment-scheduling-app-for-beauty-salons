import Constants from 'expo-constants';

declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
  };
};

const BUILD_TIME_ENV = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
};

function readEnvVar(name: string): string | undefined {
  const buildTimeValue = BUILD_TIME_ENV[name as keyof typeof BUILD_TIME_ENV];
  if (buildTimeValue && buildTimeValue.trim().length > 0) {
    return buildTimeValue;
  }

  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const extraValue = extra?.[name];
  if (extraValue && extraValue.trim().length > 0) {
    return extraValue;
  }

  return undefined;
}

export const API_BASE_URL =
  readEnvVar('EXPO_PUBLIC_API_BASE_URL') ??
  'https://striking-caring-production.up.railway.app';
