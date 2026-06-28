import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import type { DayOfWeek } from '../../types/enums';
import {
  fetchWeeklyAvailability,
  updateWeeklyAvailability,
} from '../../services/availability';
import { isHttpError } from '../../types/api';
import { AvailabilitySummary } from '../availability/AvailabilitySummary';
import { DayAvailabilityRow } from '../availability/DayAvailabilityRow';
import {
  DayAvailabilityEditor,
  type DayPatch,
} from '../availability/DayAvailabilityEditor';
import { formatLocalDateKey } from '../../utils/date';
import { ShareAvailabilityModal } from '../availability/ShareAvailabilityModal';

// --- Constants ----------------------------------------------------------------

const DAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
] as const;

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'] as const;

/** Display order: Mon -> Sat -> Sun */
const DISPLAY_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

// --- Pure helpers -------------------------------------------------------------

function normalizeClockTime(t: string): string {
  const [h = '00', m = '00'] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function defaultDay(dow: DayOfWeek): WeeklyAvailability {
  return {
    id: '',
    owner_id: '',
    day_of_week: dow,
    start_time: '09:00',
    end_time: '20:00',
    is_active: false,
    is_override: false,
    override_id: null,
    created_at: '',
  };
}

function normalizeAvailability(rows: WeeklyAvailability[]): WeeklyAvailability[] {
  return DISPLAY_DAYS.map((dow) => {
    const found = rows.find((r) => r.day_of_week === dow);
    if (!found) return defaultDay(dow);
    return {
      ...defaultDay(dow),
      ...found,
      start_time: normalizeClockTime(found.start_time),
      end_time: normalizeClockTime(found.end_time),
    };
  });
}

/** Converts "HH:mm" to "HH:mm:00" as expected by the backend validator. */
function toApiTime(t: string): string {
  return `${normalizeClockTime(t)}:00`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

type DayInfo = {
  dateKey: string;
  date: string;
  monthShort: string;
  monthLong: string;
  fullLabel: string;
};

type WeekContext = {
  isCurrentWeek: boolean;
  todayDow: DayOfWeek;
  labelShort: string;
  isoMonday: string;
  isoSunday: string;
  dayInfos: Record<DayOfWeek, DayInfo>;
};

type TimingNotice = {
  tone: 'info' | 'warning';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

function getWeekContext(weekOffset: number): WeekContext {
  const today = new Date();
  const todayDow = today.getDay() as DayOfWeek;
  const monday = getMonday(today);
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmtShort = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const year = sunday.getFullYear();
  const labelShort = `${fmtShort(monday)} - ${fmtShort(sunday)}, ${year}`;

  const isoMonday = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-');

  const dayInfosPartial: Partial<Record<DayOfWeek, DayInfo>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dow = d.getDay() as DayOfWeek;
    const dateKey = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    dayInfosPartial[dow] = {
      dateKey,
      date: String(d.getDate()),
      monthShort: d.toLocaleDateString('es-MX', { month: 'short' }),
      monthLong: d.toLocaleDateString('es-MX', { month: 'long' }),
      fullLabel: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }),
    };
  }

  return {
    isCurrentWeek: weekOffset === 0,
    todayDow,
    labelShort,
    isoMonday,
    isoSunday: [
      sunday.getFullYear(),
      String(sunday.getMonth() + 1).padStart(2, '0'),
      String(sunday.getDate()).padStart(2, '0'),
    ].join('-'),
    dayInfos: dayInfosPartial as Record<DayOfWeek, DayInfo>,
  };
}

