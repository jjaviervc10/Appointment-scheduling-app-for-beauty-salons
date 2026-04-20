import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { KPIKey } from '../dashboard/KPIStats';
import type { AppointmentViewModel } from '../../types/models';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_owner_approval: { label: 'Pendiente', color: colors.statusPending },
  client_confirmed: { label: 'Confirmada', color: colors.statusConfirmed },
  confirmed_by_owner: { label: 'Confirmada', color: colors.statusConfirmed },
  completed: { label: 'Completada', color: colors.info },
  no_show: { label: 'No asistió', color: colors.error },
};

interface Props {
  visible: boolean;
  filterKey: KPIKey | null;
  appointments: AppointmentViewModel[];
  occupation: number;
  onClose: () => void;
}

const FILTER_META: Record<KPIKey, { title: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  citasHoy: { title: 'Citas de hoy', icon: 'calendar', color: colors.gray900 },
  pendientes: { title: 'Citas pendientes', icon: 'time', color: colors.statusPending },
  confirmadas: { title: 'Citas confirmadas', icon: 'checkmark-circle', color: colors.statusConfirmed },
  ocupacion: { title: 'Ocupación del día', icon: 'bar-chart', color: colors.info },
};

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function KPIFilterModal({ visible, filterKey, appointments, occupation, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (!filterKey) return null;

  const meta = FILTER_META[filterKey];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIconBg, { backgroundColor: meta.color + '18' }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <Text style={styles.headerTitle}>{meta.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Count badge */}
          <View style={[styles.countBadge, { backgroundColor: meta.color + '12' }]}>
            <Text style={[styles.countText, { color: meta.color }]}>
              {filterKey === 'ocupacion' ? `${occupation}%` : `${appointments.length} citas`}
            </Text>
          </View>

          {/* Occupation detail */}
          {filterKey === 'ocupacion' ? (
            <View style={styles.occupationContainer}>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${occupation}%` as any }]} />
              </View>
              <Text style={styles.occupationNote}>
                Basado en 9 horas laborales (9:00 AM – 6:00 PM)
              </Text>
              <View style={styles.occDetailRow}>
                <Text style={styles.occDetailLabel}>Minutos ocupados</Text>
                <Text style={styles.occDetailValue}>
                  {appointments.reduce((s, a) => s + a.durationMinutes, 0)} min
                </Text>
              </View>
              <View style={styles.occDetailRow}>
                <Text style={styles.occDetailLabel}>Minutos disponibles</Text>
                <Text style={styles.occDetailValue}>
                  {9 * 60 - appointments.reduce((s, a) => s + a.durationMinutes, 0)} min
                </Text>
              </View>
            </View>
          ) : (
            /* Appointment list */
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {appointments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={40} color={colors.gray300} />
                  <Text style={styles.emptyText}>No hay citas en esta categoría</Text>
                </View>
              ) : (
                appointments.map((appt) => {
                  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: colors.gray500 };
                  return (
                    <View key={appt.id} style={styles.apptCard}>
                      <View style={styles.apptTimeCol}>
                        <Text style={styles.apptTime}>{formatTime(appt.startAt)}</Text>
                        <Text style={styles.apptDuration}>{appt.durationMinutes} min</Text>
                      </View>
                      <View style={styles.apptDivider} />
                      <View style={styles.apptInfo}>
                        <Text style={styles.apptClient}>{appt.clientName}</Text>
                        <Text style={styles.apptService}>{appt.serviceName}</Text>
                      </View>
                      <View style={[styles.apptStatusBadge, { backgroundColor: st.color + '15' }]}>
                        <Text style={[styles.apptStatusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
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
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  cardMobile: {
    maxWidth: '100%',
    maxHeight: '90%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    flex: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  countText: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  list: {
    flexGrow: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray400,
  },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  apptTimeCol: {
    alignItems: 'center',
    width: 70,
  },
  apptTime: {
    ...typography.subtitle,
    color: colors.white,
  },
  apptDuration: {
    ...typography.caption,
    color: colors.gray400,
  },
  apptDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.gray700,
    marginHorizontal: spacing.sm,
  },
  apptInfo: {
    flex: 1,
    gap: 2,
  },
  apptClient: {
    ...typography.subtitle,
    color: colors.white,
  },
  apptService: {
    ...typography.caption,
    color: colors.gray500,
  },
  apptStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  apptStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Occupation
  occupationContainer: {
    gap: spacing.md,
  },
  barBg: {
    height: 12,
    backgroundColor: colors.gray800,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.info,
    borderRadius: radii.full,
  },
  occupationNote: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'center',
  },
  occDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  occDetailLabel: {
    ...typography.body,
    color: colors.gray400,
  },
  occDetailValue: {
    ...typography.subtitle,
    color: colors.white,
  },
});
