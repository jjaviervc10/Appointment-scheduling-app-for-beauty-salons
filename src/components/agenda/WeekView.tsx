import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { statusColors } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';
import type { TimeBlock } from '../../types/database';

interface WeekViewProps {
  weekStart: Date;
  appointments: AppointmentViewModel[];
  blocks: TimeBlock[];
  onWeekChange: (weekStart: Date) => void;
  onAppointmentPress: (id: string) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 20;
const COL_MIN_WIDTH = 120;
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function WeekView({ weekStart, appointments, blocks, onWeekChange, onAppointmentPress }: WeekViewProps) {
  const monday = useMemo(() => getMonday(weekStart), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);
  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i), []);
  const todayStr = fmt(new Date());

  const navigateWeek = (delta: number) => {
    const newDate = new Date(monday);
    newDate.setDate(monday.getDate() + delta * 7);
    onWeekChange(newDate);
  };

  const formatRange = () => {
    const endDay = new Date(monday);
    endDay.setDate(monday.getDate() + 6);
    return `${monday.getDate()} - ${endDay.getDate()} de ${monday.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
  };

  const getTop = (time: Date | string) => {
    let h: number, m: number;
    if (typeof time === 'string') { [h, m] = time.split(':').map(Number); }
    else { h = time.getHours(); m = time.getMinutes(); }
    return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  };

  const getHeight = (minutes: number) => Math.max((minutes / 60) * HOUR_HEIGHT, 28);

  return (
    <View style={styles.container}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{formatRange()}</Text>
        <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onWeekChange(new Date())} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Esta semana</Text>
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      <View style={styles.headerRow}>
        <View style={styles.hourCol} />
        {days.map((d) => {
          const isToday = fmt(d) === todayStr;
          return (
            <View key={fmt(d)} style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{DAYS_ES[d.getDay()]}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{d.getDate()}</Text>
            </View>
          );
        })}
      </View>

      {/* Grid */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Hour labels column */}
          <View style={styles.hourCol}>
            {hours.map((hour) => (
              <View key={hour} style={[styles.hourCell, { height: HOUR_HEIGHT }]}>
                <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {days.map((day) => {
            const dateStr = fmt(day);
            const dayAppts = appointments.filter(a => fmt(a.startAt) === dateStr);
            const dayBlocks = blocks.filter(b => b.date === dateStr);
            const isToday = dateStr === todayStr;

            return (
              <View key={dateStr} style={[styles.dayCol, isToday && styles.dayColToday]}>
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <View key={hour} style={[styles.gridCell, { height: HOUR_HEIGHT }]} />
                ))}

                {/* Blocks */}
                {dayBlocks.map((block) => {
                  const top = getTop(block.start_time);
                  const [sh, sm] = block.start_time.split(':').map(Number);
                  const [eh, em] = block.end_time.split(':').map(Number);
                  const dur = (eh * 60 + em) - (sh * 60 + sm);
                  return (
                    <View key={block.id} style={[styles.blockChip, { top, height: getHeight(dur) }]}>
                      <Text style={styles.blockChipText} numberOfLines={1}>{block.label}</Text>
                    </View>
                  );
                })}

                {/* Appointments */}
                {dayAppts.map((appt) => {
                  const top = getTop(appt.startAt);
                  const height = getHeight(appt.durationMinutes);
                  const sc = statusColors[appt.status as keyof typeof statusColors] || { text: colors.gray600, bg: colors.gray200 };
                  return (
                    <TouchableOpacity
                      key={appt.id}
                      style={[styles.apptChip, { top, height, backgroundColor: sc.bg, borderLeftColor: sc.text }]}
                      onPress={() => onAppointmentPress(appt.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.apptChipName, { color: sc.text }]} numberOfLines={1}>
                        {appt.clientName}
                      </Text>
                      <Text style={styles.apptChipTime} numberOfLines={1}>
                        {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    gap: spacing.sm,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: radii.sm,
    backgroundColor: colors.gray800, justifyContent: 'center', alignItems: 'center',
  },
  weekLabel: {
    ...typography.subtitle, color: colors.white, fontSize: 14,
    flex: 1, textAlign: 'center', textTransform: 'capitalize',
  },
  todayBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radii.sm, backgroundColor: colors.gold + '15',
  },
  todayBtnText: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  hourCol: { width: 52 },
  dayHeader: {
    flex: 1, minWidth: COL_MIN_WIDTH,
    alignItems: 'center', paddingVertical: spacing.sm,
  },
  dayHeaderToday: { backgroundColor: colors.gold + '08' },
  dayName: { ...typography.caption, color: colors.gray500, fontSize: 11, textTransform: 'uppercase' },
  dayNameToday: { color: colors.gold },
  dayNum: { ...typography.subtitle, color: colors.white, fontSize: 16 },
  dayNumToday: { color: colors.gold },
  scrollView: { flex: 1 },
  grid: { flexDirection: 'row' },
  hourCell: { justifyContent: 'flex-start', paddingTop: 0 },
  hourText: {
    ...typography.caption, color: colors.gray400, fontSize: 10,
    textAlign: 'right', paddingRight: spacing.xs, marginTop: -6,
  },
  dayCol: {
    flex: 1, minWidth: COL_MIN_WIDTH, position: 'relative',
    borderLeftWidth: 1, borderLeftColor: colors.gray800,
  },
  dayColToday: { backgroundColor: colors.gold + '04' },
  gridCell: { borderBottomWidth: 1, borderBottomColor: colors.gray800 },
  blockChip: {
    position: 'absolute', left: 2, right: 2,
    backgroundColor: colors.gray800, borderRadius: radii.sm,
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.gray700, borderStyle: 'dashed',
  },
  blockChipText: { ...typography.caption, color: colors.gray500, fontSize: 9 },
  apptChip: {
    position: 'absolute', left: 2, right: 2,
    borderRadius: radii.sm, borderLeftWidth: 3,
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs,
    justifyContent: 'center',
  },
  apptChipName: { ...typography.caption, fontWeight: '600', fontSize: 10 },
  apptChipTime: { ...typography.caption, color: colors.gray500, fontSize: 9 },
});
