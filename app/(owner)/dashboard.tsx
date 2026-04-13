import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { StatusChip } from '../../src/components/ui/StatusChip';
import { AppointmentCard } from '../../src/components/appointments/AppointmentCard';
import { usePendingAppointments, useAppointmentsByDate } from '../../src/hooks/useAppointments';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAppts } = useAppointmentsByDate(today);
  const { data: pending } = usePendingAppointments();

  const formatToday = () => {
    const d = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Stats
  const confirmedToday = todayAppts.filter(
    (a) => a.status === 'client_confirmed' || a.status === 'confirmed_by_owner'
  ).length;
  const pendingToday = todayAppts.filter(
    (a) => a.status === 'pending_owner_approval'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi agenda</Text>
        <Text style={styles.headerSubtitle}>{formatToday()}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayAppts.length}</Text>
            <Text style={styles.statLabel}>Citas hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.statusPending }]}>
              {pendingToday}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.statusConfirmed }]}>
              {confirmedToday}
            </Text>
            <Text style={styles.statLabel}>Confirmadas</Text>
          </View>
        </View>

        {/* Pending Requests */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solicitud pendiente</Text>
            {pending.map((appt) => (
              <View key={appt.id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingClient}>{appt.clientName}</Text>
                  <Text style={styles.pendingService}>
                    {appt.serviceName}
                  </Text>
                  <Text style={styles.pendingTime}>
                    Solicita: {appt.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} pm
                  </Text>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Today's Confirmed Agenda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agenda confirmada</Text>
          {todayAppts
            .filter(
              (a) =>
                a.status === 'client_confirmed' ||
                a.status === 'confirmed_by_owner'
            )
            .map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} variant="owner" />
            ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(owner)/calendar')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.gold}
            />
            <Text style={styles.quickActionLabel}>Calendario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(owner)/availability')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={24} color={colors.gold} />
            <Text style={styles.quickActionLabel}>Disponibilidad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(owner)/incidents')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="warning-outline"
              size={24}
              color={colors.error}
            />
            <Text style={styles.quickActionLabel}>Incidencias</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  statNumber: {
    ...typography.h1,
    color: colors.gray900,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray900,
  },
  pendingCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    ...shadows.card,
  },
  pendingInfo: {
    marginBottom: spacing.md,
  },
  pendingClient: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  pendingService: {
    ...typography.body,
    color: colors.gray600,
    marginTop: spacing.xxs,
  },
  pendingTime: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.black,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  acceptButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray400,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  rejectButtonText: {
    ...typography.buttonSmall,
    color: colors.gray600,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.gray800,
    textAlign: 'center',
  },
});
