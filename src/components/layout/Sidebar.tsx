import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';

export type SidebarRoute = 'dashboard' | 'agenda' | 'clients' | 'messages' | 'settings';

interface NavItem {
  key: SidebarRoute;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', icon: 'grid-outline', label: 'Inicio' },
  { key: 'agenda', icon: 'calendar-outline', label: 'Agenda' },
  { key: 'clients', icon: 'people-outline', label: 'Clientes' },
  { key: 'messages', icon: 'chatbubbles-outline', label: 'Mensajes' },
  { key: 'settings', icon: 'settings-outline', label: 'Ajustes' },
];

interface SidebarProps {
  activeRoute: SidebarRoute;
  onNavigate: (route: SidebarRoute) => void;
  onLogout: () => void;
}

export function Sidebar({ activeRoute, onNavigate, onLogout }: SidebarProps) {
  return (
    <View style={styles.container}>
      {/* Brand */}
      <View style={styles.brand}>
        <Image
          source={require('../../../assets/LogoJL.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>JL Studio</Text>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? (item.icon.replace('-outline', '') as any) : item.icon}
                size={20}
                color={isActive ? colors.gold : colors.gray500}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.navItem}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.navLabel, { color: colors.error }]}>Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: colors.black,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-start',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandName: {
    ...typography.subtitle,
    color: colors.gold,
    fontSize: 15,
  },
  nav: {
    flex: 1,
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.gold + '15',
  },
  navLabel: {
    ...typography.body,
    color: colors.gray500,
    fontSize: 14,
  },
  navLabelActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  bottom: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray800,
    marginVertical: spacing.sm,
  },
});
