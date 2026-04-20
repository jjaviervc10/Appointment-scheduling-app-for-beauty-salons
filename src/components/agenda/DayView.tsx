import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { statusColors, statusLabels } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';
import type { TimeBlock } from '../../types/database';

interface DayViewProps {
  date: Date;
  appointments: AppointmentViewModel[];
  blocks: TimeBlock[];
  onDateChange: (date: Date) => void;
}

const HOUR_HEIGHT = 72;
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function DayView({ date, appointments, blocks, onDateChange }: DayViewProps) {
  const [selectedAppt, setSelectedAppt] = useState<AppointmentViewModel | null>(null);
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i), []);

  const navigateDay = (delta: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + delta);
    onDateChange(newDate);
  };

  const isToday = new Date().toDateString() === date.toDateString();

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const getTop = (time: Date | string) => {
    let h: number, m: number;
    if (typeof time === 'string') {
      [h, m] = time.split(':').map(Number);
    } else {
      h = time.getHours();
      m = time.getMinutes();
    }
    return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  };

  const getHeight = (minutes: number) => Math.max((minutes / 60) * HOUR_HEIGHT, 40);

  const getStatusStyle = (status: string) => {
    const sc = statusColors[status as keyof typeof statusColors];
    return sc || { text: colors.gray600, bg: colors.gray200 };
  };

  return (
    <View style={styles.container}>
      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          {isToday && <View style={styles.todayDot} />}
        </View>
        <TouchableOpacity onPress={() => navigateDay(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDateChange(new Date())} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Hoy</Text>
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{appointments.length}</Text> citas
        </Text>
        <Text style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.statusConfirmed }]}>
            {appointments.filter(a => a.status === 'client_confirmed' || a.status === 'confirmed_by_owner').length}
          </Text> confirmadas
        </Text>
        <Text style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.statusPending }]}>
            {appointments.filter(a => a.status === 'pending_owner_approval').length}
          </Text> pendientes
        </Text>
        <Text style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.gray500 }]}>{blocks.length}</Text> bloqueos
        </Text>
      </View>

      {/* Timeline */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.timeline}>
          {/* Hour grid */}
          {hours.map((hour) => (
            <View key={hour} style={[styles.hourRow, { top: (hour - START_HOUR) * HOUR_HEIGHT }]}>
              <Text style={styles.hourLabel}>{String(hour).padStart(2, '0')}:00</Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          {/* Half-hour lines */}
          {hours.slice(0, -1).map((hour) => (
            <View key={`half-${hour}`} style={[styles.halfHourLine, { top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }]} />
          ))}

          {/* Time blocks */}
          {blocks.map((block) => {
            const top = getTop(block.start_time);
            const [sh, sm] = block.start_time.split(':').map(Number);
            const [eh, em] = block.end_time.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            const height = getHeight(dur);
            return (
              <View key={block.id} style={[styles.blockItem, { top, height }]}>
                <Ionicons name="lock-closed" size={11} color={colors.gray500} />
                <Text style={styles.blockLabel}>{block.label}</Text>
                <Text style={styles.blockTime}>{block.start_time} - {block.end_time}</Text>
              </View>
            );
          })}

          {/* Appointments */}
          {appointments.map((appt) => {
            const top = getTop(appt.startAt);
            const height = getHeight(appt.durationMinutes);
            const sc = getStatusStyle(appt.status);
            return (
              <TouchableOpacity
                key={appt.id}
                style={[styles.apptBlock, { top, height, backgroundColor: sc.bg, borderLeftColor: sc.text }]}
                onPress={() => setSelectedAppt(appt)}
                activeOpacity={0.7}
              >
                <View style={styles.apptRow}>
                  <View style={styles.apptInfo}>
                    <Text style={[styles.apptClient, { color: sc.text }]} numberOfLines={1}>
                      {appt.clientName}
                    </Text>
                    <Text style={styles.apptDetail} numberOfLines={1}>
                      {appt.serviceName} · {appt.durationMinutes} min
                    </Text>
                  </View>
                  <View style={styles.apptTimeBox}>
                    <Text style={styles.apptTime}>
                      {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: sc.text }]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Current time line */}
          {isToday && <NowIndicator startHour={START_HOUR} hourHeight={HOUR_HEIGHT} />}

          <View style={{ height: TOTAL_HOURS * HOUR_HEIGHT + HOUR_HEIGHT }} />
        </View>
      </ScrollView>

      {/* Quick actions modal */}
      {selectedAppt && (
        <AppointmentQuickActions
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}
    </View>
  );
}

function NowIndicator({ startHour, hourHeight }: { startHour: number; hourHeight: number }) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < startHour || h > 20) return null;
  const top = (h - startHour) * hourHeight + (m / 60) * hourHeight;
  return (
    <View style={[nowStyles.container, { top }]}>
      <View style={nowStyles.dot} />
      <View style={nowStyles.line} />
    </View>
  );
}

function AppointmentQuickActions({ appointment, onClose }: { appointment: AppointmentViewModel; onClose: () => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const sc = statusColors[appointment.status as keyof typeof statusColors] || { text: colors.gray600, bg: colors.gray200 };
  const label = statusLabels[appointment.status as keyof typeof statusLabels] || appointment.status;

  const actions = [
    { icon: 'checkmark-circle' as const, label: 'Confirmar', color: colors.statusConfirmed, show: appointment.status === 'pending_owner_approval' },
    { icon: 'calendar-outline' as const, label: 'Reprogramar', color: colors.gold, show: true },
    { icon: 'ban-outline' as const, label: 'Cancelar', color: '#C0392B', show: true },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp', color: '#25D366', show: true },
    { icon: 'reader-outline' as const, label: 'Detalle', color: colors.gray600, show: true },
  ].filter(a => a.show);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={[modalStyles.card, { width: Math.min(360, screenWidth - 32) }]}>
          <View style={modalStyles.header}>
            <View style={modalStyles.headerInfo}>
              <Text style={modalStyles.clientName}>{appointment.clientName}</Text>
              <Text style={modalStyles.service}>
                {appointment.serviceName} · {appointment.durationMinutes} min
              </Text>
              <Text style={modalStyles.time}>
                {appointment.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - {appointment.endAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={[modalStyles.statusChip, { backgroundColor: sc.bg }]}>
              <Text style={[modalStyles.statusText, { color: sc.text }]}>{label}</Text>
            </View>
          </View>
          <View style={modalStyles.actionsGrid}>
            {actions.map((action) => (
              <TouchableOpacity key={action.label} style={modalStyles.actionBtn} activeOpacity={0.7}>
                <View style={[modalStyles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={18} color={action.color} />
                </View>
                <Text style={modalStyles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={modalStyles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const nowStyles = StyleSheet.create({
  container: { position: 'absolute', left: 48, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
  line: { flex: 1, height: 2, backgroundColor: colors.error },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.gray900, borderRadius: radii.lg, padding: spacing.xxl, width: 360, borderWidth: 1, borderColor: colors.gray800 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerInfo: { flex: 1, gap: spacing.xxs },
  clientName: { ...typography.h3, color: colors.white },
  service: { ...typography.body, color: colors.gray400, fontSize: 13 },
  time: { ...typography.bodySmall, color: colors.gray500, fontSize: 12 },
  statusChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.full, alignSelf: 'flex-start' },
  statusText: { ...typography.caption, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionBtn: { alignItems: 'center', gap: spacing.xs, width: 56 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { ...typography.caption, color: colors.gray400, textAlign: 'center', fontSize: 10 },
  closeBtn: { marginTop: spacing.xl, alignItems: 'center', paddingVertical: spacing.sm },
  closeBtnText: { ...typography.bodySmall, color: colors.gray500 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateNav: {
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
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...typography.subtitle,
    color: colors.white,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  todayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.gold + '15',
  },
  todayBtnText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '600',
  },
  summaryStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    gap: spacing.xl,
  },
  summaryItem: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  summaryValue: {
    fontWeight: '700',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 56,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: 48,
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
    textAlign: 'right',
    paddingRight: spacing.sm,
    marginTop: -7,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray800,
  },
  halfHourLine: {
    position: 'absolute',
    left: 56,
    right: 0,
    height: 1,
    backgroundColor: colors.gray900,
  },
  blockItem: {
    position: 'absolute',
    left: 56,
    right: spacing.lg,
    backgroundColor: colors.gray800 + '90',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderStyle: 'dashed',
  },
  blockLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  blockTime: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
  },
  apptBlock: {
    position: 'absolute',
    left: 56,
    right: spacing.lg,
    borderRadius: radii.sm,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  apptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apptInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  apptClient: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '600',
  },
  apptDetail: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
  },
  apptTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  apptTime: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
