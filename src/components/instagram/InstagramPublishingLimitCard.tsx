import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SectionCard } from '../ui/SectionCard';
import { colors, spacing, typography, radii } from '../../theme';
import type { InstagramPublishingLimit } from '../../types/instagram.types';

interface Props {
  limit: InstagramPublishingLimit;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Ventana: ${days} dia${days !== 1 ? 's' : ''}`;
  }
  return `Ventana: ${hours} hora${hours !== 1 ? 's' : ''}`;
}

export function InstagramPublishingLimitCard({ limit }: Props) {
  const used = limit.quotaUsage;
  const total = limit.quotaTotal;
  const remaining = Math.max(0, total - used);
  const progress = total > 0 ? Math.min(1, used / total) : 0;
  const isWarning = progress >= 0.8;
  const isDepleted = remaining === 0;
  const barColor = isDepleted ? colors.error : isWarning ? colors.warning : colors.success;
  const durationText = formatDuration(limit.quotaDurationSeconds);

  return (
    <SectionCard title="Cuota de publicacion">
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: barColor }]}>{remaining}</Text>
          <Text style={styles.statLabel}>Disponibles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{used}</Text>
          <Text style={styles.statLabel}>Usadas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
      </View>

      {durationText ? (
        <Text style={styles.duration}>{durationText}</Text>
      ) : null}

      {isDepleted ? (
        <Text style={styles.alertText}>Cuota agotada. No puedes publicar en este momento.</Text>
      ) : isWarning ? (
        <Text style={styles.warningText}>Cuota casi agotada. Quedan {remaining} publicaciones.</Text>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.white,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.gray800,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: radii.sm,
  },
  duration: {
    ...typography.caption,
    color: colors.gray500,
  },
  alertText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
});
