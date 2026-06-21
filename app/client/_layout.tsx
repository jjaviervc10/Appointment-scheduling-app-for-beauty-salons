import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../src/theme';
import { useAuthContext } from '../../src/contexts/AuthContext';

function LogoutTabButton(props: any) {
  const router = useRouter();
  const { logoutClient } = useAuthContext();

  const handleLogout = async () => {
    await logoutClient();
    router.replace('/');
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handleLogout}
    />
  );
}

export default function ClientLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { authStatus, clientToken } = useAuthContext();
  const requiresClientSession =
    pathname === '/client/appointments' ||
    pathname === '/client/profile';

  useEffect(() => {
    if (!requiresClientSession || authStatus === 'loading') return;
    if (authStatus !== 'client') {
      router.replace('/access');
    }
  }, [authStatus, requiresClientSession, router]);

  if (requiresClientSession && authStatus === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (requiresClientSession && authStatus !== 'client') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <Tabs
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          backgroundColor: colors.black,
          borderTopColor: colors.gray800,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          ...typography.tabLabel,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Reservar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Mis citas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Salir',
          href: authStatus === 'client' && clientToken ? undefined : null,
          tabBarIcon: ({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={colors.error} />
          ),
          tabBarLabelStyle: { ...typography.tabLabel, color: colors.error },
          tabBarButton: (props) => <LogoutTabButton {...props} />,
        }}
      />
    </Tabs>
  );
}
