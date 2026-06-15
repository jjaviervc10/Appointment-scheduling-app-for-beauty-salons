import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
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
  const { clientToken, clientLoading } = useAuthContext();

  // Redirect "Mis citas" to client login if not authenticated.
  // Public tabs (home, booking) remain accessible without login.
  // The redirect is handled per-screen for my-appointments,
  // so the layout itself doesn't gate all tabs.
  useEffect(() => {
    // No global redirect here — public tabs must stay accessible.
  }, [clientToken, clientLoading, router]);

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
        name="my-appointments"
        options={{
          title: 'Mis citas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Salir',
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
