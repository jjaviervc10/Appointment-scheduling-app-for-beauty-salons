import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { CalendarDayCell } from './CalendarDayCell';
import { getMockWeekSummary } from '../../services/mock-data';
import type { DaySummary } from '../../types/models';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addWeeks(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n * 7);
  return result;
}

interface WeekCalendarViewProps {
  onDayPress?: (date: string) => void;
  /** Compact mode hides the hint bar */
  compact?: boolean;
}

export function WeekCalendarView({ onDayPress, compact }: WeekCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekSummary: DaySummary[] = useMemo(
    () => getMockWeekSummary(weekStart),
    [weekStart],
  );

  const goToPrevWeek = useCallback(() => setWeekStart(w => addWeeks(w, -1)), []);
  const goToNextWeek = useCallback(() => setWeekStart(w => addWeeks(w, 1)), []);
  const goToCurrentWeek = useCallback(() => setWeekStart(getMonday(new Date())), []);

  const totalAppts = weekSummary.reduce((s, d) => s + d.totalAppointments, 0);
  const totalConfirmed = weekSummary.reduce((s, d) => s + d.confirmedCount, 0);
  const totalPending = weekSummary.reduce((s, d) => s + d.pendingCount, 0);
  const avgOccupation = Math.round(
    weekSummary.reduce((s, d) => s + d.occupationPercent, 0) / 7,
  );

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={goToPrevWeek} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToCurrentWeek}>
          <Text style={styles.navCurrentLabel}>Semana actual</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaderRow}>
        {DAY_LABELS.map(label => (
          <View key={label} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {weekSummary.map(day => (
          <CalendarDayCell
            key={day.date}
            summary={day}
            isToday={day.date === new Date().toISOString().split('T')[0]}
            onPress={() => onDayPress?.(day.date)}
          />
        ))}
      </View>

      {/* Weekly Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen semanal</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{totalAppts}</Text>
            <Text style={styles.summaryItemLabel}>Citas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryItemValue, { color: colors.statusConfirmed }]}>{totalConfirmed}</Text>
            <Text style={styles.summaryItemLabel}>Confirmadas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryItemValue, { color: colors.statusPending }]}>{totalPending}</Text>
            <Text style={styles.summaryItemLabel}>Pendientes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryItemValue, { color: colors.gold }]}>{avgOccupation}%</Text>
            <Text style={styles.summaryItemLabel}>Ocupación</Text>
          </View>
        </View>
      </View>

      {!compact && (
        <View style={styles.hintBar}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
          <Text style={styles.hintText}>Al tocar un día se abre la vista operativa completa</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  navCurrentLabel: { ...typography.buttonSmall, color: colors.gold },
  dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderText: { ...typography.caption, color: colors.gray600 },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  summaryTitle: { ...typography.h3, color: colors.gray900, marginBottom: spacing.md },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryItemValue: { ...typography.h2, color: colors.gray900 },
  summaryItemLabel: { ...typography.caption, color: colors.gray600, marginTop: spacing.xxs },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hintText: { ...typography.caption, color: colors.gray500 },
});
