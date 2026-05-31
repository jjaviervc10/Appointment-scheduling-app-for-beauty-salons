import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { KPIStats, type KPIKey } from '../../src/components/dashboard/KPIStats';
import { QuickActionsBar } from '../../src/components/dashboard/QuickActionsBar';
import { PendingRequestsPanel } from '../../src/components/dashboard/PendingRequestsPanel';
import { TodayTimeline, type TimelineFilterKey } from '../../src/components/dashboard/TodayTimeline';
import { FloatingActionButton } from '../../src/components/ui/FloatingActionButton';
import { NewAppointmentModal } from '../../src/components/modals/NewAppointmentModal';
import { BlockTimeModal } from '../../src/components/modals/BlockTimeModal';
import { IncidentModal } from '../../src/components/modals/IncidentModal';
import { RescheduleModal, type RescheduleSimulationResult } from '../../src/components/modals/RescheduleModal';
import { AppointmentDurationModal } from '../../src/components/modals/AppointmentDurationModal';
import { KPIFilterModal } from '../../src/components/modals/KPIFilterModal';
import type { AppointmentViewModel } from '../../src/types/models';
import type { TimeBlock } from '../../src/types/database';
import { fetchAppointmentsByDate, fetchAwaitingAppointments, fetchPendingAppointments, updateAppointmentStatus } from '../../src/services/appointments';
import { approveOwnerAppointment } from '../../src/services/ownerApi';
import { fetchTimeBlocks } from '../../src/services/availability';
import { isHttpError } from '../../src/types/api';
import { formatLocalDateKey } from '../../src/utils/date';
import { MOCK_DEMO_APPOINTMENTS, MOCK_DEMO_PENDING, MOCK_DEMO_AWAITING, MOCK_DEMO_BLOCKS } from '../../src/services/mock-data';

type DashboardAction = 'approve' | 'reject' | 'cancel' | 'complete';
type FeedbackTone = 'success' | 'error' | 'info';

interface FeedbackMessage {
  tone: FeedbackTone;
  title: string;
  message: string;
}

function getErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    return `Backend ${error.status}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Error desconocido al conectar con backend.';
}

function logDashboardActionError(action: string, error: unknown, meta?: Record<string, unknown>) {
  console.error('[DASHBOARD ACTION ERROR]', {
    action,
    ...meta,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const todayStr = formatLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateStr = formatLocalDateKey(selectedDate);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [approveDurationId, setApproveDurationId] = useState<string | null>(null);
  const [kpiFilter, setKpiFilter] = useState<KPIKey | null>(null);
  const [todayAppts, setTodayAppts] = useState<AppointmentViewModel[]>([]);
  const [pending, setPending] = useState<AppointmentViewModel[]>([]);
  const [awaiting, setAwaiting] = useState<AppointmentViewModel[]>([]);
  const [todayBlocks, setTodayBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  // Map<appointmentId, action> — tracks each card independently, allowing concurrent actions
  const [workingIds, setWorkingIds] = useState<Map<string, DashboardAction>>(new Map());
  // Debounced refetch ref — cancels and reschedules on every new action to avoid race conditions
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterKey>('all');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadDashboardData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setErrorMsg(null);

    console.info('[DASHBOARD ACTION]', {
      action: 'load_dashboard_data',
      endpoints: [
        'GET /api/owner/appointments/pending',
        'GET /api/owner/appointments/today',
        'GET /api/owner/time-blocks',
      ],
      todayStr,
      silent: opts?.silent ?? false,
    });

    try {
      const [pendingData, todayData, blocksData, awaitingData] = await Promise.all([
        fetchPendingAppointments(),
        fetchAppointmentsByDate(selectedDateStr),
        fetchTimeBlocks(selectedDateStr),
        fetchAwaitingAppointments(),
      ]);
      setPending(pendingData);
      setTodayAppts(todayData);
      setTodayBlocks(blocksData);
      setAwaiting(awaitingData);
    } catch (error) {
      logDashboardActionError('load_dashboard_data', error, {
        endpoints: [
          'GET /api/owner/appointments/pending',
          'GET /api/owner/appointments/today',
          'GET /api/owner/time-blocks',
          'GET /api/owner/appointments/awaiting',
        ],
        dateStr: selectedDateStr,
      });
      if (!opts?.silent) {
        setErrorMsg(`No se pudo sincronizar con backend. ${getErrorMessage(error)}`);
        setFeedback({
          tone: 'error',
          title: 'Sin sincronizacion',
          message: getErrorMessage(error),
        });
        setPending([]);
        setTodayAppts([]);
        setTodayBlocks([]);
        setAwaiting([]);
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [selectedDateStr]);

  const activateDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setTodayAppts(MOCK_DEMO_APPOINTMENTS);
    setPending(MOCK_DEMO_PENDING);
    setAwaiting(MOCK_DEMO_AWAITING);
    setTodayBlocks(MOCK_DEMO_BLOCKS);
    setLoading(false);
    setErrorMsg(null);
    setFeedback({ tone: 'info', title: 'Modo Demo activo', message: '8 citas simuladas cargadas para hoy.' });
  }, []);

  const deactivateDemoMode = useCallback(() => {
    setIsDemoMode(false);
    void loadDashboardData();
  }, [loadDashboardData]);

  const goToPrevDay = useCallback(() => {
    setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, []);

  // Auto-dismiss success feedback after 4 seconds
  useEffect(() => {
    if (feedback?.tone !== 'success') return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const confirmedCount = useMemo(
    () => todayAppts.filter(a => a.status === 'client_confirmed' || a.status === 'confirmed_by_owner').length,
    [todayAppts]
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

  // Schedules ONE silent refetch 800ms after the last action — prevents race conditions
  // when multiple actions complete in rapid succession
  const scheduleSilentRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      void loadDashboardData({ silent: true });
    }, 800);
  }, [loadDashboardData]);

  const runAction = useCallback(
    async (id: string, action: DashboardAction, options?: { durationMinutes?: number }) => {
      // Per-card loading: add this id to the working set (does not block other cards)
      setWorkingIds(prev => { const m = new Map(prev); m.set(id, action); return m; });
      setErrorMsg(null);
      setFeedback(null);

      const endpointByAction = {
        approve: `POST /api/owner/appointments/${id}/approve`,
        reject: `POST /api/owner/appointments/${id}/reject`,
        cancel: `POST /api/owner/appointments/${id}/cancel`,
        complete: `POST /api/owner/appointments/${id}/complete`,
      } as const;

      console.info('[DASHBOARD ACTION]', {
        action,
        appointmentId: id,
        endpoint: endpointByAction[action],
      });

      try {
        if (action === 'approve') {
          const result = await approveOwnerAppointment(id, {
            durationMinutes: options?.durationMinutes,
          });
          // Optimistic update: remove from pending immediately
          const approved = pending.find(a => a.id === id);
          if (approved) {
            const updatedStartAt = new Date(result.requested_start_at);
            const updatedEndAt = new Date(result.requested_end_at);
            const updatedDuration = result.duration_minutes ?? options?.durationMinutes ?? approved.durationMinutes;
            const updatedAppointment: AppointmentViewModel = {
              ...approved,
              status: 'confirmed_by_owner',
              startAt: updatedStartAt,
              endAt: updatedEndAt,
              durationMinutes: updatedDuration,
              customDurationMinutes: result.custom_duration_minutes ?? approved.customDurationMinutes ?? null,
            };
            setPending(prev => prev.filter(a => a.id !== id));
            if (formatLocalDateKey(updatedStartAt) === todayStr) {
              // GET /today returns ALL statuses for today — the appointment may already be
              // in todayAppts as pending_owner_approval. Update in place to avoid duplicate.
              setTodayAppts(prev => {
                const alreadyPresent = prev.some(a => a.id === id);
                if (alreadyPresent) {
                  return prev.map(a => a.id === id ? updatedAppointment : a);
                }
                return [...prev, updatedAppointment];
              });
            }
          }
        }
        if (action === 'reject') {
          await updateAppointmentStatus(id, 'rejected_by_owner', 'Rechazo manual desde dashboard');
          // Optimistic update: remove from pending immediately
          setPending(prev => prev.filter(a => a.id !== id));
        }
        if (action === 'cancel') {
          await updateAppointmentStatus(id, 'owner_cancelled', 'Cancelación manual desde dashboard');
          // Optimistic update: remove from all lists
          setPending(prev => prev.filter(a => a.id !== id));
          setAwaiting(prev => prev.filter(a => a.id !== id));
          setTodayAppts(prev => prev.filter(a => a.id !== id));
        }
        if (action === 'complete') {
          await updateAppointmentStatus(id, 'completed');
          // Optimistic update: update status in todayAppts immediately
          setTodayAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
        }

        // Debounced silent refetch — if multiple actions fire rapidly, only ONE refetch
        // runs 800ms after the last one, eliminating GET race conditions
        scheduleSilentRefetch();

        const successCopy: Record<DashboardAction, FeedbackMessage> = {
          approve: {
            tone: 'success',
            title: 'Cita aceptada',
            message: 'La solicitud fue aprobada y los conteos ya estan actualizados.',
          },
          reject: {
            tone: 'success',
            title: 'Solicitud rechazada',
            message: 'La solicitud fue rechazada y salio de pendientes.',
          },
          cancel: {
            tone: 'success',
            title: 'Cita cancelada',
            message: 'La cita fue cancelada y retirada del timeline.',
          },
          complete: {
            tone: 'success',
            title: 'Cita completada',
            message: 'La cita se marco como completada correctamente.',
          },
        };
        setFeedback(successCopy[action]);
      } catch (error) {
        logDashboardActionError(action, error, {
          appointmentId: id,
          endpoint: endpointByAction[action],
        });
        const message = getErrorMessage(error);
        setErrorMsg(`No se pudo completar la accion. ${message}`);
        setFeedback({
          tone: 'error',
          title: 'Accion no completada',
          message,
        });
      } finally {
        // Remove this specific card from the working set
        setWorkingIds(prev => { const m = new Map(prev); m.delete(id); return m; });
      }
    },
    [loadDashboardData, pending, awaiting, todayStr, scheduleSilentRefetch]
  );

  const approveDurationAppointment = useMemo(
    () => [...pending, ...todayAppts].find((item) => item.id === approveDurationId) ?? null,
    [approveDurationId, pending, todayAppts]
  );

  const handleApprovePress = useCallback(
    (id: string) => {
      setApproveDurationId(id);
    },
    []
  );

  const handleApproveDurationConfirm = useCallback(
    (durationMinutes: number) => {
      if (!approveDurationId) return;
      void runAction(approveDurationId, 'approve', { durationMinutes }).finally(() => {
        setApproveDurationId(null);
      });
    },
    [approveDurationId, runAction]
  );

  const confirmReject = useCallback(
    (id: string) => {
      const appt = [...pending, ...todayAppts].find((item) => item.id === id);
      const clientName = appt?.clientName ?? 'esta cita';

      Alert.alert(
        'Rechazar solicitud',
        `¿Rechazar la solicitud de ${clientName}? Esta accion notificara el cambio de estado en backend.`,
        [
          { text: 'Volver', style: 'cancel' },
          {
            text: 'Rechazar',
            style: 'destructive',
            onPress: () => void runAction(id, 'reject'),
          },
        ],
      );
    },
    [pending, todayAppts, runAction]
  );

  const confirmCancel = useCallback(
    (id: string) => {
      const appt = [...todayAppts, ...awaiting].find((item) => item.id === id);
      const clientName = appt?.clientName ?? 'esta cita';

      Alert.alert(
        'Cancelar cita',
        `¿Cancelar la cita de ${clientName}? El cliente sera notificado del cambio.`,
        [
          { text: 'Volver', style: 'cancel' },
          {
            text: 'Cancelar cita',
            style: 'destructive',
            onPress: () => void runAction(id, 'cancel'),
          },
        ],
      );
    },
    [todayAppts, awaiting, runAction]
  );

  const confirmComplete = useCallback(
    (id: string) => {
      const appt = todayAppts.find((item) => item.id === id);
      const clientName = appt?.clientName ?? 'esta cita';

      Alert.alert(
        'Completar cita',
        `¿Marcar la cita de ${clientName} como completada?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Completar',
            onPress: () => void runAction(id, 'complete'),
          },
        ],
      );
    },
    [todayAppts, runAction]
  );


  const handleRescheduleComplete = useCallback(
    (result: RescheduleSimulationResult) => {
      // Look up in both pending and awaiting lists
      const rescheduled =
        pending.find(a => a.id === result.appointmentId) ??
        awaiting.find(a => a.id === result.appointmentId);

      // 1. Optimistic remove from both pending and awaiting
      setPending(prev => prev.filter(a => a.id !== result.appointmentId));
      setAwaiting(prev => prev.filter(a => a.id !== result.appointmentId));

      // 2. Update todayAppts based on new status and dates
      if (rescheduled) {
        const originalWasToday = formatLocalDateKey(rescheduled.startAt) === selectedDateStr;
        const newIsToday = result.newDate === selectedDateStr;

        if (result.newStartAt && newIsToday) {
          // Scenario A — new slot is today: add/update in Timeline with new times
          const newStart = new Date(result.requestedStartAt);
          const newEnd = new Date(result.requestedEndAt);
          const updated: AppointmentViewModel = {
            ...rescheduled,
            startAt: newStart,
            endAt: newEnd,
            durationMinutes: result.durationMinutes ?? rescheduled.durationMinutes,
            customDurationMinutes: result.customDurationMinutes ?? rescheduled.customDurationMinutes ?? null,
            status: result.newStatus,
          };
          setTodayAppts(prev => {
            const alreadyPresent = prev.some(a => a.id === result.appointmentId);
            return alreadyPresent
              ? prev.map(a => a.id === result.appointmentId ? updated : a)
              : [...prev, updated];
          });
        } else if (result.newStartAt && !newIsToday && originalWasToday) {
          // Scenario A — new slot is NOT today but original was today: remove from Timeline
          setTodayAppts(prev => prev.filter(a => a.id !== result.appointmentId));
        } else if (!result.newStartAt && originalWasToday) {
          // Scenario B — no new time chosen, original was today: update status in-place
          setTodayAppts(prev =>
            prev.map(a => a.id === result.appointmentId ? { ...a, status: result.newStatus } : a)
          );
        }
      }

      // 3. Success feedback
      const clientName = rescheduled?.clientName ?? 'Cliente';
      const isScenarioA = !!result.newStartAt;
      const newTimeLabel = result.newStartAt
        ? new Date(result.newStartAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : null;
      const newDateLabel = result.newDate
        ? new Date(result.newDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
        : null;

      setFeedback({
        tone: 'success',
        title: isScenarioA ? 'Cita reprogramada' : 'Cita marcada para reprogramar',
        message: isScenarioA && newDateLabel && newTimeLabel
          ? `${clientName} → ${newDateLabel} a las ${newTimeLabel}. Esperando confirmación del cliente.`
          : `${clientName} marcada como “Reprogramar”. Asigna nuevo horario cuando esté disponible.`,
      });

      // 4. Reconcile with backend
      scheduleSilentRefetch();
      setRescheduleId(null);
    },
    [pending, awaiting, selectedDateStr, scheduleSilentRefetch]
  );

  return (
    <View style={styles.container}>
      <TopHeader
        title="Centro de operación"
        subtitle={formatToday()}
        onNewAppointment={() => setShowNewAppt(true)}
      />

      {/* Top section: feedback + KPIs + Quick actions — no scroll needed, always compact */}
      <View style={[styles.topSection, isMobile && styles.topSectionMobile]}>
        {feedback ? (
          <View style={[styles.feedback, styles[`feedback_${feedback.tone}`]]}>
            <View style={styles.feedbackIcon}>
              <Text style={styles.feedbackIconText}>
                {feedback.tone === 'success' ? '✓' : feedback.tone === 'error' ? '!' : 'i'}
              </Text>
            </View>
            <View style={styles.feedbackBody}>
              <Text style={styles.feedbackTitle}>{feedback.title}</Text>
              <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            </View>
            <Text style={styles.feedbackDismiss} onPress={() => setFeedback(null)}>Cerrar</Text>
          </View>
        ) : null}
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {loading ? <Text style={styles.loadingText}>Sincronizando con backend...</Text> : null}
        {workingIds.size > 0 ? <Text style={styles.loadingText}>Aplicando {workingIds.size} cambio{workingIds.size > 1 ? 's' : ''}...</Text> : null}

        {/* Demo mode toggle */}
        <TouchableOpacity
          style={[styles.demoBtn, isDemoMode && styles.demoBtnActive]}
          onPress={isDemoMode ? deactivateDemoMode : activateDemoMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.demoBtnText, isDemoMode && styles.demoBtnTextActive]}>
            {isDemoMode ? '✕ Salir del modo demo' : '▶ Cargar datos demo'}
          </Text>
        </TouchableOpacity>

        <KPIStats
          citasHoy={todayAppts.length}
          pendientes={pending.length}
          confirmadas={confirmedCount}
          ocupacion={occupation}
          onKPIPress={(key) => setKpiFilter(key)}
        />

        <QuickActionsBar
          onNewAppointment={() => setShowNewAppt(true)}
          onBlockTime={() => setShowBlockTime(true)}
          onSearchClient={() => router.push('/(owner)/clients' as any)}
          onSendMessage={() => router.push('/(owner)/messages' as any)}
        />
      </View>

      {/* Compact pending/awaiting summary banner */}
      <PendingRequestsPanel
        count={pending.length}
        awaitingCount={awaiting.length}
        activeFilter={timelineFilter}
        onFilterPending={() => setTimelineFilter('pending')}
        onClearFilter={() => setTimelineFilter('all')}
      />

      {/* Unified timeline — takes all remaining height */}
      <View style={[styles.timelineContainer, isMobile && styles.timelineContainerMobile]}>
        <TodayTimeline
          appointments={todayAppts}
          blocks={todayBlocks}
          workingIds={workingIds}
          activeFilter={timelineFilter}
          onFilterChange={setTimelineFilter}
          onApprove={handleApprovePress}
          onReject={confirmReject}
          onCancel={confirmCancel}
          onReschedule={(id) => setRescheduleId(id)}
          onComplete={confirmComplete}
          selectedDate={selectedDate}
          todayStr={todayStr}
          onPrevDay={goToPrevDay}
          onNextDay={goToNextDay}
          onGoToToday={goToToday}
          onGoToDate={goToDate}
        />
      </View>

      <FloatingActionButton
        onNewAppointment={() => setShowNewAppt(true)}
        onBlockTime={() => setShowBlockTime(true)}
        onNewIncident={() => setShowIncident(true)}
      />

      <NewAppointmentModal
        visible={showNewAppt}
        onClose={() => setShowNewAppt(false)}
        onCreated={() => void loadDashboardData({ silent: true })}
      />
      <BlockTimeModal
        visible={showBlockTime}
        onClose={() => {
          setShowBlockTime(false);
          void loadDashboardData({ silent: true });
        }}
      />
      <IncidentModal
        visible={showIncident}
        onClose={() => setShowIncident(false)}
        onCreated={() => void loadDashboardData({ silent: true })}
      />
      <RescheduleModal
        visible={!!rescheduleId}
        appointment={[...pending, ...awaiting, ...todayAppts].find(a => a.id === rescheduleId) || null}
        onClose={() => setRescheduleId(null)}
        onSimulationComplete={handleRescheduleComplete}
      />
      <AppointmentDurationModal
        visible={!!approveDurationId}
        appointment={approveDurationAppointment}
        startAt={approveDurationAppointment?.startAt}
        initialDurationMinutes={approveDurationAppointment?.durationMinutes}
        baseDurationMinutes={approveDurationAppointment?.serviceDurationMinutes}
        title="Aceptar cita"
        confirmLabel="Aceptar con duración"
        isSubmitting={approveDurationId ? workingIds.get(approveDurationId) === 'approve' : false}
        onCancel={() => setApproveDurationId(null)}
        onConfirm={handleApproveDurationConfirm}
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
  topSection: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  topSectionMobile: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  // Unified timeline: takes all remaining vertical space
  timelineContainer: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  timelineContainerMobile: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  loadingText: {
    color: colors.gray400,
    fontSize: 12,
  },
  demoBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: 'transparent',
  },
  demoBtnActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '18',
  },
  demoBtnText: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
    fontWeight: '600',
  },
  demoBtnTextActive: {
    color: colors.gold,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  feedback_success: {
    backgroundColor: colors.success + '18',
    borderColor: colors.success,
  },
  feedback_error: {
    backgroundColor: colors.error + '18',
    borderColor: colors.error,
  },
  feedback_info: {
    backgroundColor: colors.info + '18',
    borderColor: colors.info,
  },
  feedbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  feedbackIconText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  feedbackBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  feedbackTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackMessage: {
    color: colors.gray300,
    fontSize: 12,
    lineHeight: 17,
  },
  feedbackDismiss: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
});
