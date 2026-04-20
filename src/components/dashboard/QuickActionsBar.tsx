import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onSearchClient: () => void;
  onSendMessage: () => void;
}

export function QuickActionsBar({ onNewAppointment, onBlockTime, onSearchClient, onSendMessage }: QuickActionsBarProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const actions: QuickAction[] = [
    { icon: 'add-circle', label: 'Nueva cita', color: colors.gold, onPress: onNewAppointment },
    { icon: 'lock-closed', label: 'Bloquear', color: colors.error, onPress: onBlockTime },
    { icon: 'search', label: 'Buscar', color: colors.info, onPress: onSearchClient },
    { icon: 'chatbubble', label: 'Mensaje', color: colors.statusConfirmed, onPress: onSendMessage },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={[styles.button, isMobile && styles.buttonMobile]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
            <Ionicons name={action.icon} size={isMobile ? 16 : 18} color={action.color} />
          </View>
          <Text style={[styles.label, isMobile && styles.labelMobile]} numberOfLines={1}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  containerMobile: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  buttonMobile: {
    flex: undefined,
    width: '47%' as any,
    flexGrow: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.bodySmall,
    color: colors.gray300,
    fontWeight: '500',
    flex: 1,
  },
  labelMobile: {
    fontSize: 12,
  },
});
