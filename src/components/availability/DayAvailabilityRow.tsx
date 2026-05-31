import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import { format12h } from './TimeDropdown';

interface DayAvailabilityRowProps {
  day: WeeklyAvailability;
  dayShortName: string;
  dayDate: string;
  dayMonth: string;
  isToday: boolean;
  isEditing: boolean;
  onEdit: () => void;
}

export function DayAvailabilityRow({
  day,
  dayShortName,
  dayDate,
  dayMonth,
  isToday,
  isEditing,
  onEdit,
}: DayAvailabilityRowProps) {
  return (
    <View
      style={[
        styles.row,
        isEditing && styles.rowEditing,
        isToday && styles.rowToday,
      ]}
    >
      {/* Day + date */}
      <View style={styles.dateCell}>
        <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
          {dayShortName}
        </Text>
        <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
          {dayDate} {dayMonth}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.statusCell}>
        <View
          style={[styles.dot, day.is_active ? styles.dotActive : styles.dotClosed]}
        />
        <Text
          style={[
            styles.statusText,
            day.is_active ? styles.statusActive : styles.statusClosed,
          ]}
        >
          {day.is_active ? 'Disponible' : 'Cerrado'}
        </Text>
      </View>

      {/* Time range */}
      <View style={styles.timeCell}>
        {day.is_active ? (
          <Text style={styles.timeText}>
            {format12h(day.start_time)}{'  —  '}{format12h(day.end_time)}
          </Text>
        ) : (
          <Text style={styles.timeDash}>—</Text>
        )}
      </View>

      {/* Edit button */}
      <TouchableOpacity
        style={[styles.editBtn, isEditing && styles.editBtnActive]}
        onPress={onEdit}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="create-outline"
          size={18}
          color={isEditing ? colors.gold : colors.gray500}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    gap: spacing.sm,
    minHeight: 56,
  },
  rowEditing: {
    backgroundColor: colors.gold + '08',
  },
  rowToday: {
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  dateCell: { width: 70 },
  dayName: {
    ...typography.bodySmall,
    color: colors.gray400,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  dayNameToday: { color: colors.gold },
  dayDate: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
    fontSize: 11,
  },
  dayDateToday: { color: colors.gold + 'AA' },
  statusCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 108,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { backgroundColor: '#4CAF50' },
  dotClosed: { backgroundColor: colors.gray600 },
  statusText: { ...typography.bodySmall, fontWeight: '500', fontSize: 13 },
  statusActive: { color: '#4CAF50' },
  statusClosed: { color: colors.gray500 },
  timeCell: { flex: 1 },
  timeText: { ...typography.bodySmall, color: colors.gray300 },
  timeDash: { ...typography.bodySmall, color: colors.gray700 },
  editBtn: {
    padding: spacing.xs,
    borderRadius: radii.sm,
  },
  editBtnActive: {
    backgroundColor: colors.gold + '14',
  },
});