function parseClockMinutes(value: string): number | null {
  const [hourRaw, minuteRaw = '0'] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function currentClockMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function getTimingNotice(
  weekCtx: WeekContext,
  availability: WeeklyAvailability[],
  now = new Date(),
): TimingNotice | null {
  const todayKey = formatLocalDateKey(now);

  if (todayKey > weekCtx.isoSunday) {
    return {
      tone: 'warning',
      icon: 'alert-circle-outline',
      title: 'Semana pasada',
      body: 'Esta semana ya termino. Puedes guardar ajustes para mantener tu configuracion ordenada, pero los dias pasados no apareceran como horarios para nuevas citas.',
    };
  }

  if (todayKey < weekCtx.isoMonday || !weekCtx.isCurrentWeek) {
    return null;
  }

  const todayAvailability = availability.find((row) => row.day_of_week === weekCtx.todayDow);
  const todayStartMinutes =
    todayAvailability?.is_active ? parseClockMinutes(todayAvailability.start_time) : null;
  const workdayAlreadyStarted =
    todayStartMinutes !== null && currentClockMinutes(now) >= todayStartMinutes;
  const pastDaysCount = DISPLAY_DAYS.filter((dow) => weekCtx.dayInfos[dow].dateKey < todayKey).length;

  if (workdayAlreadyStarted) {
    return {
      tone: 'warning',
      icon: 'time-outline',
      title: 'La semana ya esta en curso',
      body: 'Los dias anteriores y los horarios de hoy que ya pasaron no se mostraran para nuevas citas. Para evitar confusiones, conviene registrar la disponibilidad con al menos un dia de anticipacion.',
    };
  }

  if (pastDaysCount > 0) {
    return {
      tone: 'info',
      icon: 'information-circle-outline',
      title: 'Semana parcialmente iniciada',
      body: 'Los dias que ya pasaron no apareceran como disponibles. Los horarios futuros de esta semana si podran mostrarse cuando cumplan las reglas de anticipacion.',
    };
  }

  return {
    tone: 'info',
    icon: 'calendar-outline',
    title: 'Recomendacion de anticipacion',
    body: 'Si configuras la disponibilidad el mismo dia que inicia la semana, hazlo antes de comenzar tu horario laboral. Lo ideal es dejarla lista desde el dia anterior.',
  };
}

// --- Component ----------------------------------------------------------------

interface AvailabilityPanelProps {
  onGoToBlocks?: () => void;
}

export function AvailabilityPanel({
  onGoToBlocks: _onGoToBlocks,
}: AvailabilityPanelProps = {}) {
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);

  const { width, height: windowHeight } = useWindowDimensions();
  const isDesktop = width >= 768;
  const editorMobileHeight = Math.round(windowHeight * 0.65);

  const weekCtx = useMemo(() => getWeekContext(weekOffset), [weekOffset]);
  const timingNotice = useMemo(
    () => getTimingNotice(weekCtx, availability),
    [availability, weekCtx],
  );

  // --- Data loading -----------------------------------------------------------

  const loadAvailability = useCallback(async (wsd?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWeeklyAvailability(wsd);
      setAvailability(normalizeAvailability(result.data));
    } catch (e) {
      const msg =
        isHttpError(e) && e.status === 401
          ? 'No autorizado. Verifica el token owner configurado en Netlify.'
          : e instanceof Error
          ? e.message
          : 'No se pudo cargar la disponibilidad.';
      setError(msg);
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability(
      weekCtx.isCurrentWeek ? undefined : weekCtx.isoMonday,
    );
    setEditingDay(null);
    setSaveError(null);
    setNotice(null);
  }, [weekCtx.isoMonday, weekCtx.isCurrentWeek, loadAvailability]);

  // --- Save handler -----------------------------------------------------------

  const handleSave = useCallback(
    async (dayOfWeek: DayOfWeek, patch: DayPatch, applyToAll = false) => {
      setSaving(true);
      setSaveError(null);
      setNotice(null);

      const payload = availability.map((row) => {
        const usesPatch = applyToAll || row.day_of_week === dayOfWeek;
        return {
          dayOfWeek: row.day_of_week,
          startTime: toApiTime(usesPatch ? patch.startTime : row.start_time),
          endTime: toApiTime(usesPatch ? patch.endTime : row.end_time),
          isActive: usesPatch ? patch.isActive : row.is_active,
        };
      });

      try {
        const result = await updateWeeklyAvailability(
          payload,
          weekCtx.isCurrentWeek ? undefined : weekCtx.isoMonday,
        );
        setAvailability(normalizeAvailability(result.data));
        setNotice(
          timingNotice
            ? 'Disponibilidad guardada. Los dias u horarios que ya pasaron no apareceran para nuevas citas.'
            : applyToAll
              ? 'Horario aplicado a toda la semana correctamente.'
              : 'Disponibilidad guardada correctamente.',
        );
        setEditingDay(null);
      } catch (saveErr) {
        const msg =
          isHttpError(saveErr) && saveErr.status === 400
            ? saveErr.message
            : isHttpError(saveErr) && saveErr.status === 401
            ? 'No autorizado. Verifica el token owner.'
            : saveErr instanceof Error
            ? saveErr.message
            : 'No se pudo guardar la disponibilidad.';
        setSaveError(msg);
      } finally {
        setSaving(false);
      }
    },
    [availability, timingNotice, weekCtx],
  );

  // --- Derived state ----------------------------------------------------------

  const currentDay = useMemo(
    () =>
      editingDay !== null
        ? availability.find((a) => a.day_of_week === editingDay) ??
          defaultDay(editingDay)
        : null,
    [editingDay, availability],
  );

  // --- Render: loading --------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.gold} />
        <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
      </View>
    );
  }

  // --- Render: load error -----------------------------------------------------

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>No se pudo cargar la disponibilidad</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => void loadAvailability()}
          activeOpacity={0.75}
        >
          <Ionicons name="refresh" size={16} color={colors.black} />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Render: main -----------------------------------------------------------

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      {/* List panel */}
      <ScrollView
        style={styles.listPanel}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week navigator */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekOffset((o) => o - 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray300} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCenter}
            onPress={() => setWeekOffset(0)}
            activeOpacity={weekCtx.isCurrentWeek ? 1 : 0.75}
          >
            <Text style={styles.navLabel} numberOfLines={1}>
              {weekCtx.labelShort}
            </Text>
            {weekCtx.isCurrentWeek ? (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Esta semana</Text>
              </View>
            ) : (
              <Text style={styles.returnHint}>
                Toca para volver a esta semana
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekOffset((o) => o + 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => setWeekOffset(0)}
            activeOpacity={0.75}
          >
            <Text style={styles.todayBtnText}>Hoy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shareRow}>
          <View style={styles.shareRowCopy}>
            <Text style={styles.shareRowTitle}>Comparte horarios disponibles</Text>
            <Text style={styles.shareRowText}>
              Genera una imagen y texto listos para publicar en tu estado de WhatsApp.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => setShowShareModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="share-social-outline" size={16} color={colors.black} />
            <Text style={styles.shareBtnText}>Compartir</Text>
          </TouchableOpacity>
        </View>

        {/* Summary stats */}
        {availability.length > 0 ? (
          <AvailabilitySummary availability={availability} />
        ) : null}

        {timingNotice ? <TimingNoticeBanner notice={timingNotice} /> : null}

        {/* Notice banner */}
        {notice ? (
          <TouchableOpacity
            style={styles.noticeBanner}
            onPress={() => setNotice(null)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={colors.success}
            />
            <Text style={styles.noticeText}>{notice}</Text>
            <Ionicons name="close" size={14} color={colors.gray500} />
          </TouchableOpacity>
        ) : null}

        {/* Days list */}
        <View style={styles.daysList}>
          {DISPLAY_DAYS.map((dow) => {
            const day =
              availability.find((a) => a.day_of_week === dow) ??
              defaultDay(dow);
            const info = weekCtx.dayInfos[dow];
            return (
              <DayAvailabilityRow
                key={dow}
                day={day}
                dayShortName={DAYS_SHORT[dow]}
                dayDate={info?.date ?? ''}
                dayMonth={info?.monthShort ?? ''}
                isToday={weekCtx.isCurrentWeek && weekCtx.todayDow === dow}
                isEditing={editingDay === dow}
                onEdit={() => setEditingDay(editingDay === dow ? null : dow)}
              />
            );
          })}
        </View>

        {/* Tips section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Consejos</Text>
          <View style={styles.tipsRow}>
            <TipCard
              icon="shield-outline"
              title="Usa bloqueos"
              text="Bloquea tiempos especificos como comida, vacaciones o descansos sin cambiar tu disponibilidad."
            />
            <TipCard
              icon="copy-outline"
              title="Copia tu semana"
              text="Ahorra tiempo copiando la disponibilidad de la semana anterior y ajusta lo que necesites."
            />
            <TipCard
              icon="repeat-outline"
              title="Se consistente"
              text="Mantener horarios consistentes te ayuda a que los clientes te encuentren mas facilmente."
            />
          </View>
        </View>
      </ScrollView>

      {/* Editor panel */}
      {editingDay !== null && currentDay !== null ? (
        <View
          style={[
            styles.editorWrapper,
            isDesktop
              ? styles.editorDesktop
              : [styles.editorMobile, { height: editorMobileHeight }],
          ]}
        >
          <DayAvailabilityEditor
            day={currentDay}
            dayFullName={DAYS_ES[editingDay]}
            dateLabel={weekCtx.dayInfos[editingDay]?.fullLabel ?? ''}
            onSave={(patch) => void handleSave(editingDay, patch)}
            onApplyToAll={(patch) => void handleSave(editingDay, patch, true)}
            onClose={() => {
              setEditingDay(null);
              setSaveError(null);
            }}
            isSaving={saving}
            saveError={saveError}
          />
        </View>
      ) : null}

      <ShareAvailabilityModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </View>
  );
}

