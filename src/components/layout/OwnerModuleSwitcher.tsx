import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SidebarRoute } from './Sidebar';
import { colors, spacing, typography, radii } from '../../theme';

interface OwnerModuleSwitcherProps {
  activeRoute: SidebarRoute;
  onNavigate: (route: SidebarRoute) => void;
  onLogout: () => void;
}

export function OwnerModuleSwitcher({
  activeRoute,
  onNavigate,
  onLogout,
}: OwnerModuleSwitcherProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const activeModuleLabel = activeRoute === 'marketing' ? 'Marketing' : 'Operacion';

  const handleNavigate = (route: SidebarRoute) => {
    setMenuVisible(false);
    onNavigate(route);
  };

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.moduleButton}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Abrir selector de modulos"
      >
        <Ionicons name="apps-outline" size={17} color={colors.gold} />
        <Text style={styles.moduleButtonText}>{activeModuleLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.gold} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Salir"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Modulos</Text>
            <ModuleOption
              icon="briefcase-outline"
              label="Operacion"
              description="Inicio, agenda, disponibilidad y bloqueos"
              active={activeRoute !== 'marketing'}
              onPress={() => handleNavigate('dashboard')}
            />
            <ModuleOption
              icon="logo-instagram"
              label="Marketing"
              description="Instagram y futuros canales"
              active={activeRoute === 'marketing'}
              onPress={() => handleNavigate('marketing')}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface ModuleOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}

function ModuleOption({ icon, label, description, active, onPress }: ModuleOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.option, active && styles.optionActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={active ? colors.gold : colors.gray500} />
      <View style={styles.optionTextWrap}>
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
          {label}
        </Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 44,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  moduleButton: {
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gray700,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moduleButtonText: {
    ...typography.buttonSmall,
    color: colors.gold,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-start',
    paddingTop: 54,
    paddingHorizontal: spacing.md,
  },
  menu: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'flex-start',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
    gap: spacing.sm,
  },
  menuTitle: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 44,
  },
  optionActive: {
    backgroundColor: colors.gold + '14',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: colors.gold,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
});
