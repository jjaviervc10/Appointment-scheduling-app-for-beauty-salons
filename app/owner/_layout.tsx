import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { AppLayout } from '../../src/components/layout/AppLayout';
import type { SidebarRoute } from '../../src/components/layout/Sidebar';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { colors } from '../../src/theme';

const ROUTE_MAP: Record<SidebarRoute, string> = {
  dashboard: '/owner/dashboard',
  agenda: '/owner/agenda',
  availability: '/owner/agenda?tab=availability',
  blocks: '/owner/agenda?tab=blocks',
  settings: '/owner/settings',
};

function getParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getActiveRoute(pathname: string, tab?: string): SidebarRoute {
  if (pathname.includes('/agenda')) {
    if (tab === 'availability') return 'availability';
    if (tab === 'blocks') return 'blocks';
    return 'agenda';
  }
  if (pathname.includes('/settings')) return 'settings';
  return 'dashboard';
}

export default function OwnerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const { authStatus, logoutOwner } = useAuthContext();
  const activeRoute = getActiveRoute(pathname, getParamValue(params.tab));
  const isLoginRoute = pathname === '/owner/login';

  useEffect(() => {
    if (authStatus === 'loading') return;

    if (isLoginRoute) {
      if (authStatus === 'owner') {
        router.replace('/owner/dashboard');
      }
      return;
    }

    if (authStatus !== 'owner') {
      router.replace('/access');
    }
  }, [authStatus, isLoginRoute, router]);

  const handleNavigate = (route: SidebarRoute) => {
    router.replace(ROUTE_MAP[route] as any);
  };

  const handleLogout = async () => {
    await logoutOwner();
    router.replace('/access');
  };

  // Show loading spinner while validating stored token
  if (authStatus === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (isLoginRoute) {
    return <Slot />;
  }

  // Keep a visible transition state while protected-route redirects resolve.
  if (authStatus !== 'owner') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

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