function TimingNoticeBanner({ notice }: { notice: TimingNotice }) {
  const isWarning = notice.tone === 'warning';
  const accentColor = isWarning ? colors.warning : colors.gold;

  return (
    <View
      style={[
        styles.timingNotice,
        isWarning ? styles.timingNoticeWarning : styles.timingNoticeInfo,
      ]}
    >
      <View style={[styles.timingNoticeIcon, { backgroundColor: accentColor + '20' }]}>
        <Ionicons name={notice.icon} size={16} color={accentColor} />
      </View>
      <View style={styles.timingNoticeCopy}>
        <Text style={styles.timingNoticeTitle}>{notice.title}</Text>
        <Text style={styles.timingNoticeBody}>{notice.body}</Text>
      </View>
    </View>
  );
}

// --- Tip card -----------------------------------------------------------------

function TipCard({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.tipCard}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

// --- Styles -------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  rootDesktop: { flexDirection: 'row' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: { ...typography.body, color: colors.gray400 },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    ...typography.subtitle,
    color: colors.white,
    textAlign: 'center',
  },
  errorMsg: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
    maxWidth: 360,
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
  retryText: { ...typography.buttonSmall, color: colors.black },

  listPanel: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.huge },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  navArrow: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 3,
  },
  navLabel: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  todayBadge: {
    backgroundColor: colors.gold + '20',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  todayBadgeText: {
    ...typography.caption,
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  returnHint: { ...typography.caption, color: colors.gray600, fontSize: 10 },
  todayBtn: {
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.gray800,
  },
  todayBtnText: {
    ...typography.buttonSmall,
    color: colors.gray300,
    fontSize: 13,
  },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  shareRowCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  shareRowTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  shareRowText: {
    ...typography.caption,
    color: colors.gray500,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexShrink: 0,
  },
  shareBtnText: {
    ...typography.buttonSmall,
    color: colors.black,
  },

  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '12',
    borderWidth: 1,
    borderColor: colors.success + '30',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: { ...typography.bodySmall, color: colors.gray300, flex: 1 },

  timingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  timingNoticeWarning: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '35',
  },
  timingNoticeInfo: {
    backgroundColor: colors.gold + '0F',
    borderColor: colors.gold + '30',
  },
  timingNoticeIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timingNoticeCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  timingNoticeTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  timingNoticeBody: {
    ...typography.caption,
    color: colors.gray400,
    lineHeight: 16,
  },

  daysList: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

  editorWrapper: {},
  editorDesktop: { width: 340 },
  editorMobile: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.gray700,
    elevation: 12,
    zIndex: 100,
    // height is set inline from windowHeight to ensure ScrollView fills correctly
  },

  tipsSection: { gap: spacing.md },
  tipsTitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  tipsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tipCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tipTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  tipText: {
    ...typography.caption,
    color: colors.gray500,
    lineHeight: 16,
  },
});
