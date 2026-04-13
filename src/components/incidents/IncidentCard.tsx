import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { Incident } from '../../types/database';

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  low: { color: colors.info, bgColor: colors.infoLight, label: 'Baja' },
  medium: { color: colors.warning, bgColor: colors.warningLight, label: 'Media' },
  high: { color: colors.error, bgColor: colors.errorLight, label: 'Alta' },
  emergency: { color: colors.error, bgColor: colors.errorLight, label: 'Emergencia' },
};

interface Props {
  incident: Incident;
  showActions?: boolean;
}

export function IncidentCard({ incident, showActions }: Props) {
  const severity = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.medium;

  return (
    <View style={[styles.card, { borderLeftColor: severity.color }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="warning" size={16} color={severity.color} />
          <Text style={styles.title}>{incident.title}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: severity.bgColor }]}>
          <Text style={[styles.severityText, { color: severity.color }]}>
            {severity.label}
          </Text>
        </View>
      </View>

      {incident.description && (
        <Text style={styles.description}>{incident.description}</Text>
      )}

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={14} color={colors.gray500} />
        <Text style={styles.timeText}>
          Bloqueo: {incident.block_start_time} - {incident.block_end_time}
        </Text>
      </View>

      {incident.affected_appointment_ids.length > 0 && (
        <Text style={styles.affected}>
          Clientes afectados: {incident.affected_appointment_ids.length}
        </Text>
      )}

      {showActions && !incident.is_resolved && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={14} color={colors.white} />
            <Text style={styles.actionBtnText}>Avisar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnOutline} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.gray700} />
            <Text style={styles.actionBtnOutlineText}>Reprogramar</Text>
          </TouchableOpacity>
        </View>
      )}

      {incident.is_resolved && (
        <View style={styles.resolvedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.statusConfirmed} />
          <Text style={styles.resolvedText}>Resuelta</Text>
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
    borderLeftWidth: 4,
    gap: spacing.sm,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    color: colors.gray900,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  severityText: {
    ...typography.caption,
    fontWeight: '600',
  },
  description: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  affected: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  actionBtnText: {
    ...typography.buttonSmall,
    color: colors.white,
    fontSize: 12,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray400,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  actionBtnOutlineText: {
    ...typography.buttonSmall,
    color: colors.gray700,
    fontSize: 12,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resolvedText: {
    ...typography.caption,
    color: colors.statusConfirmed,
  },
});
