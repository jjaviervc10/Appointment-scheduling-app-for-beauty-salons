import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { KPIStats, type KPIKey } from '../../src/components/dashboard/KPIStats';
import { QuickActionsBar } from '../../src/components/dashboard/QuickActionsBar';
import { PendingRequestsPanel } from '../../src/components/dashboard/PendingRequestsPanel';
import { TodayTimeline } from '../../src/components/dashboard/TodayTimeline';
import { FloatingActionButton } from '../../src/components/ui/FloatingActionButton';
import { NewAppointmentModal } from '../../src/components/modals/NewAppointmentModal';
import { BlockTimeModal } from '../../src/components/modals/BlockTimeModal';
import { IncidentModal } from '../../src/components/modals/IncidentModal';
import { RescheduleModal } from '../../src/components/modals/RescheduleModal';
import { KPIFilterModal } from '../../src/components/modals/KPIFilterModal';
import { MOCK_APPOINTMENTS, MOCK_TIME_BLOCKS } from '../../src/services/mock-data';

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function DashboardScreen() {
  const router = useRouter();
  const todayStr = fmt(new Date());
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [kpiFilter, setKpiFilter] = useState<KPIKey | null>(null);

  const todayAppts = useMemo(
    () => MOCK_APPOINTMENTS.filter(a => fmt(a.startAt) === todayStr),
    [todayStr]
  );
  const pending = useMemo(
    () => MOCK_APPOINTMENTS.filter(a => a.status === 'pending_owner_approval'),
    []
  );
  const confirmedCount = useMemo(
    () => todayAppts.filter(a => a.status === 'client_confirmed' || a.status === 'confirmed_by_owner').length,
    [todayAppts]
  );
  const todayBlocks = useMemo(
    () => MOCK_TIME_BLOCKS.filter(b => b.date === todayStr),
    [todayStr]
  );
  const totalMinutes = todayAppts.reduce((s, a) => s + a.durationMinutes, 0);
  const occupation = Math.min(100, Math.round((totalMinutes / (9 * 60)) * 100));

  const kpiFilteredAppts = useMemo(() => {
    if (!kpiFilter) return [];
    switch (kpiFilter) {
      case 'citasHoy': return todayAppts;
      case 'pendientes': return pending;
      case 'confirmadas': return todayAppts.filter(a => a.status === 'client_confirmed' || a.status === 'confirmed_by_owner');
      case 'ocupacion': return todayAppts;
      default: return [];
    }
  }, [kpiFilter, todayAppts, pending]);

  const formatToday = () => {
    const d = new Date();
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="Centro de operación"
        subtitle={formatToday()}
        onNewAppointment={() => setShowNewAppt(true)}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
        {/* KPIs */}
        <KPIStats
          citasHoy={todayAppts.length}
          pendientes={pending.length}
          confirmadas={confirmedCount}
          ocupacion={occupation}
          onKPIPress={(key) => setKpiFilter(key)}
        />

        {/* Quick actions */}
        <QuickActionsBar
          onNewAppointment={() => setShowNewAppt(true)}
          onBlockTime={() => setShowBlockTime(true)}
          onSearchClient={() => router.push('/(owner)/clients' as any)}
          onSendMessage={() => router.push('/(owner)/messages' as any)}
        />

        {/* Pending requests */}
        <PendingRequestsPanel
          appointments={pending}
          onAccept={(id) => console.log('Accept', id)}
          onReject={(id) => console.log('Reject', id)}
          onReschedule={(id) => setRescheduleId(id)}
        />

        {/* Today timeline */}
        <TodayTimeline
          appointments={todayAppts}
          blocks={todayBlocks}
          onAppointmentPress={(id) => console.log('Appointment pressed', id)}
        />
      </ScrollView>

      <FloatingActionButton
        onNewAppointment={() => setShowNewAppt(true)}
        onBlockTime={() => setShowBlockTime(true)}
        onNewIncident={() => setShowIncident(true)}
      />

      <NewAppointmentModal visible={showNewAppt} onClose={() => setShowNewAppt(false)} />
      <BlockTimeModal visible={showBlockTime} onClose={() => setShowBlockTime(false)} />
      <IncidentModal visible={showIncident} onClose={() => setShowIncident(false)} />
      <RescheduleModal
        visible={!!rescheduleId}
        appointment={MOCK_APPOINTMENTS.find(a => a.id === rescheduleId) || null}
        onClose={() => setRescheduleId(null)}
      />
      <KPIFilterModal
        visible={!!kpiFilter}
        filterKey={kpiFilter}
        appointments={kpiFilteredAppts}
        occupation={occupation}
        onClose={() => setKpiFilter(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xxl,
    gap: spacing.xl,
    paddingBottom: 100,
  },
  scrollContentMobile: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 80,
  },
});
