import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar, SidebarRoute } from './Sidebar';
import { OwnerModuleSwitcher } from './OwnerModuleSwitcher';
import { colors, spacing } from '../../theme';

const MOBILE_BREAKPOINT = 768;

const BOTTOM_TABS: { key: SidebarRoute; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'dashboard', icon: 'grid-outline', iconActive: 'grid', label: 'Inicio' },
  { key: 'agenda', icon: 'calendar-outline', iconActive: 'calendar', label: 'Agenda' },
  { key: 'availability', icon: 'time-outline', iconActive: 'time', label: 'Disponibilidad' },
  { key: 'blocks', icon: 'shield-outline', iconActive: 'shield', label: 'Bloqueos' },
  { key: 'settings', icon: 'settings-outline', iconActive: 'settings', label: 'Ajustes' },
];

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: SidebarRoute;
  onNavigate: (route: SidebarRoute) => void;
  onLogout: () => void;
}

export function AppLayout({ children, activeRoute, onNavigate, onLogout }: AppLayoutProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <OwnerModuleSwitcher
          activeRoute={activeRoute}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <View style={styles.mobileMain}>{children}</View>
        <View style={styles.bottomBar}>
          {BOTTOM_TABS.map((tab) => {
            const isActive = activeRoute === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.bottomTab}
                onPress={() => onNavigate(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? colors.gold : colors.gray500}
                />
                <Text style={[styles.bottomLabel, isActive && styles.bottomLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Sidebar activeRoute={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <View style={styles.main}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.black,
  },
  main: {
    flex: 1,
    backgroundColor: colors.black,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  mobileMain: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
  },
  bottomTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xxs,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray500,
  },
  bottomLabelActive: {
    color: colors.gold,
  },
});
