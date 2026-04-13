import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  route: string;
  iconColor: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'time-outline',
    label: 'Disponibilidad semanal',
    subtitle: 'Configurar horarios y bloques',
    route: '/(owner)/availability',
    iconColor: colors.gold,
  },
  {
    icon: 'warning-outline',
    label: 'Incidencias / Emergencias',
    subtitle: 'Registrar bloqueos excepcionales',
    route: '/(owner)/incidents',
    iconColor: colors.error,
  },
  {
    icon: 'people-outline',
    label: 'Clientes',
    subtitle: 'Ver y gestionar clientes',
    route: '/(owner)/clients',
    iconColor: colors.info,
  },
  {
    icon: 'chatbubbles-outline',
    label: 'Mensajes / Notificaciones',
    subtitle: 'Estado de mensajes enviados',
    route: '/(owner)/messages',
    iconColor: colors.statusConfirmed,
  },
  {
    icon: 'settings-outline',
    label: 'Configuración del negocio',
    subtitle: 'Nombre, duración por defecto, buffers',
    route: '/(owner)/settings',
    iconColor: colors.gray700,
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Más opciones</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.gray400}
            />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  logoutSection: {
    marginTop: spacing.xxl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  logoutButtonText: {
    ...typography.subtitle,
    color: colors.error,
  },
});
