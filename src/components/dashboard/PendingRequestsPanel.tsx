import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';

interface PendingRequestsPanelProps {
  appointments: AppointmentViewModel[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onReschedule: (id: string) => void;
  // Map<appointmentId, action> — per-card tracking, allows concurrent operations
  workingIds?: Map<string, 'approve' | 'reject' | 'complete'>;
  isCollapsed?: boolean;
  isExpanded?: boolean;
  onToggle: () => void;
}

export function PendingRequestsPanel({
  appointments,
  onAccept,
  onReject,
  onReschedule,
  workingIds,
  isCollapsed = false,
  isExpanded = false,
  onToggle,
}: PendingRequestsPanelProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  // Cards switch to column layout below 1280px (narrow desktop panels + mobile)
  // At 768-1280px each panel is only ~250-500px wide — too tight for 3-button row layout
  const isColumnCard = width < 1280;

  return (
    <View style={[styles.container, isCollapsed && styles.containerCollapsed]}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={[styles.badge, appointments.length === 0 && styles.badgeEmpty]}>
            <Text style={styles.badgeText}>{appointments.length}</Text>
          </View>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>Solicitudes pendientes</Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.gold}
        />
      </TouchableOpacity>

      {!isCollapsed && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentInner}
          showsVerticalScrollIndicator={false}
        >
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.gray700} />
              <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
            </View>
          ) : null}

          {appointments.map((appt) => {
            // Per-card state: only THIS card is affected, other cards stay fully interactive
            const cardAction = workingIds?.get(appt.id);
            const isWorking = cardAction !== undefined;
            const isApproveWorking = cardAction === 'approve';
            const isRejectWorking = cardAction === 'reject';
            const isDisabled = isWorking;

            return (
              <View key={appt.id} style={[styles.card, isColumnCard && styles.cardMobile, isWorking && styles.cardWorking]}>
                <View style={[styles.cardLeft, isColumnCard && styles.cardLeftMobile]}>
                  <View style={[styles.avatar, isMobile && styles.avatarMobile]}>
                    <Text style={[styles.avatarText, isMobile && styles.avatarTextMobile]}>
                      {appt.clientName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.clientName, isMobile && styles.clientNameMobile]} numberOfLines={1}>{appt.clientName}</Text>
                    <Text style={styles.service} numberOfLines={1}>{appt.serviceName} · {appt.durationMinutes} min</Text>
                    <Text style={styles.time}>
                      {appt.startAt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.actions, isColumnCard && styles.actionsMobile]}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, isMobile && styles.acceptBtnMobile, isDisabled && !isApproveWorking && styles.btnDisabled]}
                    onPress={() => onAccept(appt.id)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    {isApproveWorking ? (
                      <ActivityIndicator size="small" color={colors.statusConfirmed} />
                    ) : (
                      <Ionicons name="checkmark" size={16} color={colors.statusConfirmed} />
                    )}
                    <Text style={styles.acceptText}>{isApproveWorking ? 'Aceptando...' : 'Aceptar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rescheduleBtn, isMobile && styles.rescheduleBtnMobile, isDisabled && styles.btnDisabled]}
                    onPress={() => onReschedule(appt.id)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <Ionicons name="calendar-outline" size={14} color={colors.gold} />
                    <Text style={styles.rescheduleText}>Reprogramar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isMobile && styles.rejectBtnMobile, isDisabled && !isRejectWorking && styles.btnDisabled]}
                    onPress={() => onReject(appt.id)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    {isRejectWorking ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons name="close-circle-outline" size={14} color={colors.error} />
                    )}
                    <Text style={styles.rejectText}>{isRejectWorking ? 'Cancelando...' : 'Cancelar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  containerCollapsed: {
    flex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.statusPending,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeEmpty: {
    backgroundColor: colors.gray700,
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
    fontSize: 15,
  },
  titleMobile: {
    fontSize: 13,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    // width:'100%' ensures the content container fills the scroll view width
    // in React Native Web when the parent is a flex row child
    width: '100%',
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 13,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  cardWorking: {
    borderColor: colors.gold,
    backgroundColor: colors.gray900,
    opacity: 0.9,
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
    minWidth: 0,
    flexShrink: 1,
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
    // flexShrink:0 prevents the actions block from collapsing to 0 in a flex-row card
    flexShrink: 0,
  },
  actionsMobile: {
    gap: spacing.xs,
  },
  acceptBtn: {
    flex: 1,
    minWidth: 88,
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
    minWidth: 100,
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
    minWidth: 88,
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
  btnDisabled: {
    opacity: 0.45,
  },
});
