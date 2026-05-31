import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';

function minutesOfDay(t: string): number {
  const [h = '0', m = '0'] = t.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

interface AvailabilitySummaryProps {
  availability: WeeklyAvailability[];
}

export function AvailabilitySummary({ availability }: AvailabilitySummaryProps) {
  const activeDays = availability.filter((d) => d.is_active);
  const closedDays = availability.filter((d) => !d.is_active);
  const totalMinutes = activeDays.reduce(
    (sum, d) => sum + (minutesOfDay(d.end_time) - minutesOfDay(d.start_time)),
    0,
  );
  const totalHours = Math.round(totalMinutes / 60);

  return (
    <View style={styles.row}>
      <StatCard
        icon="time-outline"
        value={`${totalHours}h`}
        label="Horas disponibles"
      />
      <StatCard
        icon="calendar-outline"
        value={String(activeDays.length)}
        label="Días laborables"
      />
      <StatCard
        icon="moon-outline"
        value={String(closedDays.length)}
        label="Días de descanso"
      />
      <View style={styles.baseCard}>
        <Text style={styles.baseTitle}>Horario base</Text>
        <View style={styles.baseRow}>
          <Text style={styles.baseLabel}>Hora mínima de inicio</Text>
          <Text style={styles.baseValue}>9:00 AM</Text>
        </View>
        <View style={styles.baseRow}>
          <Text style={styles.baseLabel}>Hora máxima de fin</Text>
          <Text style={styles.baseValue}>8:00 PM</Text>
        </View>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.white,
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
  },
  baseCard: {
    flex: 2,
    minWidth: 180,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
    gap: spacing.xs,
  },
  baseTitle: {
    ...typography.bodySmall,
    color: colors.gray400,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baseLabel: { ...typography.bodySmall, color: colors.gray500 },
  baseValue: { ...typography.bodySmall, color: colors.white, fontWeight: '600' },
});
