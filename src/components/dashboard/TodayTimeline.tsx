import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { colors, spacing, typography, radii } from '../../theme';
import { statusColors } from '../../theme';
import { formatLocalDateKey } from '../../utils/date';
import type { AppointmentViewModel } from '../../types/models';
import type { TimeBlock } from '../../types/database';
import type { AppointmentStatus } from '../../types/enums';

export type TimelineFilterKey = 'all' | 'pending' | 'confirmed' | 'blocks';
type WorkingAction = 'approve' | 'reject' | 'cancel' | 'complete';

interface TodayTimelineProps {
  appointments: AppointmentViewModel[];
  blocks: TimeBlock[];
  workingIds?: Map<string, WorkingAction>;
  activeFilter: TimelineFilterKey;
  onFilterChange: (key: TimelineFilterKey) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  onComplete: (id: string) => void;
  selectedDate?: Date;
  todayStr?: string;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onGoToToday?: () => void;
  onGoToDate?: (date: Date) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;

// ─── Status display maps ────────────────────────────────────────────────────

const STATUS_BORDER: Partial<Record<AppointmentStatus, string>> = {
  pending_owner_approval:       colors.statusPending,
  awaiting_client_confirmation: colors.statusAwaitingClient,
  client_confirmed:             colors.statusConfirmed,
  confirmed_by_owner:           colors.statusConfirmed,
  reschedule_required:          colors.statusReschedule,
  completed:                    colors.statusCompleted,
  no_show:                      colors.statusNoShow,
  rejected_by_owner:            colors.statusRejected,
  client_cancelled:             colors.statusCancelled,
  owner_cancelled:              colors.statusCancelled,
};

const STATUS_BADGE_LABELS: Record<AppointmentStatus, string> = {
  pending_owner_approval:       'PENDIENTE',
  confirmed_by_owner:           'CONFIRMADA',
  client_confirmed:             'CONF. POR CLIENTE',
  awaiting_client_confirmation: 'ESPERA CONFIRMACIÓN',
  reschedule_required:          'REPROGRAMAR',
  completed:                    'COMPLETADA',
  no_show:                      'NO ASISTIÓ',
  rejected_by_owner:            'RECHAZADA',
  client_cancelled:             'CANCELADA',
  owner_cancelled:              'CANCELADA',
};

const FILTER_LABELS: Record<TimelineFilterKey, string> = {
  all:       'Todas',
  pending:   'Pendientes',
  confirmed: 'Confirmadas',
  blocks:    'Bloqueos',
};

// ─── Helper ─────────────────────────────────────────────────────────────────

function getHour(time: Date | string): number {
  if (typeof time === 'string') return parseInt(time.split(':')[0], 10);
  return time.getHours();
}

function fmtTime(time: Date | string): string {
  if (typeof time === 'string') {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TodayTimeline({
  appointments,
  blocks,
  workingIds,
  activeFilter,
  onFilterChange,
  onApprove,
  onReject,
  onCancel,
  onReschedule,
  onComplete,
  selectedDate,
  todayStr,
  onPrevDay,
  onNextDay,
  onGoToToday,
  onGoToDate,
}: TodayTimelineProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Date navigator computed values ────────────────────────────
  const isTodaySelected = useMemo(() => {
    if (!selectedDate) return true;
    const ref = todayStr ?? formatLocalDateKey(new Date());
    return formatLocalDateKey(selectedDate) === ref;
  }, [selectedDate, todayStr]);

  const dateLabelStr = useMemo(() => {
    const d = selectedDate ?? new Date();
    const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    // Capitalize first letter
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedDate]);

  const visibleAppointments = useMemo(() => {
    switch (activeFilter) {
      case 'pending':
        return appointments.filter(a => a.status === 'pending_owner_approval');
      case 'confirmed':
        return appointments.filter(
          a =>
            a.status === 'client_confirmed' ||
            a.status === 'confirmed_by_owner' ||
            a.status === 'awaiting_client_confirmation',
        );
      case 'blocks':
        return [];
      default:
        return appointments;
    }
  }, [appointments, activeFilter]);

  const visibleBlocks = useMemo(() => {
    if (activeFilter === 'pending' || activeFilter === 'confirmed') return [];
    return blocks;
  }, [blocks, activeFilter]);

  const pendingCount = useMemo(
    () => appointments.filter(a => a.status === 'pending_owner_approval').length,
    [appointments],
  );

  // Group by hour they START in
  const apptsByHour = useMemo(() => {
    const map = new Map<number, AppointmentViewModel[]>();
    for (let h = START_HOUR; h < END_HOUR; h++) map.set(h, []);
    for (const a of visibleAppointments) {
      const h = getHour(a.startAt);
      if (h >= START_HOUR && h < END_HOUR) map.get(h)!.push(a);
    }
    return map;
  }, [visibleAppointments]);

  const blocksByHour = useMemo(() => {
    const map = new Map<number, TimeBlock[]>();
    for (let h = START_HOUR; h < END_HOUR; h++) map.set(h, []);
    for (const b of visibleBlocks) {
      const h = parseInt(b.start_time.split(':')[0], 10);
      if (h >= START_HOUR && h < END_HOUR) map.get(h)!.push(b);
    }
    return map;
  }, [visibleBlocks]);

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>Timeline del día</Text>
        <View style={styles.headerRight}>
          {appointments.length > 0 && (
            <View style={styles.apptCountBadge}>
              <Text style={styles.apptCountText}>{appointments.length}</Text>
            </View>
          )}
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pend.</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Date navigator ─────────────────────────────────────── */}
      <View style={[styles.dateNav, isMobile && styles.dateNavMobile]}>
        <Ionicons name="calendar-outline" size={14} color={colors.gray500} />
        <Text style={styles.dateNavLabel} numberOfLines={1}>{dateLabelStr}</Text>
        {isTodaySelected ? (
          <View style={styles.todayChip}>
            <Text style={styles.todayChipText}>Hoy</Text>
          </View>
        ) : (
          onGoToToday ? (
            <TouchableOpacity onPress={onGoToToday} style={styles.goTodayBtn} activeOpacity={0.7}>
              <Text style={styles.goTodayText}>Ir a hoy</Text>
            </TouchableOpacity>
          ) : null
        )}
        <View style={styles.dateNavSpacer} />
        {onGoToDate && (
          <TouchableOpacity
            onPress={() => setShowDatePicker(v => !v)}
            style={[styles.dateNavArrow, showDatePicker && styles.dateNavArrowActive]}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={14} color={showDatePicker ? colors.gold : colors.gray400} />
          </TouchableOpacity>
        )}
        {onPrevDay ? (
          <TouchableOpacity onPress={onPrevDay} style={styles.dateNavArrow} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={16} color={colors.gray300} />
          </TouchableOpacity>
        ) : null}
        {onNextDay ? (
          <TouchableOpacity onPress={onNextDay} style={styles.dateNavArrow} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        {(Object.keys(FILTER_LABELS) as TimelineFilterKey[]).map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.filterPill, activeFilter === key && styles.filterPillActive]}
            onPress={() => onFilterChange(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === key && styles.filterPillTextActive]}>
              {FILTER_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Timeline list ──────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {hours.map(hour => {
          const appts = apptsByHour.get(hour) ?? [];
          const blks  = blocksByHour.get(hour) ?? [];
          const isEmpty = appts.length === 0 && blks.length === 0;

          return (
            <View key={hour}>
              {/* Hour separator */}
              <View style={styles.hourSeparator}>
                <Text style={styles.hourLabel}>{String(hour).padStart(2, '0')}:00</Text>
                <View style={styles.hourLine} />
              </View>

              {/* Blocks */}
              {blks.map(block => (
                <BlockRow key={block.id} block={block} isMobile={isMobile} />
              ))}

              {/* Appointments */}
              {appts.map(appt => (
                <ApptCard
                  key={appt.id}
                  appt={appt}
                  workingIds={workingIds}
                  onApprove={onApprove}
                  onReject={onReject}
                  onCancel={onCancel}
                  onReschedule={onReschedule}
                  onComplete={onComplete}
                  isMobile={isMobile}
                />
              ))}

              {/* Empty slot */}
              {isEmpty && (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>Espacios disponibles</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* 20:00 end marker */}
        <View style={styles.hourSeparator}>
          <Text style={styles.hourLabel}>20:00</Text>
          <View style={styles.hourLine} />
        </View>
      </ScrollView>

      {/* ── Date picker modal ─────────────────────────────── */}
      {showDatePicker && onGoToDate && (
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={selectedDate ?? new Date()}
          onSelect={(date) => { onGoToDate(date); setShowDatePicker(false); }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

// ─── Appointment card ────────────────────────────────────────────────────────

interface ApptCardProps {
  appt: AppointmentViewModel;
  workingIds?: Map<string, WorkingAction>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  onComplete: (id: string) => void;
  isMobile: boolean;
}

function ApptCard({
  appt, workingIds, onApprove, onReject, onCancel, onReschedule, onComplete, isMobile,
}: ApptCardProps) {
  const borderColor = STATUS_BORDER[appt.status] ?? colors.gray600;
  const badgeLabel  = STATUS_BADGE_LABELS[appt.status] ?? appt.status.toUpperCase();
  const sc          = statusColors[appt.status] ?? { text: colors.gray600, bg: colors.gray800 };
  const cardAction  = workingIds?.get(appt.id);
  const isWorking   = cardAction !== undefined;

  const startStr    = fmtTime(appt.startAt);
  const endStr      = fmtTime(appt.endAt);
  const isPending   = appt.status === 'pending_owner_approval';

  return (
    <View style={[styles.apptCard, { borderLeftColor: borderColor, backgroundColor: borderColor + '18' }]}>
      {/* Time column — desktop only */}
      {!isMobile && (
        <View style={styles.timeCol}>
          <Text style={[styles.timeColStart, { color: borderColor }]}>{startStr}</Text>
          <Text style={styles.timeColEnd}>({endStr})</Text>
        </View>
      )}

      {/* Main content */}
      <View style={styles.cardContent}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: borderColor }]}>
          <Text style={styles.statusBadgeText}>{badgeLabel}</Text>
        </View>

        {/* Client */}
        <Text style={styles.cardClientName} numberOfLines={1}>{appt.clientName}</Text>

        {/* Service line */}
        <Text style={styles.cardServiceText} numberOfLines={1}>
          {appt.serviceName} · {appt.durationMinutes} min
          {isPending ? ` · Solicitado: ${startStr}` : ''}
        </Text>

        {/* Time on mobile */}
        {isMobile && (
          <Text style={[styles.cardTimeMobile, { color: borderColor }]}>
            {startStr} – {endStr}
          </Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsCol, isMobile && styles.actionsColMobile]}>
        <InlineActions
          appt={appt}
          cardAction={cardAction}
          isWorking={isWorking}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onComplete={onComplete}
          isMobile={isMobile}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}

// ─── Block row ───────────────────────────────────────────────────────────────

function BlockRow({ block, isMobile }: { block: TimeBlock; isMobile: boolean }) {
  const [sh, sm] = block.start_time.split(':').map(Number);
  const [eh, em] = block.end_time.split(':').map(Number);
  const startD = new Date(); startD.setHours(sh, sm, 0, 0);
  const endD   = new Date(); endD.setHours(eh, em, 0, 0);
  const startStr = startD.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const endStr   = endD.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.blockCard}>
      {!isMobile && (
        <View style={styles.timeCol}>
          <Text style={styles.blockTimeStart}>{startStr}</Text>
          <Text style={styles.timeColEnd}>({endStr})</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.blockBadge}>
          <Text style={styles.blockBadgeText}>BLOQUEO</Text>
        </View>
        <Text style={styles.blockLabel}>🔒 {block.label}</Text>
        {isMobile && (
          <Text style={styles.blockTimeMobile}>{startStr} – {endStr}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Inline actions ──────────────────────────────────────────────────────────

interface InlineActionsProps {
  appt: AppointmentViewModel;
  cardAction: WorkingAction | undefined;
  isWorking: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  onComplete: (id: string) => void;
  isMobile: boolean;
  borderColor: string;
}

function InlineActions({
  appt, cardAction, isWorking, onApprove, onReject, onCancel, onReschedule, onComplete,
  isMobile, borderColor,
}: InlineActionsProps) {
  const { status, id } = appt;

  if (status === 'pending_owner_approval') {
    return (
      <>
        <ActionBtn label="Aceptar"     mobileLabel="OK"     icon="checkmark-circle-outline" color={colors.statusConfirmed}  isMobile={isMobile} loading={cardAction === 'approve'} disabled={isWorking} onPress={() => onApprove(id)} />
        <ActionBtn label="Reprogramar" mobileLabel="Reprog" icon="calendar-outline"         color={colors.gold}             isMobile={isMobile} loading={false}                    disabled={isWorking} onPress={() => onReschedule(id)} />
        <ActionBtn label="Cancelar"    mobileLabel="Cancl"  icon="close-circle-outline"     color={colors.error}            isMobile={isMobile} loading={cardAction === 'reject'}  disabled={isWorking} onPress={() => onReject(id)} />
      </>
    );
  }
  if (status === 'confirmed_by_owner') {
    return (
      <>
        <ActionBtn label="Completar"   mobileLabel="Compl"  icon="checkmark-done-outline"   color={colors.statusConfirmed}  isMobile={isMobile} loading={cardAction === 'complete'} disabled={isWorking} onPress={() => onComplete(id)} />
        <ActionBtn label="Reprogramar" mobileLabel="Reprog" icon="calendar-outline"         color={colors.gold}             isMobile={isMobile} loading={false}                     disabled={isWorking} onPress={() => onReschedule(id)} />
        <ActionBtn label="Cancelar"    mobileLabel="Cancl"  icon="close-circle-outline"     color={colors.error}            isMobile={isMobile} loading={cardAction === 'cancel'}   disabled={isWorking} onPress={() => onCancel(id)} />
      </>
    );
  }
  if (status === 'client_confirmed') {
    return (
      <>
        <ActionBtn label="Completar"   mobileLabel="Compl"  icon="checkmark-done-outline"   color={colors.statusConfirmed}  isMobile={isMobile} loading={cardAction === 'complete'} disabled={isWorking} onPress={() => onComplete(id)} />
        <ActionBtn label="Reprogramar" mobileLabel="Reprog" icon="calendar-outline"         color={colors.gold}             isMobile={isMobile} loading={false}                     disabled={isWorking} onPress={() => onReschedule(id)} />
      </>
    );
  }
  if (status === 'awaiting_client_confirmation' || status === 'reschedule_required') {
    return (
      <>
        <ActionBtn label="Reprogramar" mobileLabel="Reprog" icon="calendar-outline"         color={colors.gold}             isMobile={isMobile} loading={false}                    disabled={isWorking} onPress={() => onReschedule(id)} />
        <ActionBtn label="Cancelar"    mobileLabel="Cancl"  icon="close-circle-outline"     color={colors.error}            isMobile={isMobile} loading={cardAction === 'cancel'}  disabled={isWorking} onPress={() => onCancel(id)} />
      </>
    );
  }
  return null;
}

// ─── Action button ───────────────────────────────────────────────────────────

interface ActionBtnProps {
  label: string;
  mobileLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isMobile: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function ActionBtn({ label, icon, color, isMobile, loading, disabled, onPress }: ActionBtnProps) {
  if (isMobile) {
    return (
      <TouchableOpacity
        style={[styles.iconBtn, { borderColor: color + '60', backgroundColor: color + '20' }, disabled && !loading && styles.btnDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {loading
          ? <ActivityIndicator size="small" color={color} />
          : <Ionicons name={icon} size={16} color={color} />
        }
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.textBtn, { borderColor: color + '55', backgroundColor: color + '14' }, disabled && !loading && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name={icon} size={13} color={color} />
      }
      {!loading && <Text style={[styles.textBtnLabel, { color }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─── Date Picker Modal ───────────────────────────────────────────────────────

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

function DatePickerModal({ visible, selectedDate, onSelect, onClose }: DatePickerModalProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const weeks = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const allDays = eachDayOfInterval({ start, end });
    const firstDow = (getDay(start) + 6) % 7; // Monday = 0, Sunday = 6
    const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...allDays];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewMonth]);

  const todayDate = useMemo(() => new Date(), []);
  const monthLabel = viewMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} onPress={onClose} activeOpacity={1}>
        <View
          style={styles.pickerContainer}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          {/* Month header */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setViewMonth(m => subMonths(m, 1))} style={styles.pickerNavBtn}>
              <Ionicons name="chevron-back" size={16} color={colors.gray300} />
            </TouchableOpacity>
            <Text style={styles.pickerMonthLabel}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setViewMonth(m => addMonths(m, 1))} style={styles.pickerNavBtn}>
              <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers: Mon–Sun */}
          <View style={styles.pickerDowRow}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <View key={d} style={styles.pickerDowCell}>
                <Text style={styles.pickerDowText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.pickerWeekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.pickerDayCell} />;
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, todayDate);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.pickerDayCell,
                      isSelected && styles.pickerDayCellSelected,
                      !isSelected && isToday && styles.pickerDayCellToday,
                    ]}
                    onPress={() => onSelect(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerDayText,
                      isSelected && styles.pickerDayTextSelected,
                      !isSelected && isToday && styles.pickerDayTextToday,
                    ]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerMobile: {
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.white,
    fontSize: 15,
  },
  titleMobile: {
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apptCountBadge: {
    backgroundColor: colors.gold + '22',
    borderWidth: 1,
    borderColor: colors.gold + '55',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  apptCountText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
    fontSize: 11,
  },
  pendingBadge: {
    backgroundColor: colors.statusPending + '22',
    borderWidth: 1,
    borderColor: colors.statusPending + '55',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    ...typography.caption,
    color: colors.statusPending,
    fontWeight: '700',
    fontSize: 11,
  },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  filterPillActive: {
    backgroundColor: colors.gold + '22',
    borderColor: colors.gold,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.gold,
  },

  // Scroll / list
  scrollContent: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: spacing.xxl,
  },

  // Hour separator
  hourSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  hourLabel: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 11,
    fontWeight: '600',
    width: 38,
    textAlign: 'right',
    flexShrink: 0,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray800,
  },

  // Empty slot
  emptySlot: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptySlotText: {
    ...typography.caption,
    color: colors.gray700,
    fontStyle: 'italic',
    fontSize: 11,
  },

  // Appointment card
  apptCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 2,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },

  // Time column (desktop)
  timeCol: {
    width: 58,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  timeColStart: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  timeColEnd: {
    fontSize: 10,
    color: colors.gray600,
    lineHeight: 13,
  },

  // Card main content
  cardContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },

  // Status badge (on the card)
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 2,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
    lineHeight: 13,
  },

  cardClientName: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
  },
  cardServiceText: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  cardTimeMobile: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },

  // Action buttons column
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    flexShrink: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 260,
  },
  actionsColMobile: {
    flexDirection: 'column',
    gap: spacing.xxs,
    maxWidth: 48,
  },

  // Text action button (desktop)
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  textBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },

  // Icon action button (mobile)
  iconBtn: {
    flexDirection: 'column',
    width: 40,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBtnLabel: {
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
    textAlign: 'center',
  },

  btnDisabled: {
    opacity: 0.4,
  },

  // Block card
  blockCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 2,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gray700,
    backgroundColor: colors.gray800 + 'AA',
    overflow: 'hidden',
  },
  blockTimeStart: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray500,
    lineHeight: 14,
  },
  blockBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.gray700,
    marginBottom: 2,
  },
  blockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.gray400,
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  blockLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  blockTimeMobile: {
    fontSize: 10,
    color: colors.gray600,
    marginTop: 1,
  },

  // ── Date navigator ──────────────────────────────────────────────────────
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    gap: spacing.sm,
    minHeight: 40,
  },
  dateNavMobile: {
    paddingHorizontal: spacing.md,
  },
  dateNavLabel: {
    ...typography.bodySmall,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  todayChip: {
    backgroundColor: colors.gold + '22',
    borderWidth: 1,
    borderColor: colors.gold + '55',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  todayChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    lineHeight: 14,
  },
  goTodayBtn: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  goTodayText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray300,
    lineHeight: 14,
  },
  dateNavSpacer: {
    flex: 1,
  },
  dateNavArrow: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dateNavArrowActive: {
    borderColor: colors.gold + '88',
    backgroundColor: colors.gold + '22',
  },

  // ── Date picker calendar ───────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray700,
    padding: spacing.md,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  pickerNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  pickerMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  pickerDowRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  pickerDowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  pickerDowText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray500,
  },
  pickerWeekRow: {
    flexDirection: 'row',
  },
  pickerDayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    margin: 1,
  },
  pickerDayCellSelected: {
    backgroundColor: colors.gold,
  },
  pickerDayCellToday: {
    backgroundColor: colors.gold + '22',
    borderWidth: 1,
    borderColor: colors.gold + '55',
  },
  pickerDayText: {
    fontSize: 13,
    color: colors.gray300,
  },
  pickerDayTextSelected: {
    color: colors.gray900,
    fontWeight: '700',
  },
  pickerDayTextToday: {
    color: colors.gold,
    fontWeight: '700',
  },
});


