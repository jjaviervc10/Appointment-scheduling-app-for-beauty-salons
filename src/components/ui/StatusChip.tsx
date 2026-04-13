import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, statusLabels } from '../../theme';
import { typography, radii, spacing } from '../../theme';
import type { AppointmentStatus } from '../../types/enums';

interface Props {
  status: AppointmentStatus;
}

export function StatusChip({ status }: Props) {
  const chipColors = statusColors[status];
  const label = statusLabels[status];

  return (
    <View style={[styles.chip, { backgroundColor: chipColors.bg }]}>
      <Text style={[styles.label, { color: chipColors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
