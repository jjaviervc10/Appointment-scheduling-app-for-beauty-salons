import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { DaySummary } from '../../types/models';

interface Props {
  summary: DaySummary;
  isToday: boolean;
  onPress: () => void;
}

export function CalendarDayCell({ summary, isToday, onPress }: Props) {
  const d = new Date(summary.date + 'T12:00:00');
  const dayNum = d.getDate();
  const isSunday = d.getDay() === 0;

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        isToday && styles.todayCell,
        isSunday && styles.closedCell,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.dayNum, isToday && styles.todayText]}>
        {dayNum}
      </Text>

      {!isSunday && (
        <>
          {/* Occupation bar */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.min(summary.occupationPercent, 100)}%`,
                  backgroundColor:
                    summary.occupationPercent > 80
                      ? colors.error
                      : summary.occupationPercent > 50
                      ? colors.gold
                      : colors.statusConfirmed,
                },
              ]}
            />
          </View>

          <Text style={styles.countText}>{summary.totalAppointments}</Text>

          {summary.hasIncident && (
            <Ionicons
              name="warning"
              size={10}
              color={colors.error}
              style={styles.warningIcon}
            />
          )}
        </>
      )}

      {isSunday && <Text style={styles.closedText}>—</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderRadius: radii.sm,
    padding: spacing.xs,
    alignItems: 'center',
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  closedCell: {
    backgroundColor: colors.gray800,
    opacity: 0.6,
  },
  dayNum: {
    ...typography.subtitle,
    color: colors.white,
    marginBottom: spacing.xxs,
  },
  todayText: {
    color: colors.gold,
  },
  barContainer: {
    width: '100%',
    height: 4,
    backgroundColor: colors.gray700,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xxs,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  countText: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
  },
  closedText: {
    ...typography.caption,
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  warningIcon: {
    marginTop: spacing.xxs,
  },
});
