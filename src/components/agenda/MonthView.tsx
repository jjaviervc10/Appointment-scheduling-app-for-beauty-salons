import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { statusColors } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';
import { formatLocalDateKey } from '../../utils/date';

interface MonthViewProps {
  date: Date;
  appointments: AppointmentViewModel[];
  onMonthChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
}

const DAYS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function fmt(d: Date): string {
  return formatLocalDateKey(d);
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function MonthView({ date, appointments, onMonthChange, onDayPress }: MonthViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const year = date.getFullYear();
  const month = date.getMonth();
  const calDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const todayStr = fmt(new Date());

  const navigateMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d);
  };

  // Count appointments per day
  const dayData = useMemo(() => {
    const result: Record<string, { total: number; confirmed: number; pending: number; cancelled: number; appointments: AppointmentViewModel[] }> = {};
    for (const a of appointments) {
      const dateStr = fmt(a.startAt);
      if (!result[dateStr]) result[dateStr] = { total: 0, confirmed: 0, pending: 0, cancelled: 0, appointments: [] };
      result[dateStr].total++;
      result[dateStr].appointments.push(a);
      if (a.status === 'client_confirmed' || a.status === 'confirmed_by_owner' || a.status === 'completed') result[dateStr].confirmed++;
      else if (a.status === 'pending_owner_approval') result[dateStr].pending++;
      else if (a.status === 'client_cancelled' || a.status === 'owner_cancelled') result[dateStr].cancelled++;
    }
    return result;
  }, [appointments]);

  const getOccupationColor = (total: number) => {
    if (total === 0) return 'transparent';
    if (total <= 2) return colors.statusConfirmed + '20';
    if (total <= 4) return colors.gold + '20';
    return colors.statusPending + '20';
  };

  const handleDayPress = (day: Date) => {
    setSelectedDay(day);
  };

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS_ES[month]} {year}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onMonthChange(new Date())} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Este mes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Day headers */}
        <View style={styles.daysHeader}>
          {DAYS_HEADER.map((d) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calDays.map((day, idx) => {
            if (!day) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }
            const dateStr = fmt(day);
            const isToday = dateStr === todayStr;
            const data = dayData[dateStr];
            const total = data?.total || 0;
            const occupationBg = getOccupationColor(total);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.dayCell, { backgroundColor: occupationBg }, isToday && styles.dayCellToday]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <View style={styles.dayCellHeader}>
                  <Text style={[styles.dayCellNum, isToday && styles.dayCellNumToday]}>
                    {day.getDate()}
                  </Text>
                  {total > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{total}</Text>
                    </View>
                  )}
                </View>

                {/* Mini appointment list */}
                {data?.appointments.slice(0, 3).map((appt) => {
                  const sc = statusColors[appt.status as keyof typeof statusColors] || { text: colors.gray600, bg: colors.gray200 };
                  return (
                    <View key={appt.id} style={styles.miniAppt}>
                      <View style={[styles.miniDot, { backgroundColor: sc.text }]} />
                      <Text style={styles.miniText} numberOfLines={1}>
                        {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} {appt.clientName.split(' ')[0]}
                      </Text>
                    </View>
                  );
                })}
                {total > 3 && (
                  <Text style={styles.moreText}>+{total - 3} más</Text>
                )}

                {/* Occupation bar */}
                {total > 0 && (
                  <View style={styles.occupationBar}>
                    <View
                      style={[styles.occupationFill, {
                        width: `${Math.min(100, (total / 6) * 100)}%`,
                        backgroundColor: total <= 2 ? colors.statusConfirmed : total <= 4 ? colors.gold : colors.statusPending,
                      }]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.statusConfirmed }]} />
            <Text style={styles.legendText}>Bajo (1-2)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.legendText}>Medio (3-4)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.statusPending }]} />
            <Text style={styles.legendText}>Alto (5+)</Text>
          </View>
        </View>
      </ScrollView>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          appointments={dayData[fmt(selectedDay)]?.appointments || []}
          onClose={() => setSelectedDay(null)}
          onOpenDay={() => { onDayPress(selectedDay); setSelectedDay(null); }}
        />
      )}
    </View>
  );
}

