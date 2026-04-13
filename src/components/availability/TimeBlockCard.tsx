import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { TimeBlock } from '../../types/database';

const BLOCK_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  comida: { icon: 'restaurant-outline', color: colors.warning },
  escuela: { icon: 'school-outline', color: colors.info },
  descanso: { icon: 'bed-outline', color: colors.statusConfirmed },
  mandado: { icon: 'car-outline', color: colors.gray700 },
  otro: { icon: 'ellipse-outline', color: colors.gray600 },
};

interface Props {
  block: TimeBlock;
}

export function TimeBlockCard({ block }: Props) {
  const config = BLOCK_TYPE_CONFIG[block.block_type] ?? BLOCK_TYPE_CONFIG.otro;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{block.label}</Text>
        <Text style={styles.time}>
          {block.start_time} - {block.end_time}
        </Text>
        {block.notes && (
          <Text style={styles.notes}>{block.notes}</Text>
        )}
      </View>
      {block.is_recurring && (
        <Ionicons name="repeat" size={14} color={colors.gray400} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  time: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  notes: {
    ...typography.caption,
    color: colors.gray500,
    fontStyle: 'italic',
    marginTop: spacing.xxs,
  },
});
