import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { colors, spacing, typography, radii } from '../../theme';
import type { InstagramProfile, InstagramPublishingLimit } from '../../types/instagram.types';

interface Props {
  profile: InstagramProfile;
  limit: InstagramPublishingLimit | null;
}

function getLimitSummary(limit: InstagramPublishingLimit | null) {
  if (!limit) {
    return {
      remaining: '-',
      used: '-',
      total: '-',
      progress: 0,
      barColor: colors.gray700,
    };
  }

  const used = limit.quotaUsage;
  const total = limit.quotaTotal;
  const remaining = Math.max(0, total - used);
  const progress = total > 0 ? Math.min(1, used / total) : 0;
  const barColor = remaining === 0
    ? colors.error
    : progress >= 0.8
      ? colors.warning
      : colors.success;

  return {
    remaining: String(remaining),
    used: String(used),
    total: String(total),
    progress,
    barColor,
  };
}

export function InstagramProfileCard({ profile, limit }: Props) {
  const summary = getLimitSummary(limit);

  return (
    <SectionCard title="Estado de Instagram">
      <View style={styles.row}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-circle-outline" size={36} color={colors.gold} />
        </View>
        <View style={styles.info}>
          <Text style={styles.username}>@{profile.username}</Text>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.statusText}>Cuenta conectada</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: summary.barColor }]}>{summary.remaining}</Text>
          <Text style={styles.statLabel}>Disponibles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.used}</Text>
          <Text style={styles.statLabel}>Usadas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${summary.progress * 100}%`, backgroundColor: summary.barColor },
          ]}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  username: {
    ...typography.h3,
    color: colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
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
  },
  barFill: {
    height: '100%',
    borderRadius: radii.sm,
  },
});