function DayDetailModal({ day, appointments, onClose, onOpenDay }: {
  day: Date; appointments: AppointmentViewModel[]; onClose: () => void; onOpenDay: () => void;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={mdStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={mdStyles.card}>
          <View style={mdStyles.header}>
            <Text style={mdStyles.title}>
              {day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {appointments.length === 0 ? (
            <View style={mdStyles.empty}>
              <Ionicons name="calendar-outline" size={32} color={colors.gray300} />
              <Text style={mdStyles.emptyText}>Sin citas este día</Text>
            </View>
          ) : (
            <View style={mdStyles.list}>
              {appointments.map((appt) => {
                const sc = statusColors[appt.status as keyof typeof statusColors] || { text: colors.gray600, bg: colors.gray200 };
                return (
                  <View key={appt.id} style={[mdStyles.apptRow, { borderLeftColor: sc.text }]}>
                    <Text style={mdStyles.apptTime}>
                      {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={mdStyles.apptInfo}>
                      <Text style={mdStyles.apptName}>{appt.clientName}</Text>
                      <Text style={mdStyles.apptService}>{appt.serviceName}</Text>
                    </View>
                    <View style={[mdStyles.statusChip, { backgroundColor: sc.bg }]}>
                      <View style={[mdStyles.statusDot, { backgroundColor: sc.text }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={mdStyles.openBtn} onPress={onOpenDay} activeOpacity={0.7}>
            <Text style={mdStyles.openBtnText}>Abrir vista del día</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const mdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.gray900, borderRadius: radii.lg, padding: spacing.xxl, width: 400, maxHeight: '80%', borderWidth: 1, borderColor: colors.gray800 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.white, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.gray400 },
  list: { gap: spacing.sm },
  apptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderLeftWidth: 3, backgroundColor: colors.gray800, borderRadius: radii.sm, gap: spacing.md },
  apptTime: { ...typography.caption, color: colors.gray500, width: 40 },
  apptInfo: { flex: 1, gap: spacing.xxs },
  apptName: { ...typography.subtitle, color: colors.white, fontSize: 13 },
  apptService: { ...typography.caption, color: colors.gray400 },
  statusChip: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray800 },
  openBtnText: { ...typography.subtitle, color: colors.gold, fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.black, borderBottomWidth: 1, borderBottomColor: colors.gray800,
    gap: spacing.sm,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: radii.sm,
    backgroundColor: colors.gray800, justifyContent: 'center', alignItems: 'center',
  },
  monthLabel: { ...typography.subtitle, color: colors.white, fontSize: 16, flex: 1, textAlign: 'center' },
  todayBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.sm, backgroundColor: colors.gold + '15' },
  todayBtnText: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  scrollView: { flex: 1, backgroundColor: colors.black },
  daysHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.gray800, paddingVertical: spacing.sm },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderText: { ...typography.caption, color: colors.gray500, fontSize: 11, textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', minHeight: 100,
    borderBottomWidth: 1, borderBottomColor: colors.gray800,
    borderRightWidth: 1, borderRightColor: colors.gray800,
    padding: spacing.xs,
  },
  dayCellToday: { borderWidth: 2, borderColor: colors.gold },
  dayCellHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxs },
  dayCellNum: { ...typography.bodySmall, color: colors.white, fontWeight: '500', fontSize: 13 },
  dayCellNumToday: { color: colors.gold, fontWeight: '700' },
  countBadge: { backgroundColor: colors.gray800, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  countBadgeText: { ...typography.caption, color: colors.white, fontSize: 9, fontWeight: '700' },
  miniAppt: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginBottom: 1 },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  miniText: { ...typography.caption, color: colors.gray400, fontSize: 9, flex: 1 },
  moreText: { ...typography.caption, color: colors.gray400, fontSize: 9, marginTop: 1 },
  occupationBar: { height: 3, backgroundColor: colors.gray800, borderRadius: 2, marginTop: spacing.xxs },
  occupationFill: { height: 3, borderRadius: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.gray500 },
});
