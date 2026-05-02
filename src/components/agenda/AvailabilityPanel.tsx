import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import { fetchWeeklyAvailability } from '../../services/availability';
import { isHttpError } from '../../types/api';

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

function format12Display(time24: string): string {
  const { hour, minute, period } = to12h(time24);
  return `${hour}:${minute} ${period}`;
}

export function AvailabilityPanel() {
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await fetchWeeklyAvailability();
      setAvailability(data);
    } catch (loadError) {
      if (isHttpError(loadError) && loadError.status === 401) {
        setError('No autorizado. Verifica el token owner configurado para Netlify.');
      } else if (loadError instanceof Error) {
        setError(loadError.message);
      } else {
        setError('No se pudo cargar la disponibilidad.');
      }
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const toggleDay = useCallback((dayOfWeek: number) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek);
    if (existing) {
      setNotice('La edición de disponibilidad aún no está habilitada por backend. Esta vista muestra la configuración actual.');
    }
  }, [availability]);

  const copyToAll = useCallback((sourceDow: number) => {
    const source = availability.find(a => a.day_of_week === sourceDow);
    if (!source) return;
    setNotice('Copiar horarios requiere un endpoint de guardado. Por ahora la disponibilidad está en modo lectura.');
  }, [availability]);

  const renderTimeInput = (time24: string, label: string) => {
    const { hour, minute, period } = to12h(time24);
    return (
      <View style={styles.timeField}>
        <Text style={styles.timeLabel}>{label}</Text>
        <View style={styles.timeInputRow}>
          {/* Hour input */}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.timeInput, styles.timeInputReadonly]}
              value={hour}
              editable={false}
              placeholder="12"
              placeholderTextColor={colors.gray300}
            />
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          {/* Minute input */}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.timeInput, styles.timeInputReadonly]}
              value={minute}
              editable={false}
              placeholder="00"
              placeholderTextColor={colors.gray300}
            />
          </View>

          {/* AM / PM toggle */}
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
              disabled
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
              disabled
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
        <View style={styles.readOnlyBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.gold} />
          <Text style={styles.readOnlyText}>
            Vista de solo lectura. El backend actual permite consultar disponibilidad, pero aún no expone un endpoint de guardado.
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

        {/* Quick view - visual week */}
        {availability.length > 0 ? (
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
        ) : null}

        {/* Day-by-day config */}
        {availability.length > 0 ? (
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
                      {renderTimeInput(day.start_time, 'Desde')}
                      <View style={styles.timeDivider}>
                        <Ionicons name="arrow-forward" size={16} color={colors.gray300} />
                      </View>
                      {renderTimeInput(day.end_time, 'Hasta')}
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
        ) : null}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, styles.saveBtnDisabled, isMobile && styles.saveBtnMobile]}
          activeOpacity={0.7}
          onPress={() => setNotice('Guardar disponibilidad estará disponible cuando exista el endpoint de actualización en backend.')}
        >
          <Ionicons name="lock-closed-outline" size={20} color={colors.gray500} />
          <Text style={[styles.saveBtnText, styles.saveBtnTextDisabled]}>Guardar disponibilidad</Text>
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
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gold + '12',
    borderWidth: 1,
    borderColor: colors.gold + '35',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  readOnlyText: {
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
  timeInputReadonly: {
    color: colors.gray300,
    opacity: 0.9,
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
  saveBtnDisabled: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  saveBtnMobile: { paddingVertical: spacing.md, marginTop: spacing.lg },
  saveBtnText: { ...typography.button, color: colors.black },
  saveBtnTextDisabled: { color: colors.gray500 },
});
