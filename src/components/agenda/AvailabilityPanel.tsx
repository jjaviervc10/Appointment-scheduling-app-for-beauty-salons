import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import { fetchWeeklyAvailability, updateWeeklyAvailability } from '../../services/availability';

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type Period = 'AM' | 'PM';

function to12h(time24: string): { hour: string; minute: string; period: Period } {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const period: Period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: String(h), minute: mStr || '00', period };
}

function to24h(hour: string, minute: string, period: Period): string {
  let h = parseInt(hour, 10);
  if (isNaN(h) || h < 1 || h > 12) h = 12;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute || '00'}`;
}

function format12Display(time24: string): string {
  const { hour, minute, period } = to12h(time24);
  return `${hour}:${minute} ${period}`;
}

export function AvailabilityPanel() {
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    fetchWeeklyAvailability().then((data) => {
      setAvailability(data);
      setLoading(false);
    });
  }, []);

  const toggleDay = useCallback((dayOfWeek: number) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek);
    if (existing) {
      updateWeeklyAvailability(dayOfWeek, existing.start_time, existing.end_time, !existing.is_active);
      setAvailability(prev =>
        prev.map(a => a.day_of_week === dayOfWeek ? { ...a, is_active: !a.is_active } : a)
      );
    }
  }, [availability]);

  const updateTime = useCallback((dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setAvailability(prev =>
      prev.map(a => a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a)
    );
  }, []);

  const updateTimePart = useCallback((
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    part: 'hour' | 'minute' | 'period',
    value: string,
    currentTime: string,
  ) => {
    const parsed = to12h(currentTime);
    if (part === 'hour') parsed.hour = value;
    else if (part === 'minute') parsed.minute = value;
    else if (part === 'period') parsed.period = value as Period;
    const new24 = to24h(parsed.hour, parsed.minute, parsed.period);
    updateTime(dayOfWeek, field, new24);
  }, [updateTime]);

  const copyToAll = useCallback((sourceDow: number) => {
    const source = availability.find(a => a.day_of_week === sourceDow);
    if (!source) return;
    setAvailability(prev =>
      prev.map(a => ({
        ...a,
        start_time: source.start_time,
        end_time: source.end_time,
        is_active: source.is_active,
      }))
    );
  }, [availability]);

  const renderTimeInput = (dow: number, field: 'start_time' | 'end_time', time24: string, label: string) => {
    const { hour, minute, period } = to12h(time24);
    return (
      <View style={styles.timeField}>
        <Text style={styles.timeLabel}>{label}</Text>
        <View style={styles.timeInputRow}>
          {/* Hour input */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={hour}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
                updateTimePart(dow, field, 'hour', cleaned, time24);
              }}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="12"
              placeholderTextColor={colors.gray300}
            />
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          {/* Minute input */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.timeInput}
              value={minute}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
                updateTimePart(dow, field, 'minute', cleaned, time24);
              }}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={colors.gray300}
            />
          </View>

          {/* AM / PM toggle */}
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
        <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Horarios laborales</Text>
        <Text style={styles.subtitle}>Configura tu disponibilidad semanal</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick view - visual week */}
        <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
          <View style={[styles.weekPreview, isMobile && styles.weekPreviewMobile]}>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
              const day = availability.find(a => a.day_of_week === dow);
              const isActive = day?.is_active ?? false;
              return (
                <TouchableOpacity
                  key={dow}
                  style={[styles.previewCol, isMobile && styles.previewColMobile]}
                  onPress={() => { setEditingDay(dow); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.previewDay}>{DAYS_SHORT[dow]}</Text>
                  <View style={[styles.previewBar, !isActive && styles.previewBarInactive]}>
                    {isActive && day ? (
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

        {/* Day-by-day config */}
        <View style={styles.daysList}>
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const day = availability.find(a => a.day_of_week === dow);
            const isActive = day?.is_active ?? false;
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
                    {isActive && day ? (
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

                {isExpanded && isActive && day && (
                  <View style={[styles.dayExpanded, isMobile && styles.dayExpandedMobile]}>
                    <View style={[styles.timeRow, isMobile && styles.timeRowMobile]}>
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
                      <Text style={styles.copyBtnText}>Copiar a todos los días</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity style={[styles.saveBtn, isMobile && styles.saveBtnMobile]} activeOpacity={0.7}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.black} />
          <Text style={styles.saveBtnText}>Guardar disponibilidad</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.gray400 },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.black, borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  title: { ...typography.h3, color: colors.white, fontSize: 16 },
  subtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.xl },
  scrollContentMobile: { padding: spacing.md },

  /* Week preview */
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

  /* Days list */
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

  /* Expanded day */
  dayExpanded: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.gray800,
    gap: spacing.lg, paddingTop: spacing.lg,
  },
  dayExpandedMobile: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.md },

  /* Time row: Desde / Hasta side by side on desktop, stacked on mobile */
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  timeRowMobile: { flexDirection: 'column', gap: spacing.md },
  timeField: { flex: 1, gap: spacing.xs },
  timeLabel: {
    ...typography.caption, color: colors.gray400, textTransform: 'uppercase',
    letterSpacing: 0.8, fontSize: 11, fontWeight: '600',
  },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  /* Number inputs */
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

  /* AM/PM toggle */
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

  /* Copy / Save */
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
  saveBtnMobile: { paddingVertical: spacing.md, marginTop: spacing.lg },
  saveBtnText: { ...typography.button, color: colors.black },
});
