import React, { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../src/theme';

type FontLoadState = 'loading' | 'ready' | 'error';

async function loadIconFontsWithRetry(maxAttempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await Ionicons.loadFont();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  throw lastError;
}

export default function RootLayout() {
  const [fontLoadState, setFontLoadState] = useState<FontLoadState>('loading');

  // Web: ensure html/body/#root fill the full viewport so flex:1 chains work
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `html, body, #root { height: 100%; overflow: hidden; margin: 0; padding: 0; } #root { display: flex; }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const loadIconFonts = useCallback(() => {
    setFontLoadState('loading');

    let isActive = true;
    void loadIconFontsWithRetry()
      .then(() => {
        if (isActive) setFontLoadState('ready');
      })
      .catch((error) => {
        console.error('[APP FONT ERROR]', error);
        if (isActive) setFontLoadState('error');
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => loadIconFonts(), [loadIconFonts]);

  if (fontLoadState !== 'ready') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        {fontLoadState === 'error' ? (
          <>
            <Text style={styles.loadingTitle}>No se pudieron cargar los iconos.</Text>
            <Text style={styles.loadingText}>Revisa la conexion local y vuelve a intentar.</Text>
            <Pressable style={styles.retryButton} onPress={loadIconFonts}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.loadingText}>Cargando interfaz...</Text>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.black },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.black,
  },
  loadingTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingText: {
    color: colors.gray400,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.gold,
  },
  retryButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '700',
  },
});
