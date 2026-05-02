import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import type { DayOfWeek } from '../../types/enums';
import { fetchWeeklyAvailability, updateWeeklyAvailability } from '../../services/availability';
import { isHttpError } from '../../types/api';

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DISPLAY_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const ALLOWED_MINUTES = new Set(['00', '15', '30', '45']);

type Period = 'AM' | 'PM';
type FieldName = 'start_time' | 'end_time';

function defaultDay(dayOfWeek: DayOfWeek): WeeklyAvailability {
  return {
    id: '',
    owner_id: '',
    day_of_week: dayOfWeek,
    start_time: dayOfWeek === 6 ? '10:00' : '10:00',
    end_time: dayOfWeek === 6 ? '17:00' : '20:00',
    is_active: false,
    created_at: '',
  };
}

function normalizeClockTime(value: string): string {
  const [hour = '00', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function normalizeAvailability(rows: WeeklyAvailability[]): WeeklyAvailability[] {
  return DISPLAY_DAYS.map((dow) => {
    const found = rows.find((row) => row.day_of_week === dow);
    if (!found) return defaultDay(dow);
    return {
      ...defaultDay(dow),
      ...found,
      start_time: normalizeClockTime(found.start_time),
      end_time: normalizeClockTime(found.end_time),
    };
  });
}

function to12h(time24: string): { hour: string; minute: string; period: Period } {
  const [hStr, mStr] = normalizeClockTime(time24).split(':');
  let h = parseInt(hStr, 10);
  const period: Period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: String(h), minute: mStr || '00', period };
}

function to24h(hour: string, minute: string, period: Period): string {
  let h = parseInt(hour, 10);
  let m = parseInt(minute, 10);
  if (isNaN(h) || h < 1 || h > 12) h = 12;
  if (isNaN(m) || m < 0) m = 0;
  if (m > 59) m = 59;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toApiTime(time: string): string {
  return `${normalizeClockTime(time)}:00`;
}

function minutesOfDay(time: string): number {
  const [hour = '0', minute = '0'] = normalizeClockTime(time).split(':');
  return Number(hour) * 60 + Number(minute);
}

function format12Display(time24: string): string {
  const { hour, minute, period } = to12h(time24);
  return `${hour}:${minute} ${period}`;
}

function validationMessage(rows: WeeklyAvailability[]): string | null {
  for (const row of rows) {
    const start = normalizeClockTime(row.start_time);
    const end = normalizeClockTime(row.end_time);
    const [, startMinute = '00'] = start.split(':');
    const [, endMinute = '00'] = end.split(':');

    if (!ALLOWED_MINUTES.has(startMinute) || !ALLOWED_MINUTES.has(endMinute)) {
      return `${DAYS_ES[row.day_of_week]} debe usar minutos 00, 15, 30 o 45.`;
    }

    if (row.is_active && minutesOfDay(start) >= minutesOfDay(end)) {
      return `${DAYS_ES[row.day_of_week]} debe tener hora de cierre mayor que la de apertura.`;
    }
  }

  return null;
}

function serializeRows(rows: WeeklyAvailability[]): string {
  return JSON.stringify(rows.map((row) => ({
    dayOfWeek: row.day_of_week,
    startTime: normalizeClockTime(row.start_time),
    endTime: normalizeClockTime(row.end_time),
    isActive: row.is_active,
  })));
}

export function AvailabilityPanel() {
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const isDirty = useMemo(
    () => serializeRows(availability) !== lastSavedSnapshot,
    [availability, lastSavedSnapshot]
  );

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = normalizeAvailability(await fetchWeeklyAvailability());
      setAvailability(data);
      setLastSavedSnapshot(serializeRows(data));
    } catch (loadError) {
      if (isHttpError(loadError) && loadError.status === 401) {
        setError('No autorizado. Verifica el token owner configurado para Netlify.');
      } else if (loadError instanceof Error) {
        setError(loadError.message);
      } else {
        setError('No se pudo cargar la disponibilidad.');
      }
      setAvailability([]);
      setLastSavedSnapshot('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const updateDay = useCallback((dayOfWeek: DayOfWeek, patch: Partial<WeeklyAvailability>) => {
    setNotice(null);
    setAvailability((prev) =>
      normalizeAvailability(prev).map((row) =>
        row.day_of_week === dayOfWeek ? { ...row, ...patch } : row
      )
    );
  }, []);

  const toggleDay = useCallback((dayOfWeek: DayOfWeek) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek) ?? defaultDay(dayOfWeek);
    updateDay(dayOfWeek, { is_active: !existing.is_active });
  }, [availability, updateDay]);

  const updateTimePart = useCallback((
    dayOfWeek: DayOfWeek,
    field: FieldName,
    part: 'hour' | 'minute' | 'period',
    value: string,
    currentTime: string,
  ) => {
    const parsed = to12h(currentTime);
    if (part === 'hour') parsed.hour = value.replace(/[^0-9]/g, '').slice(0, 2);
    else if (part === 'minute') parsed.minute = value.replace(/[^0-9]/g, '').slice(0, 2);
    else parsed.period = value as Period;
    updateDay(dayOfWeek, { [field]: to24h(parsed.hour, parsed.minute, parsed.period) });
  }, [updateDay]);

  const copyToAll = useCallback((sourceDow: DayOfWeek) => {
    const source = availability.find(a => a.day_of_week === sourceDow);
    if (!source) return;
    setNotice(null);
    setAvailability((prev) =>
      normalizeAvailability(prev).map((row) => ({
        ...row,
        start_time: source.start_time,
        end_time: source.end_time,
        is_active: source.is_active,
      }))
    );
  }, [availability]);

  const handleSave = useCallback(async () => {
    const normalized = normalizeAvailability(availability);
    const message = validationMessage(normalized);
    if (message) {
      setNotice(message);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const saved = normalizeAvailability(await updateWeeklyAvailability(
        normalized.map((row) => ({
          dayOfWeek: row.day_of_week,
          startTime: toApiTime(row.start_time),
          endTime: toApiTime(row.end_time),
          isActive: row.is_active,
        }))
      ));
      setAvailability(saved);
      setLastSavedSnapshot(serializeRows(saved));
      setNotice('Disponibilidad guardada correctamente.');
    } catch (saveError) {
      if (isHttpError(saveError) && saveError.status === 400) {
        setNotice(saveError.message);
      } else if (isHttpError(saveError) && saveError.status === 401) {
        setNotice('No autorizado. Verifica el token owner configurado para Netlify.');
      } else if (saveError instanceof Error) {
        setNotice(saveError.message);
      } else {
        setNotice('No se pudo guardar la disponibilidad.');
      }
    } finally {
      setSaving(false);
    }
  }, [availability]);

  const renderTimeInput = (dow: DayOfWeek, field: FieldName, time24: string, label: string) => {
    const { hour, minute, period } = to12h(time24);
    return (
      <View style={styles.timeField}>
        <Text style={styles.timeLabel}>{label}</Text>
        <View style={styles.timeInputRow}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={hour}
              onChangeText={(val) => updateTimePart(dow, field, 'hour', val, time24)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="12"
              placeholderTextColor={colors.gray300}
            />
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={minute}
              onChangeText={(val) => updateTimePart(dow, field, 'minute', val, time24)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={colors.gray300}
            />
          </View>

          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
              onPress={() => updateTimePart(dow, field, 'period', 'AM', time24)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
              onPress={() => updateTimePart(dow, field, 'period', 'PM', time24)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.gold} />
        <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>No se pudo cargar la disponibilidad</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void loadAvailability()} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color={colors.black} />
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Horarios laborales</Text>
        <Text style={styles.subtitle}>Configura tu disponibilidad semanal</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusBanner}>
          <Ionicons name={isDirty ? 'create-outline' : 'checkmark-circle-outline'} size={18} color={isDirty ? colors.warning : colors.success} />
          <Text style={styles.statusText}>
            {isDirty ? 'Tienes cambios sin guardar.' : 'Disponibilidad sincronizada con backend.'}
          </Text>
        </View>

        {notice ? (
          <TouchableOpacity style={styles.noticeBanner} onPress={() => setNotice(null)} activeOpacity={0.8}>
            <Text style={styles.noticeText}>{notice}</Text>
            <Ionicons name="close" size={16} color={colors.gray400} />
          </TouchableOpacity>
        ) : null}

        {availability.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={28} color={colors.gray600} />
            <Text style={styles.emptyText}>No hay disponibilidad configurada.</Text>
          </View>
        ) : null}

        {availability.length > 0 ? (
          <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
            <View style={[styles.weekPreview, isMobile && styles.weekPreviewMobile]}>
              {DISPLAY_DAYS.map((dow) => {
                const day = availability.find(a => a.day_of_week === dow) ?? defaultDay(dow);
                const isActive = day.is_active;
                return (
                  <TouchableOpacity
                    key={dow}
                    style={[styles.previewCol, isMobile && styles.previewColMobile]}
                    onPress={() => { setEditingDay(dow); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.previewDay}>{DAYS_SHORT[dow]}</Text>
                    <View style={[styles.previewBar, !isActive && styles.previewBarInactive]}>
                      {isActive ? (
                        <>
                          <Text style={styles.previewTime}>{format12Display(day.start_time)}</Text>
                          <View style={styles.previewFill} />
                          <Text style={styles.previewTime}>{format12Display(day.end_time)}</Text>
                        </>
                      ) : (
                        <Text style={styles.previewClosed}>Cerrado</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {availability.length > 0 ? (
          <View style={styles.daysList}>
            {DISPLAY_DAYS.map((dow) => {
              const day = availability.find(a => a.day_of_week === dow) ?? defaultDay(dow);
              const isActive = day.is_active;
              const isExpanded = editingDay === dow;

              return (
                <View key={dow} style={[styles.dayCard, !isActive && styles.dayCardInactive]}>
                  <TouchableOpacity
                    style={[styles.dayCardHeader, isMobile && styles.dayCardHeaderMobile]}
                    onPress={() => setEditingDay(isExpanded ? null : dow)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayCardLeft}>
                      <TouchableOpacity
                        style={[styles.toggleCircle, isActive && styles.toggleCircleActive]}
                        onPress={() => toggleDay(dow)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {isActive && <Ionicons name="checkmark" size={14} color={colors.white} />}
                      </TouchableOpacity>
                      <Text style={[styles.dayName, !isActive && styles.dayNameInactive]}>
                        {DAYS_ES[dow]}
                      </Text>
                    </View>
                    <View style={styles.dayCardRight}>
                      {isActive ? (
                        <Text style={styles.dayTimePreview}>
                          {format12Display(day.start_time)} - {format12Display(day.end_time)}
                        </Text>
                      ) : (
                        <Text style={styles.dayClosedText}>Cerrado</Text>
                      )}
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.gray400}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.dayExpanded, isMobile && styles.dayExpandedMobile]}>
                      <View style={[styles.timeRow, isMobile && styles.timeRowMobile, !isActive && styles.timeRowDisabled]}>
                        {renderTimeInput(dow, 'start_time', day.start_time, 'Desde')}
                        <View style={styles.timeDivider}>
                          <Ionicons name="arrow-forward" size={16} color={colors.gray300} />
                        </View>
                        {renderTimeInput(dow, 'end_time', day.end_time, 'Hasta')}
                      </View>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => copyToAll(dow)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="copy-outline" size={16} color={colors.info} />
                        <Text style={styles.copyBtnText}>Copiar a todos los dias</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, (!isDirty || saving) && styles.saveBtnDisabled, isMobile && styles.saveBtnMobile]}
          activeOpacity={0.7}
          onPress={() => void handleSave()}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color={!isDirty ? colors.gray500 : colors.black} />
          )}
          <Text style={[styles.saveBtnText, (!isDirty || saving) && styles.saveBtnTextDisabled]}>
            {saving ? 'Guardando...' : 'Guardar disponibilidad'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { ...typography.body, color: colors.gray400 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    ...typography.subtitle,
    color: colors.white,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
    maxWidth: 420,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.black, borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  title: { ...typography.h3, color: colors.white, fontSize: 16 },
  subtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.xl },
  scrollContentMobile: { padding: spacing.md },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.gray300,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info + '14',
    borderWidth: 1,
    borderColor: colors.info + '35',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.gray300,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 220,
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.gray500,
  },
  weekPreview: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.gray900, borderRadius: radii.md,
    padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.gray800,
  },
  weekPreviewMobile: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  previewCol: { flex: 1, alignItems: 'center', gap: spacing.xs, minWidth: 56 },
  previewColMobile: { flex: undefined, width: 64 },
  previewDay: { ...typography.caption, color: colors.gray500, fontSize: 11, textTransform: 'uppercase', fontWeight: '600' },
  previewBar: {
    width: '100%', height: 56, backgroundColor: colors.gold + '10',
    borderRadius: radii.sm, alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4, borderWidth: 1, borderColor: colors.gold + '30',
  },
  previewBarInactive: { backgroundColor: colors.gray800, borderColor: colors.gray700 },
  previewTime: { ...typography.caption, color: colors.gold, fontSize: 9 },
  previewFill: { flex: 1, width: '60%', backgroundColor: colors.gold + '30', borderRadius: 2, marginVertical: 2 },
  previewClosed: { ...typography.caption, color: colors.gray400, fontSize: 9, marginTop: 'auto', marginBottom: 'auto' },
  daysList: { gap: spacing.sm },
  dayCard: {
    backgroundColor: colors.gray900, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray800,
  },
  dayCardInactive: { opacity: 0.55 },
  dayCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    minHeight: 56,
  },
  dayCardHeaderMobile: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 52 },
  dayCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: colors.gray800, justifyContent: 'center', alignItems: 'center',
  },
  toggleCircleActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayName: { ...typography.subtitle, color: colors.white, fontSize: 15 },
  dayNameInactive: { color: colors.gray400 },
  dayCardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayTimePreview: { ...typography.bodySmall, color: colors.gray400, fontSize: 13 },
  dayClosedText: { ...typography.bodySmall, color: colors.gray400 },
  dayExpanded: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.gray800,
    gap: spacing.lg, paddingTop: spacing.lg,
  },
  dayExpandedMobile: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.md },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  timeRowMobile: { flexDirection: 'column', gap: spacing.md },
  timeRowDisabled: { opacity: 0.75 },
  timeField: { flex: 1, gap: spacing.xs },
  timeLabel: {
    ...typography.caption, color: colors.gray400, textTransform: 'uppercase',
    letterSpacing: 0.8, fontSize: 11, fontWeight: '600',
  },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inputGroup: {},
  timeInput: {
    width: 52, height: 48,
    borderWidth: 1, borderColor: colors.gray800, borderRadius: radii.md,
    textAlign: 'center', fontSize: 18, fontWeight: '600',
    color: colors.white, backgroundColor: colors.gray800,
  },
  timeSeparator: {
    fontSize: 20, fontWeight: '700', color: colors.gray400, marginHorizontal: 2,
  },
  periodToggle: {
    flexDirection: 'row', borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.gray800, overflow: 'hidden', marginLeft: spacing.sm,
    height: 48,
  },
  periodBtn: {
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.gray900,
  },
  periodBtnActive: { backgroundColor: colors.black },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.gray500 },
  periodTextActive: { color: colors.white },
  timeDivider: { justifyContent: 'center', alignItems: 'center', paddingBottom: 2, paddingHorizontal: spacing.xs },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radii.sm,
  },
  copyBtnText: { ...typography.bodySmall, color: colors.info, fontWeight: '500' },
  saveBtn: {
    backgroundColor: colors.gold, paddingVertical: spacing.lg,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.xl, marginBottom: spacing.huge,
  },
  saveBtnDisabled: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  saveBtnMobile: { paddingVertical: spacing.md, marginTop: spacing.lg },
  saveBtnText: { ...typography.button, color: colors.black },
  saveBtnTextDisabled: { color: colors.gray500 },
});
