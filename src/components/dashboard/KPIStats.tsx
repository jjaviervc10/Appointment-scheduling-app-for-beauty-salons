import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';

export type KPIKey = 'citasHoy' | 'pendientes' | 'confirmadas' | 'ocupacion';

interface KPIStatsProps {
  citasHoy: number;
  pendientes: number;
  confirmadas: number;
  ocupacion: number;
  onKPIPress?: (key: KPIKey) => void;
}

export function KPIStats({ citasHoy, pendientes, confirmadas, ocupacion, onKPIPress }: KPIStatsProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const items: { key: KPIKey; label: string; value: number | string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { key: 'citasHoy', label: 'Citas hoy', value: citasHoy, icon: 'calendar', color: colors.white },
    { key: 'pendientes', label: 'Pendientes', value: pendientes, icon: 'time', color: colors.statusPending },
    { key: 'confirmadas', label: 'Confirmadas', value: confirmadas, icon: 'checkmark-circle', color: colors.statusConfirmed },
    { key: 'ocupacion', label: 'Ocupación', value: `${ocupacion}%`, icon: 'bar-chart', color: colors.info },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={[styles.card, isMobile && styles.cardMobile]}
          onPress={() => onKPIPress?.(item.key)}
          activeOpacity={onKPIPress ? 0.7 : 1}
        >
          <View style={[styles.iconBg, { backgroundColor: item.color + '12' }]}>
            <Ionicons name={item.icon} size={isMobile ? 16 : 18} color={item.color} />
          </View>
          <Text style={[styles.value, isMobile && styles.valueMobile, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.label, isMobile && styles.labelMobile]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  containerMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  cardMobile: {
    flex: undefined,
    width: '47%' as any,
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  value: {
    ...typography.h2,
    fontSize: 24,
  },
  valueMobile: {
    fontSize: 20,
  },
  label: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'center',
  },
  labelMobile: {
    fontSize: 10,
  },
});
