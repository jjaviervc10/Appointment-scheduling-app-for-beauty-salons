import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';
import { MOCK_APPOINTMENTS } from '../../services/mock-data';
import { formatLocalDateKey, formatLocalDateTimeWithOffset } from '../../utils/date';
import { rescheduleOwnerAppointment } from '../../services/ownerApi';
import { getPublicAvailability } from '../../services/bookingApi';

/** Result returned to the dashboard after a successful POST /reschedule */
export interface RescheduleSimulationResult {
  appointmentId: string;
  /** awaiting_client_confirmation when newStartAt was sent (Scenario A); reschedule_required otherwise */
  newStatus: 'awaiting_client_confirmation' | 'reschedule_required';
  /** ISO 8601 with -06:00 offset — visible slot chosen (no buffers). null for Scenario B */
  newStartAt: string | null;
  /** YYYY-MM-DD of new slot. null for Scenario B */
  newDate: string | null;
  /** From API response — requested_start_at including buffer_before */
  requestedStartAt: string;
  /** From API response — requested_end_at including buffer_after */
  requestedEndAt: string;
}

interface Props {
  visible: boolean;
  appointment: AppointmentViewModel | null;
  onClose: () => void;
  onSimulationComplete?: (result: RescheduleSimulationResult) => void;
}

const FALLBACK_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type CalView = 'day' | 'week' | 'month';
type AvailableSlotMap = Record<string, string[]>;

