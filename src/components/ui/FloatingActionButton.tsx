import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onNewIncident: () => void;
}

export function FloatingActionButton({ onNewAppointment, onBlockTime, onNewIncident }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const actions: FABAction[] = [
    { icon: 'calendar', label: 'Nueva cita', color: colors.gold, onPress: onNewAppointment },
    { icon: 'lock-closed', label: 'Bloquear horario', color: colors.gray800, onPress: onBlockTime },
    { icon: 'warning', label: 'Incidencia', color: colors.error, onPress: onNewIncident },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {open && (
        <>
          <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} activeOpacity={1} />
          <View style={styles.menu}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={action.label}
                style={styles.menuItem}
                onPress={() => { setOpen(false); action.onPress(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuLabel}>{action.label}</Text>
                <View style={[styles.menuIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={18} color={colors.white} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.fab, open && styles.fabOpen, isMobile && styles.fabMobile]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Ionicons name={open ? 'close' : 'add'} size={isMobile ? 24 : 28} color={colors.black} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xxl,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  containerMobile: {
    bottom: 12,
    right: 12,
  },
  backdrop: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.cardHover,
  },
  fabOpen: {
    backgroundColor: colors.gray800,
  },
  fabMobile: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  menu: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuLabel: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '500',
    backgroundColor: colors.gray800,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    ...shadows.card,
    overflow: 'hidden',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
});
