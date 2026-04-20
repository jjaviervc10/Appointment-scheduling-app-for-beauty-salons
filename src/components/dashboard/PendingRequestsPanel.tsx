import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';

interface PendingRequestsPanelProps {
  appointments: AppointmentViewModel[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onReschedule: (id: string) => void;
}

export function PendingRequestsPanel({ appointments, onAccept, onReject, onReschedule }: PendingRequestsPanelProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (appointments.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{appointments.length}</Text>
          </View>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>Solicitudes pendientes</Text>
        </View>
      </View>

      {appointments.map((appt) => (
        <View key={appt.id} style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={[styles.cardLeft, isMobile && styles.cardLeftMobile]}>
            <View style={[styles.avatar, isMobile && styles.avatarMobile]}>
              <Text style={[styles.avatarText, isMobile && styles.avatarTextMobile]}>
                {appt.clientName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.clientName, isMobile && styles.clientNameMobile]}>{appt.clientName}</Text>
              <Text style={styles.service}>{appt.serviceName} · {appt.durationMinutes} min</Text>
              <Text style={styles.time}>
                {appt.startAt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={[styles.actions, isMobile && styles.actionsMobile]}>
            <TouchableOpacity style={[styles.acceptBtn, isMobile && styles.acceptBtnMobile]} onPress={() => onAccept(appt.id)} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={16} color={colors.statusConfirmed} />
              <Text style={styles.acceptText}>Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rescheduleBtn, isMobile && styles.rescheduleBtnMobile]} onPress={() => onReschedule(appt.id)} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={14} color={colors.gold} />
              <Text style={styles.rescheduleText}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rejectBtn, isMobile && styles.rejectBtnMobile]} onPress={() => onReject(appt.id)} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={14} color={colors.error} />
              <Text style={styles.rejectText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.statusPending,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  title: {
    ...typography.h3,
    color: colors.white,
    fontSize: 16,
  },
  titleMobile: {
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  cardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cardLeftMobile: {
    flex: undefined,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
    fontSize: 13,
  },
  avatarTextMobile: {
    fontSize: 11,
  },
  info: {
    flex: 1,
    gap: spacing.xxs,
  },
  clientName: {
    ...typography.subtitle,
    color: colors.white,
    fontSize: 14,
  },
  clientNameMobile: {
    fontSize: 13,
  },
  service: {
    ...typography.bodySmall,
    color: colors.gray400,
    fontSize: 12,
  },
  time: {
    ...typography.caption,
    color: colors.gray500,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  actionsMobile: {
    gap: spacing.xs,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.gray900,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  acceptBtnMobile: {},
  acceptText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '600',
    fontSize: 11,
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: 'transparent',
    height: 32,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radii.sm,
  },
  rescheduleBtnMobile: {},
  rescheduleText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '600',
    fontSize: 11,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: 'transparent',
    height: 32,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radii.sm,
  },
  rejectBtnMobile: {},
  rejectText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    fontSize: 11,
  },
});
