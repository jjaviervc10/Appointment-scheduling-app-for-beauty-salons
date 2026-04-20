import React from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { AppLayout } from '../../src/components/layout/AppLayout';
import type { SidebarRoute } from '../../src/components/layout/Sidebar';

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
  const activeRoute = getActiveRoute(pathname);

  const handleNavigate = (route: SidebarRoute) => {
    router.push(ROUTE_MAP[route] as any);
  };

  const handleLogout = () => {
    router.replace('/');
  };

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
