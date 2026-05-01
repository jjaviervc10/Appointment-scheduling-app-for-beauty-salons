import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { formatLocalDateKey } from '../../utils/date';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

function getWeekDates(referenceDate: string): { date: string; dayLabel: string; dayNum: number }[] {
  const ref = new Date(referenceDate + 'T12:00:00');
  const dayOfWeek = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: formatLocalDateKey(d),
      dayLabel: labels[i],
      dayNum: d.getDate(),
    };
  });
}

export function WeeklyCalendarStrip({ selectedDate, onSelectDate }: Props) {
  const today = formatLocalDateKey(new Date());
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {weekDates.map((item) => {
        const isSelected = item.date === selectedDate;
        const isToday = item.date === today;
        return (
          <TouchableOpacity
            key={item.date}
            style={[
              styles.dayCell,
              isSelected && styles.selectedCell,
              isToday && !isSelected && styles.todayCell,
            ]}
            onPress={() => onSelectDate(item.date)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayLabel,
                isSelected && styles.selectedText,
              ]}
            >
              {item.dayLabel}
            </Text>
            <Text
              style={[
                styles.dayNum,
                isSelected && styles.selectedText,
                isToday && !isSelected && styles.todayNum,
              ]}
            >
              {item.dayNum}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    minWidth: 48,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  selectedCell: {
    backgroundColor: colors.black,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: colors.gold,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.gray400,
    marginBottom: spacing.xxs,
  },
  dayNum: {
    ...typography.subtitle,
    color: colors.white,
  },
  selectedText: {
    color: colors.white,
  },
  todayNum: {
    color: colors.gold,
  },
});
