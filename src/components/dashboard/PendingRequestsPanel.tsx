import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { TimelineFilterKey } from './TodayTimeline';

interface PendingRequestsPanelProps {
  /** Total pending_owner_approval appointments (all dates) */
  count: number;
  /** Total awaiting_client_confirmation appointments (all dates) */
  awaitingCount: number;
  activeFilter: TimelineFilterKey;
  onFilterPending: () => void;
  onClearFilter: () => void;
}

export function PendingRequestsPanel({
  count,
  awaitingCount,
  activeFilter,
  onFilterPending,
  onClearFilter,
}: PendingRequestsPanelProps) {
  const isPendingFilter = activeFilter === 'pending';

  if (count === 0 && awaitingCount === 0) {
    return (
      <View style={styles.bannerEmpty}>
        <Ionicons name="checkmark-circle-outline" size={15} color={colors.statusConfirmed} />
        <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      {/* Pending badge */}
      {count > 0 && (
        <View style={styles.badgeGroup}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
          <Text style={styles.label}>
            {count === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </Text>
        </View>
      )}

      {/* Awaiting badge */}
      {awaitingCount > 0 && (
        <View style={styles.badgeGroup}>
          <View style={styles.awaitingBadge}>
            <Text style={styles.badgeText}>{awaitingCount}</Text>
          </View>
          <Text style={styles.awaitingLabel}>
            {awaitingCount === 1 ? 'en espera' : 'en espera'}
          </Text>
        </View>
      )}

      {/* Filter toggle */}
      {count > 0 && (
        <TouchableOpacity
          style={[styles.filterBtn, isPendingFilter && styles.filterBtnActive]}
          onPress={isPendingFilter ? onClearFilter : onFilterPending}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPendingFilter ? 'funnel' : 'funnel-outline'}
            size={12}
            color={isPendingFilter ? colors.gold : colors.gray400}
          />
          <Text style={[styles.filterBtnText, isPendingFilter && styles.filterBtnTextActive]}>
            {isPendingFilter ? 'Ver todas' : 'Ver pendientes'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    flexWrap: 'wrap',
  },
  bannerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.statusPending,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  awaitingBadge: {
    backgroundColor: colors.statusAwaitingClient,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  label: {
    ...typography.caption,
    color: colors.statusPending,
    fontSize: 12,
    fontWeight: '600',
  },
  awaitingLabel: {
    ...typography.caption,
    color: colors.statusAwaitingClient,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gray700,
    marginLeft: 'auto' as any,
  },
  filterBtnActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '18',
  },
  filterBtnText: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: colors.gold,
  },
});

