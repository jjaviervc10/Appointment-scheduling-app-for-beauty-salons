import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { MOCK_APPOINTMENTS, MOCK_TIME_BLOCKS } from '../../src/services/mock-data';
import { BookingWizardModal, type BookingSubmitInput } from '../../src/components/modals/BookingWizardModal';
import type { TimeSlot } from '../../src/types/models';
import { createPublicBookingRequest } from '../../src/services/bookingApi';
import { formatLocalDateKey } from '../../src/utils/date';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── helpers ──────────────────────────────────────────────────────
const fmt = (d: Date) => formatLocalDateKey(d);
const WORK_START = 9;
const WORK_END = 18;
const SLOT_DURATION = 45;
const MAIN_APP_CLIENT_FULL_NAME = '[APP] Cliente principal';
const MAIN_APP_CLIENT_PHONE = '+526140000000';
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

type ViewMode = 'mes' | 'semana' | 'dia';

function getWeekDates(referenceDate: string) {
  const ref = new Date(referenceDate + 'T12:00:00');
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dow + (dow === 0 ? -6 : 1));
  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: fmt(d), dayLabel: labels[i], dayNum: d.getDate() };
  });
}

function buildAvailableSlots(dateStr: string, duration: number): TimeSlot[] {
  const dayAppts = MOCK_APPOINTMENTS.filter((a) => fmt(a.startAt) === dateStr && a.status !== 'no_show');
  const dayBlocks = MOCK_TIME_BLOCKS.filter((b) => b.date === dateStr);
  const occupied: { start: number; end: number }[] = [];
  for (const a of dayAppts) {
    occupied.push({ start: a.startAt.getHours() * 60 + a.startAt.getMinutes(), end: a.endAt.getHours() * 60 + a.endAt.getMinutes() });
  }
  for (const b of dayBlocks) {
    const [sh, sm] = b.start_time.split(':').map(Number);
    const [eh, em] = b.end_time.split(':').map(Number);
    occupied.push({ start: sh * 60 + sm, end: eh * 60 + em });
  }
  const slots: TimeSlot[] = [];
  let cursor = WORK_START * 60;
  while (cursor + duration <= WORK_END * 60) {
    const slotEnd = cursor + duration;
    const overlaps = occupied.some((o) => cursor < o.end && slotEnd > o.start);
    slots.push({
      startTime: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`,
      isAvailable: !overlaps,
    });
    cursor += duration;
  }
  return slots;
}

function countFreeSlots(dateStr: string): number {
  return buildAvailableSlots(dateStr, SLOT_DURATION).filter((s) => s.isAvailable).length;
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getDotColor(free: number) {
  if (free === 0) return colors.error;
  if (free <= 3) return colors.statusPending;
  return colors.statusConfirmed;
}

function formatHour(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── component ────────────────────────────────────────────────────
export default function BookingScreen() {
  const todayStr = fmt(new Date());
  const todayObj = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const selDateObj = new Date(selectedDate + 'T12:00:00');
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth]);

  const daySlots = useMemo(
    () => buildAvailableSlots(selectedDate, SLOT_DURATION),
    [selectedDate]
  );

  const weekAvailability = useMemo(
    () => weekDates.map((d) => ({ ...d, freeCount: countFreeSlots(d.date), slots: buildAvailableSlots(d.date, SLOT_DURATION) })),
    [weekDates]
  );

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const handleMonthNav = useCallback((delta: number) => {
    setCalMonth((m) => {
      let nm = m + delta;
      if (nm < 0) { setCalYear((y) => y - 1); nm = 11; }
      else if (nm > 11) { setCalYear((y) => y + 1); nm = 0; }
      return nm;
    });
  }, []);

  const handleWeekShift = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T12:00:00');
      d.setDate(d.getDate() + delta * 7);
      return fmt(d);
    });
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowWizard(true);
  };

  const handleBookingSubmit = useCallback(async (input: BookingSubmitInput) => {
    await createPublicBookingRequest({
      fullName: MAIN_APP_CLIENT_FULL_NAME,
      phone: MAIN_APP_CLIENT_PHONE,
      serviceId: input.serviceId,
      startAt: input.startAt,
      notes: input.notes,
      token: undefined,
    });
  }, []);

  const capMonth = (m: number) => MONTHS_ES[m].charAt(0).toUpperCase() + MONTHS_ES[m].slice(1);

  // ── render ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Image source={require('../../assets/LogoJL.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Reservar cita</Text>
          <Text style={styles.headerSubtitle}>Busca disponibilidad y agenda</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── Search / filter chips ── */}
        <View style={styles.searchCard}>
          <View style={styles.searchHeader}>
            <Ionicons name="search" size={18} color={colors.gold} />
            <Text style={styles.searchTitle}>Buscar disponibilidad</Text>
          </View>
          <View style={styles.filterRow}>
            {(['mes', 'semana', 'dia'] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              const label = mode === 'mes' ? 'Mes' : mode === 'semana' ? 'Semana' : 'Día';
              const icon = mode === 'mes' ? 'calendar' : mode === 'semana' ? 'grid' : 'today';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setViewMode(mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon as any} size={16} color={active ? colors.white : colors.gray600} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ══════════════ MES VIEW ══════════════ */}
        {viewMode === 'mes' && (
          <View style={styles.calCard}>
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={() => handleMonthNav(-1)} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={18} color={colors.gray600} />
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>{capMonth(calMonth)} {calYear}</Text>
              <TouchableOpacity onPress={() => handleMonthNav(1)} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.dowRow}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <Text key={d} style={styles.dowText}>{d}</Text>
              ))}
            </View>

            <View style={styles.monthGrid}>
              {monthGrid.map((day, idx) => {
                if (day === null) return <View key={`e${idx}`} style={styles.monthCell} />;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const free = countFreeSlots(dateStr);
                const dotColor = getDotColor(free);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                    onPress={() => { handleDateSelect(dateStr); setViewMode('dia'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.monthDay,
                      isSelected && styles.monthDaySelected,
                      isToday && !isSelected && { color: colors.gold, fontWeight: '700' as const },
                    ]}>{day}</Text>
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.monthFree, isSelected && { color: colors.white + 'BB' }]}>
                      {free === 0 ? '' : free}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.statusConfirmed }]} />
                <Text style={styles.legendText}>4+ libres</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.statusPending }]} />
                <Text style={styles.legendText}>1-3 libres</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>Lleno</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════ SEMANA VIEW (Accordion) ══════════════ */}
        {viewMode === 'semana' && (
          <View style={styles.calCard}>
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={() => handleWeekShift(-1)} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={18} color={colors.gray600} />
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>
                {weekDates[0]?.dayNum}–{weekDates[weekDates.length - 1]?.dayNum} {capMonth(selDateObj.getMonth())}
              </Text>
              <TouchableOpacity onPress={() => handleWeekShift(1)} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {weekAvailability.map((day) => {
              const isExpanded = expandedDay === day.date;
              const freeSlots = day.slots.filter((s) => s.isAvailable);
              const dotColor = getDotColor(day.freeCount);
              const morningSlots = freeSlots.filter((s) => parseInt(s.startTime) < 12);
              const afternoonSlots = freeSlots.filter((s) => parseInt(s.startTime) >= 12);

              return (
                <View key={day.date}>
                  {/* Collapsed row */}
                  <TouchableOpacity
                    style={[styles.weekRow, isExpanded && styles.weekRowExpanded]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedDay(isExpanded ? null : day.date);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.weekDayCol}>
                      <Text style={[styles.weekDayLabel, isExpanded && { color: colors.white }]}>{day.dayLabel}</Text>
                      <Text style={[styles.weekDayNum, isExpanded && { color: colors.white }]}>{day.dayNum}</Text>
                    </View>
                    <View style={styles.weekBarCol}>
                      <View style={styles.weekBarBg}>
                        <View style={[styles.weekBarFill, { width: `${Math.min(100, (day.freeCount / 12) * 100)}%` as any, backgroundColor: dotColor }]} />
                      </View>
                    </View>
                    <View style={[styles.weekFreeBadge, { backgroundColor: dotColor + '18' }]}>
                      <Text style={[styles.weekFreeBadgeText, { color: dotColor }]}>
                        {day.freeCount === 0 ? 'Lleno' : `${day.freeCount} libres`}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={isExpanded ? colors.white : colors.gray400}
                    />
                  </TouchableOpacity>

                  {/* Expanded slot grid */}
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      {freeSlots.length === 0 ? (
                        <View style={styles.accordionEmpty}>
                          <Ionicons name="close-circle-outline" size={24} color={colors.gray300} />
                          <Text style={styles.accordionEmptyText}>Sin disponibilidad este día</Text>
                        </View>
                      ) : (
                        <>
                          {morningSlots.length > 0 && (
                            <>
                              <View style={styles.accordionGroupHeader}>
                                <Ionicons name="sunny-outline" size={14} color={colors.gold} />
                                <Text style={styles.accordionGroupLabel}>Mañana</Text>
                              </View>
                              <View style={styles.accordionGrid}>
                                {morningSlots.map((slot) => {
                                  const isSel = selectedSlot?.startTime === slot.startTime && selectedDate === day.date;
                                  return (
                                    <TouchableOpacity
                                      key={slot.startTime}
                                      style={[styles.accordionSlot, isSel && styles.accordionSlotActive]}
                                      onPress={() => { setSelectedDate(day.date); handleSlotSelect(slot); }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[styles.accordionSlotTime, isSel && { color: colors.white }]}>{slot.startTime}</Text>
                                      <Text style={[styles.accordionSlotEnd, isSel && { color: colors.white + 'AA' }]}>{slot.endTime}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </>
                          )}
                          {afternoonSlots.length > 0 && (
                            <>
                              <View style={styles.accordionGroupHeader}>
                                <Ionicons name="moon-outline" size={14} color={colors.info} />
                                <Text style={styles.accordionGroupLabel}>Tarde</Text>
                              </View>
                              <View style={styles.accordionGrid}>
                                {afternoonSlots.map((slot) => {
                                  const isSel = selectedSlot?.startTime === slot.startTime && selectedDate === day.date;
                                  return (
                                    <TouchableOpacity
                                      key={slot.startTime}
                                      style={[styles.accordionSlot, isSel && styles.accordionSlotActive]}
                                      onPress={() => { setSelectedDate(day.date); handleSlotSelect(slot); }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[styles.accordionSlotTime, isSel && { color: colors.white }]}>{slot.startTime}</Text>
                                      <Text style={[styles.accordionSlotEnd, isSel && { color: colors.white + 'AA' }]}>{slot.endTime}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ══════════════ DÍA VIEW ══════════════ */}
        {viewMode === 'dia' && (
          <View style={styles.calCard}>
            <View style={styles.calNavRow}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() - 1);
                  handleDateSelect(fmt(d));
                }}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-back" size={18} color={colors.gray600} />
              </TouchableOpacity>
              <View style={styles.dayNavCenter}>
                <Text style={styles.calNavTitle}>
                  {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][selDateObj.getDay()]} {selDateObj.getDate()}
                </Text>
                <Text style={styles.dayNavSub}>{capMonth(selDateObj.getMonth())} {selDateObj.getFullYear()}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  handleDateSelect(fmt(d));
                }}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Summary badge */}
            <View style={styles.daySummaryRow}>
              <View style={[styles.daySummaryBadge, { backgroundColor: colors.statusConfirmed + '15' }]}>
                <Text style={[styles.daySummaryText, { color: colors.statusConfirmed }]}>
                  {daySlots.filter((s) => s.isAvailable).length} libres
                </Text>
              </View>
              <View style={[styles.daySummaryBadge, { backgroundColor: colors.error + '15' }]}>
                <Text style={[styles.daySummaryText, { color: colors.error }]}>
                  {daySlots.filter((s) => !s.isAvailable).length} ocupados
                </Text>
              </View>
            </View>

            {/* Hour timeline */}
            {daySlots.map((slot) => {
              const isAvail = slot.isAvailable;
              const isSlotSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  style={[
                    styles.daySlotRow,
                    !isAvail && styles.daySlotOccupied,
                    isSlotSelected && styles.daySlotSelected,
                  ]}
                  onPress={() => isAvail && handleSlotSelect(slot)}
                  activeOpacity={isAvail ? 0.7 : 1}
                  disabled={!isAvail}
                >
                  <Text style={[styles.daySlotTime, isSlotSelected && { color: colors.white }]}>{slot.startTime}</Text>
                  <View style={styles.daySlotDivider} />
                  <View style={styles.daySlotContent}>
                    {isAvail ? (
                      <View style={styles.daySlotAvail}>
                        <Ionicons name="checkmark-circle" size={16} color={isSlotSelected ? colors.white : colors.statusConfirmed} />
                        <Text style={[styles.daySlotAvailText, isSlotSelected && { color: colors.white }]}>Disponible</Text>
                      </View>
                    ) : (
                      <View style={styles.daySlotAvail}>
                        <Ionicons name="lock-closed" size={14} color={colors.gray400} />
                        <Text style={styles.daySlotOccText}>Ocupado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.daySlotEnd, isSlotSelected && { color: colors.white + 'AA' }]}>{slot.endTime}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* ══════════════ BOOKING WIZARD MODAL ══════════════ */}
      <BookingWizardModal
        visible={showWizard}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onClose={() => setShowWizard(false)}
        onConfirm={() => { setShowWizard(false); setSelectedSlot(null); }}
        onSubmit={handleBookingSubmit}
      />
    </SafeAreaView>
  );
}

// ── styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  header: {
    backgroundColor: colors.black, paddingHorizontal: spacing.xl,
    paddingTop: spacing.md, paddingBottom: spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  headerLogo: { width: 48, height: 48 },
  headerTextBlock: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSubtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: {
    flex: 1, backgroundColor: colors.black,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
  },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },

  // Search card
  searchCard: {
    backgroundColor: colors.gray900, borderRadius: radii.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.gray800, gap: spacing.md,
  },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchTitle: { ...typography.subtitle, color: colors.white },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderRadius: radii.md, backgroundColor: colors.gray800,
  },
  filterChipActive: { backgroundColor: colors.black },
  filterChipText: { ...typography.caption, color: colors.gray400, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },

  // Calendar card (shared)
  calCard: {
    backgroundColor: colors.gray900, borderRadius: radii.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.gray800, gap: spacing.sm,
  },
  calNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  calNavBtn: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: colors.gray800, justifyContent: 'center', alignItems: 'center',
  },
  calNavTitle: { ...typography.subtitle, color: colors.white, fontSize: 15 },

  // Month view
  dowRow: { flexDirection: 'row', marginBottom: spacing.xxs },
  dowText: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.gray400, fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%' as any, alignItems: 'center', paddingVertical: 6, gap: 1 },
  monthCellSelected: { backgroundColor: colors.black, borderRadius: radii.sm },
  monthDay: { ...typography.bodySmall, color: colors.white, fontSize: 13 },
  monthDaySelected: { color: colors.white, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  monthFree: { fontSize: 8, color: colors.gray400, fontWeight: '500' },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    marginTop: spacing.xs, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.gray800,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.gray500, fontSize: 10 },

  // Week view (accordion)
  weekRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radii.md, borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  weekRowExpanded: { backgroundColor: colors.black, borderBottomColor: 'transparent', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  weekDayCol: { width: 40, alignItems: 'center' },
  weekDayLabel: { ...typography.caption, color: colors.gray500 },
  weekDayNum: { ...typography.subtitle, color: colors.white },
  weekBarCol: { flex: 1, gap: 3 },
  weekBarBg: { height: 6, backgroundColor: colors.gray800, borderRadius: 3, overflow: 'hidden' },
  weekBarFill: { height: '100%' as any, borderRadius: 3 },
  weekFreeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full },
  weekFreeBadgeText: { fontSize: 10, fontWeight: '700' },

  // Accordion body
  accordionBody: {
    backgroundColor: colors.gray900, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomLeftRadius: radii.md, borderBottomRightRadius: radii.md,
    marginBottom: spacing.xs,
  },
  accordionEmpty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  accordionEmptyText: { ...typography.bodySmall, color: colors.gray400 },
  accordionGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xs, marginBottom: spacing.xs },
  accordionGroupLabel: { ...typography.caption, color: colors.gray500, fontWeight: '700', textTransform: 'uppercase', fontSize: 10 },
  accordionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  accordionSlot: {
    width: '31%' as any, alignItems: 'center', paddingVertical: spacing.sm,
    backgroundColor: colors.gray800, borderRadius: radii.md, borderWidth: 1, borderColor: colors.gray700,
  },
  accordionSlotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  accordionSlotTime: { ...typography.subtitle, color: colors.white, fontSize: 13 },
  accordionSlotEnd: { ...typography.caption, color: colors.gray400, fontSize: 10 },

  // Day view
  dayNavCenter: { alignItems: 'center' },
  dayNavSub: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  daySummaryRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  daySummaryBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  daySummaryText: { ...typography.caption, fontWeight: '700' },
  daySlotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radii.md, borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  daySlotOccupied: { opacity: 0.45 },
  daySlotSelected: { backgroundColor: colors.gold, borderBottomColor: 'transparent' },
  daySlotTime: { ...typography.subtitle, color: colors.white, width: 50, fontSize: 13 },
  daySlotDivider: { width: 1, height: 24, backgroundColor: colors.gray700 },
  daySlotContent: { flex: 1 },
  daySlotAvail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  daySlotAvailText: { ...typography.bodySmall, color: colors.statusConfirmed, fontWeight: '600' },
  daySlotOccText: { ...typography.bodySmall, color: colors.gray400 },
  daySlotEnd: { ...typography.caption, color: colors.gray400, fontSize: 11 },


});