function fmt(d: Date): string { return formatLocalDateKey(d); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getMonday(d: Date): Date {
  const date = new Date(d); const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0); return date;
}
function sameDay(a: Date, b: Date): boolean { return fmt(a) === fmt(b); }
function formatHour(h: number): string {
  if (h === 0 || h === 12) return `12 ${h < 12 ? 'AM' : 'PM'}`;
  return `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatTimeLabel(time: string): string {
  const [hourRaw = '0', minuteRaw = '0'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const base = formatHour(hour);
  return minute > 0 ? base.replace(' ', `:${String(minute).padStart(2, '0')} `) : base;
}

function formatTimeCompact(time: string): string {
  const [hourRaw = '0', minuteRaw = '0'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return `${hour > 12 ? hour - 12 : hour}${minute > 0 ? `:${String(minute).padStart(2, '0')}` : ''}${hour >= 12 ? 'p' : 'a'}`;
}

function getMonthDays(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  let startDow = first.getDay() - 1; if (startDow < 0) startDow = 6;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) week.push(null);
  for (let d = 1; d <= lastDay; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

function getDayOccupation(date: string): number {
  const total = MOCK_APPOINTMENTS.filter(a => fmt(a.startAt) === date)
    .reduce((s, a) => s + a.durationMinutes, 0);
  return Math.min(100, Math.round((total / (10 * 60)) * 100));
}

export function RescheduleModal({ visible, appointment, onClose, onSimulationComplete }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [calView, setCalView] = useState<CalView>('day');
  const [viewDate, setViewDate] = useState(() => addDays(new Date(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotMap>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const weekStart = useMemo(() => getMonday(viewDate), [viewDate]);
  const availabilityWeekKey = useMemo(() => fmt(weekStart), [weekStart]);

  useEffect(() => {
    if (!visible || !appointment?.serviceId) {
      setAvailableSlots({});
      setAvailabilityError(null);
      setAvailabilityLoading(false);
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError(null);

    getPublicAvailability(appointment.serviceId, availabilityWeekKey)
      .then((slots) => {
        if (cancelled) return;
        const next: AvailableSlotMap = {};
        slots.forEach((slot) => {
          const start = new Date(slot.slotStartAt);
          const dateKey = fmt(start);
          const timeKey = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
          next[dateKey] = [...(next[dateKey] ?? []), timeKey];
        });
        Object.keys(next).forEach((dateKey) => {
          next[dateKey] = Array.from(new Set(next[dateKey])).sort();
        });
        setAvailableSlots(next);
      })
      .catch((error) => {
        if (cancelled) return;
        const msg = error instanceof Error ? error.message : 'No se pudo cargar la disponibilidad.';
        setAvailableSlots({});
        setAvailabilityError(msg);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [availabilityWeekKey, appointment?.serviceId, visible]);

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const newStartAt = formatLocalDateTimeWithOffset(
      selectedDate,
      `${selectedTime}:00`
    );
    try {
      const result = await rescheduleOwnerAppointment(appointment.id, {
        newStartAt,
        reason: reason.trim() || undefined,
        notifyClient,
      });
      onSimulationComplete?.({
        appointmentId: appointment.id,
        newStatus: result.status as 'awaiting_client_confirmation' | 'reschedule_required',
        newStartAt,
        newDate: selectedDate,
        requestedStartAt: result.requested_start_at,
        requestedEndAt: result.requested_end_at,
      });
      resetForm();
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al reprogramar. Intenta nuevamente.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCalView('day');
    setViewDate(addDays(new Date(), 1));
    setSelectedDate(null);
    setSelectedTime(null);
    setReason('');
    setNotifyClient(true);
    setIsSubmitting(false);
    setSubmitError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canConfirm = !!selectedDate && !!selectedTime && !isSubmitting;

  if (!appointment) return null;

  const originalDate = appointment.startAt.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const originalTime = appointment.startAt.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.gold} />
              </View>
              <Text style={styles.headerTitle}>Reprogramar cita</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Current appointment info */}
            <View style={styles.currentCard}>
              <View style={styles.currentHeader}>
                <Ionicons name="calendar" size={16} color={colors.gray500} />
                <Text style={styles.currentLabel}>Cita actual</Text>
              </View>
              <View style={styles.currentInfo}>
                <View style={styles.currentAvatar}>
                  <Text style={styles.currentAvatarText}>
                    {appointment.clientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.currentDetails}>
                  <Text style={styles.currentName}>{appointment.clientName}</Text>
                  <Text style={styles.currentService}>{appointment.serviceName} · {appointment.durationMinutes} min</Text>
                  <Text style={styles.currentTime}>{originalDate} · {originalTime}</Text>
                </View>
              </View>
            </View>

            {/* Calendar view toggle */}
            <View style={styles.modeToggle}>
              {(['day', 'week', 'month'] as CalView[]).map(v => {
                const labels = { day: 'Día', week: 'Semana', month: 'Mes' };
                const icons = { day: 'today', week: 'calendar', month: 'grid' } as const;
                const isActive = calView === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.modeBtn, isActive && styles.modeBtnActive]}
                    onPress={() => setCalView(v)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={icons[v]} size={14} color={isActive ? colors.info : colors.gray500} />
                    <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>{labels[v]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* === DAY VIEW === */}
            {calView === 'day' && (() => {
              const dateStr = fmt(viewDate);
              const dayLabel = viewDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
              const backendSlots = availableSlots[dateStr] ?? [];
              const fallbackSlots = FALLBACK_HOURS.map(h => `${String(h).padStart(2, '0')}:00`);
              const slotTimes = appointment.serviceId ? backendSlots : fallbackSlots;
              return (
                <>
                  {/* Day nav */}
                  <View style={styles.calNav}>
                    <TouchableOpacity onPress={() => setViewDate(addDays(viewDate, -1))}>
                      <Ionicons name="chevron-back" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                    <Text style={styles.calNavTitle}>{dayLabel}</Text>
                    <TouchableOpacity onPress={() => setViewDate(addDays(viewDate, 1))}>
                      <Ionicons name="chevron-forward" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                  </View>
                  {/* Hour grid */}
                  <View style={styles.hourGrid}>
                    {availabilityLoading && appointment.serviceId ? (
                      <View style={styles.availabilityState}>
                        <ActivityIndicator size="small" color={colors.gold} />
                        <Text style={styles.availabilityStateText}>Cargando disponibilidad...</Text>
                      </View>
                    ) : null}
                    {availabilityError ? (
                      <View style={styles.availabilityState}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                        <Text style={[styles.availabilityStateText, styles.availabilityStateError]}>{availabilityError}</Text>
                      </View>
                    ) : null}
                    {!availabilityLoading && !availabilityError && slotTimes.length === 0 ? (
                      <View style={styles.availabilityState}>
                        <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
                        <Text style={styles.availabilityStateText}>Sin horarios disponibles para este día</Text>
                      </View>
                    ) : null}
                    {slotTimes.map(time => {
                      const isSelected = selectedDate === dateStr && selectedTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.hourCell,
                            isSelected && styles.hourCellSelected,
                          ]}
                          onPress={() => {
                            setSelectedDate(dateStr);
                            setSelectedTime(time);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.hourCellTime,
                            isSelected && styles.hourCellTimeSelected,
                          ]}>
                            {formatTimeLabel(time)}
                          </Text>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={18} color={colors.info} />
                          ) : (
                            <Text style={styles.availableText}>Disponible</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              );
            })()}

            {/* === WEEK VIEW === */}
            {calView === 'week' && (() => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
              const weekLabel = `${weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
              return (
                <>
                  {/* Week nav */}
                  <View style={styles.calNav}>
                    <TouchableOpacity onPress={() => setViewDate(addDays(viewDate, -7))}>
                      <Ionicons name="chevron-back" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                    <Text style={styles.calNavTitle}>{weekLabel}</Text>
                    <TouchableOpacity onPress={() => setViewDate(addDays(viewDate, 7))}>
                      <Ionicons name="chevron-forward" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                  </View>
                  {/* Week columns */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.weekGrid}>
                      {days.map((day, di) => {
                        const dateStr = fmt(day);
                        const isToday = sameDay(day, new Date());
                        const occ = getDayOccupation(dateStr);
                        const backendSlots = availableSlots[dateStr] ?? [];
                        const fallbackSlots = [9, 10, 11, 13, 14, 15, 16, 17].map(h => `${String(h).padStart(2, '0')}:00`);
                        const slotTimes = appointment.serviceId ? backendSlots : fallbackSlots;
                        return (
                          <View key={di} style={styles.weekCol}>
                            {/* Day header */}
                            <View style={[styles.weekDayHeader, isToday && styles.weekDayHeaderToday]}>
                              <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                                {DAY_NAMES_SHORT[di]}
                              </Text>
                              <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                                {day.getDate()}
                              </Text>
                              <View style={[styles.weekOccBar, { width: `${Math.max(10, occ)}%` },
                                occ > 80 ? styles.weekOccBarHigh : occ > 50 ? styles.weekOccBarMed : styles.weekOccBarLow,
                              ]} />
                            </View>
                            {/* Time slots */}
                            {slotTimes.length === 0 ? (
                              <View style={styles.weekSlotEmpty}>
                                <Text style={styles.weekSlotEmptyText}>Sin horarios</Text>
                              </View>
                            ) : null}
                            {slotTimes.map(time => {
                              const isSel = selectedDate === dateStr && selectedTime === time;
                              return (
                                <TouchableOpacity
                                  key={time}
                                  style={[
                                    styles.weekSlot,
                                    isSel && styles.weekSlotSelected,
                                  ]}
                                  onPress={() => {
                                    setSelectedDate(dateStr);
                                    setSelectedTime(time);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.weekSlotText,
                                    isSel && styles.weekSlotTextSel,
                                  ]}>
                                    {formatTimeCompact(time)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              );
            })()}

            {/* === MONTH VIEW === */}
            {calView === 'month' && (() => {
              const year = viewDate.getFullYear();
              const month = viewDate.getMonth();
              const weeks = getMonthDays(year, month);
              const monthLabel = `${MONTH_NAMES[month]} ${year}`;
              return (
                <>
                  {/* Month nav */}
                  <View style={styles.calNav}>
                    <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))}>
                      <Ionicons name="chevron-back" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                    <Text style={styles.calNavTitle}>{monthLabel}</Text>
                    <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))}>
                      <Ionicons name="chevron-forward" size={22} color={colors.gray600} />
                    </TouchableOpacity>
                  </View>
                  {/* Calendar grid */}
                  <View style={styles.monthGrid}>
                    {/* Header */}
                    <View style={styles.monthRow}>
                      {DAY_NAMES_SHORT.map(d => (
                        <View key={d} style={styles.monthHeaderCell}>
                          <Text style={styles.monthHeaderText}>{d}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                      <View key={wi} style={styles.monthRow}>
                        {week.map((day, di) => {
                          if (!day) return <View key={di} style={styles.monthCell} />;
                          const dateStr = fmt(day);
                          const occ = getDayOccupation(dateStr);
                          const isToday = sameDay(day, new Date());
                          const isPast = day < new Date() && !isToday;
                          const isSel = selectedDate === dateStr;
                          const occColor = occ > 80 ? colors.error : occ > 50 ? colors.warning : occ > 0 ? colors.success : colors.gray200;
                          return (
                            <TouchableOpacity
                              key={di}
                              style={[styles.monthCell, isSel && styles.monthCellSelected]}
                              onPress={() => {
                                if (!isPast) {
                                  setSelectedDate(dateStr);
                                  setSelectedTime(null);
                                  setCalView('day');
                                  setViewDate(day);
                                }
                              }}
                              disabled={isPast}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.monthDayNum,
                                isToday && styles.monthDayToday,
                                isPast && styles.monthDayPast,
                                isSel && styles.monthDaySelected,
                              ]}>
                                {day.getDate()}
                              </Text>
                              <View style={styles.monthOccDots}>
                                <View style={[styles.monthOccDot, { backgroundColor: isPast ? colors.gray300 : occColor }]} />
                              </View>
                              {occ > 0 && !isPast && (
                                <Text style={[styles.monthOccLabel, { color: occColor }]}>{occ}%</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                  {/* Legend */}
                  <View style={styles.monthLegend}>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Bajo</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.warning }]} /><Text style={styles.legendText}>Medio</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.error }]} /><Text style={styles.legendText}>Alto</Text></View>
                  </View>
                </>
              );
            })()}

            {/* Selection summary */}
            {selectedDate && selectedTime && (
              <View style={styles.selectionCard}>
                <Ionicons name="checkmark-circle" size={20} color={colors.info} />
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionTitle}>Nuevo horario seleccionado</Text>
                  <Text style={styles.selectionValue}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTimeLabel(selectedTime)}
                  </Text>
                </View>
              </View>
            )}

            {/* Reason */}
            <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: Solicitud del cliente, conflicto de horario..."
              placeholderTextColor={colors.gray400}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            {/* Notify toggle */}
            <TouchableOpacity
              style={[styles.toggleRow, notifyClient && styles.toggleRowActive]}
              onPress={() => setNotifyClient(!notifyClient)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={notifyClient ? 'notifications' : 'notifications-outline'}
                size={22}
                color={notifyClient ? colors.info : colors.gray500}
              />
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, notifyClient && styles.toggleLabelActive]}>
                  Notificar al cliente
                </Text>
                <Text style={styles.toggleSub}>
                  {notifyClient ? 'Se enviará mensaje con el nuevo horario' : 'El cliente no será notificado'}
                </Text>
              </View>
              <View style={[styles.toggleTrack, notifyClient && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, notifyClient && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Submit error — shown above footer when API call fails */}
          {submitError ? (
            <View style={styles.submitError}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose} disabled={isSubmitting}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirm, !canConfirm && styles.btnDisabled]}
              onPress={handleReschedule}
              disabled={!canConfirm}
              activeOpacity={0.8}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="calendar-outline" size={18} color={colors.white} />
              }
              <Text style={styles.btnConfirmText}>{isSubmitting ? 'Reprogramando...' : 'Reprogramar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  cardMobile: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.info + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  currentCard: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    gap: spacing.sm,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  currentLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  currentDetails: {
    flex: 1,
    gap: spacing.xxs,
  },
  currentName: {
    ...typography.subtitle,
    color: colors.white,
    fontSize: 14,
  },
  currentService: {
    ...typography.bodySmall,
    color: colors.gray400,
  },
  currentTime: {
    ...typography.caption,
    color: colors.gray500,
  },
  modeToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray900,
  },
  modeBtnActive: {
    backgroundColor: colors.infoLight,
  },
  modeBtnText: {
    ...typography.buttonSmall,
    color: colors.gray500,
  },
  modeBtnTextActive: {
    color: colors.info,
  },
  /* Calendar nav */
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  calNavTitle: {
    ...typography.subtitle,
    color: colors.white,
  },
  /* Day view - hour grid */
  hourGrid: {
    gap: spacing.xs,
  },
  availabilityState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  availabilityStateText: {
    ...typography.caption,
    flex: 1,
    color: colors.gray500,
    fontSize: 12,
  },
  availabilityStateError: {
    color: colors.error,
  },
  hourCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  hourCellSelected: {
    borderColor: colors.info,
    backgroundColor: `${colors.info}10`,
    borderWidth: 1.5,
  },
  hourCellTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray400,
  },
  hourCellTimeSelected: {
    color: colors.info,
    fontWeight: '700',
  },
  availableText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  /* Week view */
  weekGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekCol: {
    width: 56,
    alignItems: 'center',
    gap: 3,
  },
  weekDayHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    width: '100%',
    marginBottom: spacing.xs,
  },
  weekDayHeaderToday: {
    backgroundColor: `${colors.info}12`,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray500,
    textTransform: 'uppercase',
  },
  weekDayNameToday: {
    color: colors.info,
  },
  weekDayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  weekDayNumToday: {
    color: colors.info,
  },
  weekOccBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 2,
  },
  weekOccBarLow: { backgroundColor: colors.success },
  weekOccBarMed: { backgroundColor: colors.warning },
  weekOccBarHigh: { backgroundColor: colors.error },
  weekSlot: {
    width: 52,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
    alignItems: 'center',
    backgroundColor: colors.gray900,
  },
  weekSlotEmpty: {
    width: 52,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  weekSlotEmptyText: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    color: colors.gray600,
  },
  weekSlotSelected: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  weekSlotText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray400,
  },
  weekSlotTextSel: {
    color: colors.white,
    fontWeight: '700',
  },
  /* Month view */
  monthGrid: {
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  monthRow: {
    flexDirection: 'row',
  },
  monthHeaderCell: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.gray800,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray700,
  },
  monthHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray500,
    textTransform: 'uppercase',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    minHeight: 48,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray800,
    borderRightWidth: 0.5,
    borderRightColor: colors.gray800,
  },
  monthCellSelected: {
    backgroundColor: `${colors.info}12`,
  },
  monthDayNum: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray400,
  },
  monthDayToday: {
    color: colors.info,
    fontWeight: '800',
  },
  monthDayPast: {
    color: colors.gray300,
  },
  monthDaySelected: {
    color: colors.info,
    fontWeight: '700',
  },
  monthOccDots: {
    marginTop: 2,
  },
  monthOccDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthOccLabel: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
  },
  monthLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.gray500,
  },
  /* Selection summary */
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.info}10`,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.info,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTitle: {
    ...typography.caption,
    color: colors.info,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
    marginTop: 2,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  toggleRowActive: {
    borderColor: colors.info,
    backgroundColor: `${colors.info}08`,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.gray400,
  },
  toggleLabelActive: {
    color: colors.info,
    fontWeight: '600',
  },
  toggleSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.info,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray400,
    ...shadows.card,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
    gap: spacing.md,
  },
  btnCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  btnCancelText: {
    ...typography.buttonSmall,
    color: colors.gray400,
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnConfirmText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: (colors.error as string) + '14',
    borderTopWidth: 1,
    borderTopColor: (colors.error as string) + '40',
  },
  submitErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    lineHeight: 16,
  },
});
