import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, Alert } from 'react-native';
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
import { RescheduleModal, type RescheduleSimulationResult } from '../../src/components/modals/RescheduleModal';
import { KPIFilterModal } from '../../src/components/modals/KPIFilterModal';
import { MOCK_TIME_BLOCKS } from '../../src/services/mock-data';
import type { AppointmentViewModel } from '../../src/types/models';
import { fetchAppointmentsByDate, fetchPendingAppointments, updateAppointmentStatus } from '../../src/services/appointments';
import { isHttpError } from '../../src/types/api';
import { formatLocalDateKey } from '../../src/utils/date';

type DashboardAction = 'approve' | 'reject' | 'complete';
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [kpiFilter, setKpiFilter] = useState<KPIKey | null>(null);
  const [todayAppts, setTodayAppts] = useState<AppointmentViewModel[]>([]);
  const [pending, setPending] = useState<AppointmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  // Map<appointmentId, action> — tracks each card independently, allowing concurrent actions
  const [workingIds, setWorkingIds] = useState<Map<string, DashboardAction>>(new Map());
  // Debounced refetch ref — cancels and reschedules on every new action to avoid race conditions
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Two-pane expand state: null = both default, 'pending' = pending expanded, 'timeline' = timeline expanded
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'timeline' | null>(null);

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
      ],
      todayStr,
      silent: opts?.silent ?? false,
    });

    try {
      const [pendingData, todayData] = await Promise.all([
        fetchPendingAppointments(),
        fetchAppointmentsByDate(todayStr),
      ]);
      setPending(pendingData);
      setTodayAppts(todayData);
    } catch (error) {
      logDashboardActionError('load_dashboard_data', error, {
        endpoints: [
          'GET /api/owner/appointments/pending',
          'GET /api/owner/appointments/today',
        ],
        todayStr,
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
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [todayStr]);

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

  // Schedules ONE silent refetch 800ms after the last action — prevents race conditions
  // when multiple actions complete in rapid succession
  const scheduleSilentRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      void loadDashboardData({ silent: true });
    }, 800);
  }, [loadDashboardData]);

  const runAction = useCallback(
    async (id: string, action: DashboardAction) => {
      // Per-card loading: add this id to the working set (does not block other cards)
      setWorkingIds(prev => { const m = new Map(prev); m.set(id, action); return m; });
      setErrorMsg(null);
      setFeedback(null);

      const endpointByAction = {
        approve: `POST /api/owner/appointments/${id}/approve`,
        reject: `POST /api/owner/appointments/${id}/reject`,
        complete: `POST /api/owner/appointments/${id}/complete`,
      } as const;

      console.info('[DASHBOARD ACTION]', {
        action,
        appointmentId: id,
        endpoint: endpointByAction[action],
      });

      try {
        if (action === 'approve') {
          await updateAppointmentStatus(id, 'confirmed_by_owner');
          // Optimistic update: remove from pending immediately
          const approved = pending.find(a => a.id === id);
          if (approved) {
            setPending(prev => prev.filter(a => a.id !== id));
            if (formatLocalDateKey(approved.startAt) === todayStr) {
              // GET /today returns ALL statuses for today — the appointment may already be
              // in todayAppts as pending_owner_approval. Update in place to avoid duplicate.
              setTodayAppts(prev => {
                const alreadyPresent = prev.some(a => a.id === id);
                if (alreadyPresent) {
                  return prev.map(a => a.id === id ? { ...a, status: 'confirmed_by_owner' } : a);
                }
                return [...prev, { ...approved, status: 'confirmed_by_owner' }];
              });
            }
          }
        }
        if (action === 'reject') {
          await updateAppointmentStatus(id, 'rejected_by_owner', 'Rechazo manual desde dashboard');
          // Optimistic update: remove from pending immediately
          setPending(prev => prev.filter(a => a.id !== id));
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
            title: 'Cita cancelada',
            message: 'La solicitud fue rechazada y salio de pendientes.',
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
    [loadDashboardData, pending, todayStr, scheduleSilentRefetch]
  );

  const confirmReject = useCallback(
    (id: string) => {
      const appt = pending.find((item) => item.id === id);
      const clientName = appt?.clientName ?? 'esta cita';

      Alert.alert(
        'Cancelar solicitud',
        `¿Seguro que deseas cancelar la solicitud de ${clientName}? Esta accion notificara el cambio de estado en backend.`,
        [
          { text: 'Volver', style: 'cancel' },
          {
            text: 'Cancelar cita',
            style: 'destructive',
            onPress: () => void runAction(id, 'reject'),
          },
        ],
      );
    },
    [pending, runAction]
  );

  const handleTimelinePress = useCallback(
    (id: string) => {
      const appt = todayAppts.find((item) => item.id === id);
      if (!appt) return;

      if (appt.status !== 'confirmed_by_owner') {
        Alert.alert('Sin cambios', 'Solo citas confirmadas por owner pueden marcarse como completadas.');
        return;
      }

      Alert.alert('Completar cita', '¿Marcar esta cita como completada?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Completar', onPress: () => void runAction(id, 'complete') },
      ]);
    },
    [todayAppts, runAction]
  );

  const handleRescheduleComplete = useCallback(
    (result: RescheduleSimulationResult) => {
      const rescheduled = pending.find(a => a.id === result.appointmentId);

      // 1. Remove from pending (optimistic)
      setPending(prev => prev.filter(a => a.id !== result.appointmentId));

      // 2. Update todayAppts based on new status and dates
      if (rescheduled) {
        const originalWasToday = formatLocalDateKey(rescheduled.startAt) === todayStr;
        const newIsToday = result.newDate === todayStr;

        if (result.newStartAt && newIsToday) {
          // Scenario A — new slot is today: add/update in Timeline with new times
          const newStart = new Date(result.requestedStartAt);
          const newEnd = new Date(result.requestedEndAt);
          const updated: AppointmentViewModel = {
            ...rescheduled,
            startAt: newStart,
            endAt: newEnd,
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
    [pending, todayStr, scheduleSilentRefetch]
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

      {/* Two-pane operational area: side-by-side on desktop, stacked on mobile */}
      <View style={[styles.panesContainer, !isMobile && styles.panesContainerDesktop]}>
        <View style={[
          styles.pane,
          expandedPanel === 'pending' && styles.paneExpanded,
          expandedPanel === 'timeline' && styles.paneCollapsed,
        ]}>
          <PendingRequestsPanel
            appointments={pending}
            onAccept={(id) => void runAction(id, 'approve')}
            onReject={confirmReject}
            onReschedule={(id) => setRescheduleId(id)}
            workingIds={workingIds}
            isExpanded={expandedPanel === 'pending'}
            isCollapsed={expandedPanel === 'timeline'}
            onToggle={() => setExpandedPanel(prev => prev === 'pending' ? null : 'pending')}
          />
        </View>

        <View style={[
          styles.pane,
          expandedPanel === 'timeline' && styles.paneExpanded,
          expandedPanel === 'pending' && styles.paneCollapsed,
        ]}>
          <TodayTimeline
            appointments={todayAppts}
            blocks={todayBlocks}
            onAppointmentPress={handleTimelinePress}
            isExpanded={expandedPanel === 'timeline'}
            isCollapsed={expandedPanel === 'pending'}
            onToggle={() => setExpandedPanel(prev => prev === 'timeline' ? null : 'timeline')}
          />
        </View>
      </View>

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
        appointment={[...pending, ...todayAppts].find(a => a.id === rescheduleId) || null}
        onClose={() => setRescheduleId(null)}
        onSimulationComplete={handleRescheduleComplete}
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
  // Two-pane container: stacked on mobile, side-by-side on desktop
  panesContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  panesContainerDesktop: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  // Each pane: default equal flex
  // minWidth:0 + minHeight:0 required for flex children to shrink below content size
  // in both row (desktop) and column (mobile) directions
  pane: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  // Expanded: take maximum available space (other pane collapses to header)
  paneExpanded: {
    flex: 1,
    minWidth: 0,
  },
  // Collapsed: shrink to just the header height
  paneCollapsed: {
    flex: 0,
    flexShrink: 0,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  loadingText: {
    color: colors.gray400,
    fontSize: 12,
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
