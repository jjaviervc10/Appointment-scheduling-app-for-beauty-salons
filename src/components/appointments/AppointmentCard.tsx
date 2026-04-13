import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { StatusChip } from '../ui/StatusChip';
import type { AppointmentViewModel } from '../../types/models';

interface Props {
  appointment: AppointmentViewModel;
  variant?: 'default' | 'featured' | 'owner';
}

export function AppointmentCard({ appointment, variant = 'default' }: Props) {
  const timeStr = appointment.startAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = appointment.endAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isFeatured = variant === 'featured';

  return (
    <View
      style={[
        styles.card,
        isFeatured && styles.featuredCard,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.timeContainer}>
          <Text style={[styles.time, isFeatured && styles.featuredTime]}>
            {timeStr}
          </Text>
          <Text style={styles.timeSep}>-</Text>
          <Text style={styles.timeEnd}>{endStr}</Text>
        </View>
        <StatusChip status={appointment.status} />
      </View>

      <Text style={[styles.service, isFeatured && styles.featuredService]}>
        {appointment.serviceName}
      </Text>

      {variant === 'owner' && (
        <Text style={styles.clientName}>{appointment.clientName}</Text>
      )}

      {isFeatured && (
        <View style={styles.featuredMeta}>
          <Text style={styles.featuredMetaText}>
            {appointment.durationMinutes} min
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  featuredCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  featuredTime: {
    ...typography.h3,
    color: colors.gray900,
  },
  timeSep: {
    ...typography.body,
    color: colors.gray400,
  },
  timeEnd: {
    ...typography.body,
    color: colors.gray600,
  },
  service: {
    ...typography.body,
    color: colors.gray700,
  },
  featuredService: {
    ...typography.subtitle,
    color: colors.gray800,
  },
  clientName: {
    ...typography.bodySmall,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  featuredMeta: {
    marginTop: spacing.sm,
  },
  featuredMetaText: {
    ...typography.caption,
    color: colors.gray500,
  },
});
