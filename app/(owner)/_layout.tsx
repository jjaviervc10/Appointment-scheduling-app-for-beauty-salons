import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { AppLayout } from '../../src/components/layout/AppLayout';
import type { SidebarRoute } from '../../src/components/layout/Sidebar';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { colors } from '../../src/theme';

const ROUTE_MAP: Record<SidebarRoute, string> = {
  dashboard: '/(owner)/dashboard',
  agenda: '/(owner)/agenda',
  clients: '/(owner)/clients',
  messages: '/(owner)/messages',
  settings: '/(owner)/settings',
};

function getActiveRoute(pathname: string): SidebarRoute {
  if (pathname.includes('/agenda')) return 'agenda';
  if (pathname.includes('/clients')) return 'clients';
  if (pathname.includes('/messages')) return 'messages';
  if (pathname.includes('/settings')) return 'settings';
  return 'dashboard';
}

export default function OwnerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { ownerToken, ownerLoading, logoutOwner } = useAuthContext();
  const activeRoute = getActiveRoute(pathname);

  useEffect(() => {
    if (ownerLoading) return;
    if (!ownerToken) {
      router.replace('/(auth)/login-owner' as any);
    }
  }, [ownerToken, ownerLoading, router]);

  const handleNavigate = (route: SidebarRoute) => {
    router.replace(ROUTE_MAP[route] as any);
  };

  const handleLogout = async () => {
    await logoutOwner();
    router.replace('/(auth)/login-owner' as any);
  };

  // Show loading spinner while validating stored token
  if (ownerLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  // Redirect is in-flight — render nothing to avoid flicker
  if (!ownerToken) return null;

  return (
    <AppLayout
      activeRoute={activeRoute}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      <Slot />
    </AppLayout>
  );
}
