import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import {
  getOwnerMessages,
  retryOwnerMessage,
  getOwnerInboundMessages,
  markInboundMessageRead,
} from '../../src/services/ownerApi';
import type {
  OwnerMessage,
  OwnerMessagesSummary,
  OwnerMessageStatus,
  OwnerInboundMessage,
  OwnerInboundMessagesSummary,
  InboundMessageIntent,
} from '../../src/types/messages';
import { RescheduleModal } from '../../src/components/modals/RescheduleModal';
import type { RescheduleSimulationResult } from '../../src/components/modals/RescheduleModal';
import { NewAppointmentModal } from '../../src/components/modals/NewAppointmentModal';
import type { AppointmentViewModel } from '../../src/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'sent' | 'received';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps an inbound message with a linked appointment into AppointmentViewModel
 *  so RescheduleModal can be opened directly without navigating to Agenda. */
function mapMsgToApptViewModel(msg: OwnerInboundMessage): AppointmentViewModel | null {
  if (!msg.appointment) return null;
  const startAt = new Date(msg.appointment.requestedStartAt);
  const endAt = new Date(startAt.getTime() + 45 * 60 * 1000); // fallback 45 min
  return {
    id: msg.appointment.id,
    clientName: msg.client?.fullName ?? msg.fromPhone,
    clientPhone: msg.client?.phone ?? msg.fromPhone,
    serviceName: msg.appointment.serviceName ?? 'Servicio',
    durationMinutes: 45,
    status: 'reschedule_required',
    startAt,
    endAt,
    notes: null,
  };
}
type OutboundFilter = 'all' | 'read' | 'failed' | null;
type InboundFilter = 'all' | 'attention' | 'booking' | 'reschedule' | 'human_help' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const EMPTY_OUTBOUND_SUMMARY: OwnerMessagesSummary = {
  total: 0, pending: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0,
};

const EMPTY_INBOUND_SUMMARY: OwnerInboundMessagesSummary = {
  total: 0,
  needsHumanReview: 0,
  unread: 0,
  byIntent: {
    booking: 0, availability: 0, confirm: 0, cancel: 0, reschedule: 0,
    late: 0, location: 0, price: 0, hours: 0, human_help: 0,
    greeting: 0, thanks: 0, unknown: 0,
  },
};

const OUTBOUND_STATUS_CONFIG: Record<OwnerMessageStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  pending: { icon: 'time-outline', color: colors.statusPending, label: 'Pendiente' },
  queued: { icon: 'hourglass-outline', color: colors.gold, label: 'En cola' },
  sent: { icon: 'checkmark', color: colors.gray500, label: 'Enviado' },
  delivered: { icon: 'checkmark-done', color: colors.info, label: 'Entregado' },
  read: { icon: 'checkmark-done', color: colors.statusConfirmed, label: 'Leido' },
  failed: { icon: 'close-circle', color: colors.error, label: 'Fallido' },
};

const OUTBOUND_TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmacion',
  reminder: 'Recordatorio',
  reconfirmation: 'Reconfirmacion',
  cancellation: 'Cancelacion',
  reschedule: 'Reprogramacion',
  incident: 'Incidente',
  owner_approval_result: 'Resultado de aprobacion',
  general: 'General',
};

const INBOUND_INTENT_CONFIG: Record<InboundMessageIntent, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  booking:      { label: 'Solicitud de cita',   color: colors.statusConfirmed, icon: 'calendar-outline' },
  availability: { label: 'Disponibilidad',       color: colors.info,            icon: 'time-outline' },
  confirm:      { label: 'Confirmacion',         color: colors.statusConfirmed, icon: 'checkmark-circle-outline' },
  cancel:       { label: 'Cancelacion',          color: colors.error,           icon: 'close-circle-outline' },
  reschedule:   { label: 'Reprogramacion',       color: colors.gold,            icon: 'refresh-circle-outline' },
  late:         { label: 'Llego tarde',          color: colors.gold,            icon: 'walk-outline' },
  location:     { label: 'Ubicacion',            color: colors.gray400,         icon: 'location-outline' },
  price:        { label: 'Precio',               color: colors.gray400,         icon: 'cash-outline' },
  hours:        { label: 'Horarios',             color: colors.gray400,         icon: 'business-outline' },
  human_help:   { label: 'Hablar con el estudio',color: colors.error,           icon: 'headset-outline' },
  greeting:     { label: 'Saludo',               color: colors.gray500,         icon: 'happy-outline' },
  thanks:       { label: 'Agradecimiento',       color: colors.gray500,         icon: 'heart-outline' },
  unknown:      { label: 'No reconocido',        color: colors.gray500,         icon: 'help-circle-outline' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getOutboundTimestamp(msg: OwnerMessage): string {
  if (msg.deliveredAt) return `Entregado: ${formatDateTime(msg.deliveredAt)}`;
  if (msg.sentAt) return `Enviado: ${formatDateTime(msg.sentAt)}`;
  if (msg.failedAt) return `Fallido: ${formatDateTime(msg.failedAt)}`;
  return `Creado: ${formatDateTime(msg.createdAt)}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('sent');

  // ── Outbound state ──
  const [outFilter, setOutFilter] = useState<OutboundFilter>(null);
  const [outMessages, setOutMessages] = useState<OwnerMessage[]>([]);
  const [outSummary, setOutSummary] = useState<OwnerMessagesSummary>(EMPTY_OUTBOUND_SUMMARY);
  const [outTotal, setOutTotal] = useState(0);
  const [outLoading, setOutLoading] = useState(true);
  const [outError, setOutError] = useState<string | null>(null);
  const [outActionError, setOutActionError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // ── Inbound state ──
  const [inFilter, setInFilter] = useState<InboundFilter>(null);
  const [inMessages, setInMessages] = useState<OwnerInboundMessage[]>([]);
  const [inSummary, setInSummary] = useState<OwnerInboundMessagesSummary>(EMPTY_INBOUND_SUMMARY);
  const [inTotal, setInTotal] = useState(0);
  const [inLoading, setInLoading] = useState(false);
  const [inError, setInError] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<OwnerInboundMessage | null>(null);
  // Inline modals opened from the bottom sheet
  const [rescheduleFromMsg, setRescheduleFromMsg] = useState<AppointmentViewModel | null>(null);
  const [showNewApptFromMsg, setShowNewApptFromMsg] = useState(false);
  const [newApptPhone, setNewApptPhone] = useState('');

  // ── Fetch outbound ──
  const fetchOutbound = useCallback(async () => {
    try {
      setOutLoading(true);
      setOutError(null);
      setOutActionError(null);

      const statusFilter = outFilter === 'read' || outFilter === 'failed' ? outFilter : undefined;
      const response = await getOwnerMessages({ status: statusFilter, page: 1, limit: PAGE_SIZE });

      // Exclude 'general' bot auto-responses — show only booking-linked notifications.
      const bookingMessages = response.data.filter((msg) => msg.messageType !== 'general');
      const bookingSummary: OwnerMessagesSummary = {
        total: bookingMessages.length,
        pending: bookingMessages.filter((m) => m.status === 'pending').length,
        queued: bookingMessages.filter((m) => m.status === 'queued').length,
        sent: bookingMessages.filter((m) => m.status === 'sent').length,
        delivered: bookingMessages.filter((m) => m.status === 'delivered').length,
        read: bookingMessages.filter((m) => m.status === 'read').length,
        failed: bookingMessages.filter((m) => m.status === 'failed').length,
      };

      setOutMessages(bookingMessages);
      setOutTotal(bookingMessages.length);
      setOutSummary(bookingSummary);
    } catch (err) {
      setOutMessages([]);
      setOutTotal(0);
      setOutSummary(EMPTY_OUTBOUND_SUMMARY);
      setOutError(getErrorMessage(err));
    } finally {
      setOutLoading(false);
    }
  }, [outFilter]);

  // ── Fetch inbound ──
  const fetchInbound = useCallback(async () => {
    try {
      setInLoading(true);
      setInError(null);

      const params: Parameters<typeof getOwnerInboundMessages>[0] = { page: 1, limit: PAGE_SIZE };
      if (inFilter === 'attention') params.needs_human_review = true;
      else if (inFilter === 'booking') params.intent = 'booking';
      else if (inFilter === 'reschedule') params.intent = 'reschedule';
      else if (inFilter === 'human_help') params.intent = 'human_help';

      const response = await getOwnerInboundMessages(params);
      setInMessages(response.data);
      setInTotal(response.total);
      setInSummary(response.summary);
    } catch (err) {
      setInMessages([]);
      setInTotal(0);
      setInSummary(EMPTY_INBOUND_SUMMARY);
      setInError(getErrorMessage(err));
    } finally {
      setInLoading(false);
    }
  }, [inFilter]);

  useEffect(() => { void fetchOutbound(); }, [fetchOutbound]);

  useEffect(() => {
    if (activeTab === 'received') void fetchInbound();
  }, [activeTab, fetchInbound]);

  // ── Handlers ──
  const handleRetry = async (messageId: string) => {
    try {
      setRetryingId(messageId);
      setOutActionError(null);
      await retryOwnerMessage(messageId);
      await fetchOutbound();
    } catch (err) {
      setOutActionError(getErrorMessage(err));
    } finally {
      setRetryingId(null);
    }
  };

  const handleMarkRead = async (messageId: string) => {
    if (markingReadId) return;
    try {
      setMarkingReadId(messageId);
      await markInboundMessageRead(messageId);
      setInMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, readAt: new Date().toISOString() } : m)
      );
      setInSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch {
      // Silent — mark-as-read is best-effort
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleOpenDetail = (msg: OwnerInboundMessage) => {
    setSelectedMsg(msg);
    if (!msg.readAt) handleMarkRead(msg.id);
  };

  const outFilterLabel = useMemo(() => {
    if (outFilter === 'all') return 'Todos';
    if (outFilter === 'read') return 'Leidos';
    if (outFilter === 'failed') return 'Fallidos';
    return null;
  }, [outFilter]);

  const inFilterLabel = useMemo(() => {
    if (inFilter === 'all') return 'Todos';
    if (inFilter === 'attention') return 'Requieren atencion';
    if (inFilter === 'booking') return 'Solicitudes de cita';
    if (inFilter === 'reschedule') return 'Reprogramaciones';
    if (inFilter === 'human_help') return 'Hablar con el estudio';
    return null;
  }, [inFilter]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <TopHeader title="Mensajes" subtitle="Canal WhatsApp del estudio" />

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'sent' && styles.tabItemActive]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="paper-plane-outline"
            size={15}
            color={activeTab === 'sent' ? colors.gold : colors.gray500}
          />
          <Text style={[styles.tabLabel, activeTab === 'sent' && styles.tabLabelActive]}>
            Enviados
          </Text>
          {outSummary.total > 0 && (
            <View style={[styles.tabBadge, activeTab === 'sent' && styles.tabBadgeActive]}>
              <Text style={styles.tabBadgeText}>{outSummary.total}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'received' && styles.tabItemActive]}
          onPress={() => setActiveTab('received')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbox-ellipses-outline"
            size={15}
            color={activeTab === 'received' ? colors.gold : colors.gray500}
          />
          <Text style={[styles.tabLabel, activeTab === 'received' && styles.tabLabelActive]}>
            Recibidos
          </Text>
          {inSummary.unread > 0 && (
            <View style={[styles.tabBadge, styles.tabBadgeUnread]}>
              <Text style={styles.tabBadgeText}>{inSummary.unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Tab: Enviados ── */}
      {activeTab === 'sent' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* KPI row */}
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={[styles.summaryItem, outFilter === 'all' && styles.summaryItemActive]}
              onPress={() => setOutFilter((p) => (p === 'all' ? null : 'all'))}
              activeOpacity={0.7}
            >
              <Text style={styles.summaryValue}>{outSummary.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summaryItem, outFilter === 'read' && styles.summaryItemActive]}
              onPress={() => setOutFilter((p) => (p === 'read' ? null : 'read'))}
              activeOpacity={0.7}
            >
              <Text style={[styles.summaryValue, { color: colors.statusConfirmed }]}>{outSummary.read}</Text>
              <Text style={styles.summaryLabel}>Leidos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summaryItem, outFilter === 'failed' && styles.summaryItemActive]}
              onPress={() => setOutFilter((p) => (p === 'failed' ? null : 'failed'))}
              activeOpacity={0.7}
            >
              <Text style={[styles.summaryValue, { color: colors.error }]}>{outSummary.failed}</Text>
              <Text style={styles.summaryLabel}>Fallidos</Text>
            </TouchableOpacity>
          </View>

          {outFilterLabel && (
            <View style={styles.filterIndicator}>
              <Ionicons name="funnel" size={14} color={colors.gold} />
              <Text style={styles.filterText}>Filtrando: {outFilterLabel} ({outTotal})</Text>
              <TouchableOpacity onPress={() => setOutFilter(null)}>
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </TouchableOpacity>
            </View>
          )}

          {outActionError ? (
            <View style={styles.errorBar}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{outActionError}</Text>
            </View>
          ) : null}

          {outLoading ? (
            <LoadingState />
          ) : outError ? (
            <View style={styles.centerState}>
              <Ionicons name="warning-outline" size={42} color={colors.error} />
              <Text style={styles.stateTitle}>No se pudieron cargar los mensajes</Text>
              <Text style={styles.stateMessage}>{outError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchOutbound} activeOpacity={0.7}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : outMessages.length === 0 ? (
            <EmptyState
              icon="paper-plane-outline"
              title="Sin mensajes enviados"
              message={outFilter ? 'No hay mensajes para este filtro.' : 'Aun no hay notificaciones de citas registradas.'}
            />
          ) : (
            outMessages.map((msg) => {
              const statusCfg = OUTBOUND_STATUS_CONFIG[msg.status] ?? OUTBOUND_STATUS_CONFIG.pending;
              const isRetrying = retryingId === msg.id;

              return (
                <View key={msg.id} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <View style={styles.messageHeaderLeft}>
                      <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                      <View style={styles.clientGroup}>
                        <Text style={styles.messageClient} numberOfLines={1}>{msg.client.fullName}</Text>
                        <Text style={styles.messagePhone} numberOfLines={1}>{msg.client.phone}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
                      <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageType}>
                    {OUTBOUND_TYPE_LABELS[msg.messageType] ?? msg.messageType}
                  </Text>
                  <Text style={styles.messageBody} numberOfLines={2}>{msg.body}</Text>
                  {msg.appointment ? (
                    <Text style={styles.messageMeta} numberOfLines={1}>
                      {msg.appointment.serviceName} — {formatDateTime(msg.appointment.requestedStartAt)}
                    </Text>
                  ) : null}
                  {msg.failureReason ? (
                    <Text style={styles.failureText} numberOfLines={2}>{msg.failureReason}</Text>
                  ) : null}
                  <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>{getOutboundTimestamp(msg)}</Text>
                    {msg.status === 'failed' ? (
                      <TouchableOpacity
                        style={styles.retryMessageButton}
                        onPress={() => handleRetry(msg.id)}
                        disabled={isRetrying}
                        activeOpacity={0.7}
                      >
                        {isRetrying ? (
                          <ActivityIndicator size="small" color={colors.black} />
                        ) : (
                          <Text style={styles.retryMessageText}>Reintentar</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.infoBar}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
            <Text style={styles.infoText}>
              Solo se muestran notificaciones ligadas a citas (confirmaciones, recordatorios, aprobaciones).
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Tab: Recibidos ── */}
      {activeTab === 'received' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* KPI row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{inSummary.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.error }]}>{inSummary.needsHumanReview}</Text>
              <Text style={styles.summaryLabel}>Atencion</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.gold }]}>{inSummary.unread}</Text>
              <Text style={styles.summaryLabel}>Sin leer</Text>
            </View>
          </View>

          {/* Intent filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inboundFilters}>
            {([
              { key: 'all', label: 'Todos', icon: 'list-outline' },
              { key: 'attention', label: 'Atencion', icon: 'alert-circle-outline' },
              { key: 'booking', label: 'Solicitudes', icon: 'calendar-outline' },
              { key: 'reschedule', label: 'Reprogramar', icon: 'refresh-circle-outline' },
              { key: 'human_help', label: 'Hablar', icon: 'headset-outline' },
            ] as const).map(({ key, label, icon }) => (
              <TouchableOpacity
                key={key}
                style={[styles.inboundFilterChip, inFilter === key && styles.inboundFilterChipActive]}
                onPress={() => setInFilter((p) => (p === key ? null : key))}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={icon}
                  size={13}
                  color={inFilter === key ? colors.black : colors.gray400}
                />
                <Text style={[styles.inboundFilterLabel, inFilter === key && styles.inboundFilterLabelActive]}>
                  {label}
                </Text>
                {key === 'attention' && inSummary.needsHumanReview > 0 && (
                  <View style={styles.chipCount}>
                    <Text style={styles.chipCountText}>{inSummary.needsHumanReview}</Text>
                  </View>
                )}
                {key === 'booking' && inSummary.byIntent.booking > 0 && (
                  <View style={styles.chipCount}>
                    <Text style={styles.chipCountText}>{inSummary.byIntent.booking}</Text>
                  </View>
                )}
                {key === 'reschedule' && inSummary.byIntent.reschedule > 0 && (
                  <View style={styles.chipCount}>
                    <Text style={styles.chipCountText}>{inSummary.byIntent.reschedule}</Text>
                  </View>
                )}
                {key === 'human_help' && inSummary.byIntent.human_help > 0 && (
                  <View style={styles.chipCount}>
                    <Text style={styles.chipCountText}>{inSummary.byIntent.human_help}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {inFilterLabel && (
            <View style={styles.filterIndicator}>
              <Ionicons name="funnel" size={14} color={colors.gold} />
              <Text style={styles.filterText}>Filtrando: {inFilterLabel} ({inTotal})</Text>
              <TouchableOpacity onPress={() => setInFilter(null)}>
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </TouchableOpacity>
            </View>
          )}

          {inLoading ? (
            <LoadingState />
          ) : inError ? (
            <View style={styles.centerState}>
              <Ionicons name="warning-outline" size={42} color={colors.error} />
              <Text style={styles.stateTitle}>No se pudieron cargar los mensajes</Text>
              <Text style={styles.stateMessage}>{inError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchInbound} activeOpacity={0.7}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : inMessages.length === 0 ? (
            <EmptyState
              icon="chatbox-ellipses-outline"
              title="Sin mensajes recibidos"
              message={inFilter ? 'No hay mensajes para este filtro.' : 'Aun no hay mensajes entrantes de clientes.'}
            />
          ) : (
            inMessages.map((msg) => {
              const intentCfg = INBOUND_INTENT_CONFIG[msg.intent] ?? INBOUND_INTENT_CONFIG.unknown;
              const isUnread = msg.readAt === null;
              const isMarkingThis = markingReadId === msg.id;
              const displayName = msg.client?.fullName ?? msg.fromPhone;
              const displayPhone = msg.client?.phone ?? msg.fromPhone;

              // ── Attention state logic ──────────────────────────────────────
              // Intent groups:
              //   ACTION  → genuinely need owner action when bot didn't reply
              //   BENIGN  → informational; bot not replying is odd but not urgent
              const ACTION_INTENTS: InboundMessageIntent[] = ['human_help', 'booking', 'reschedule', 'cancel'];
              const botHandled = msg.botReplied;
              const isActionIntent = (ACTION_INTENTS as string[]).includes(msg.intent);
              // Red  → bot did NOT reply AND intent requires owner action
              const needsUrgentAttention = !botHandled && isActionIntent;
              // Amber → bot did NOT reply AND message was simply not recognized/benign
              const notRecognized = !botHandled && !isActionIntent && msg.needs_human_review;

              // Label for urgent attention banner
              const urgentLabel: Record<string, string> = {
                human_help: 'El cliente quiere hablar directamente',
                booking:    'Solicitud de cita sin procesar',
                reschedule: 'Solicitud de cambio pendiente',
                cancel:     'Solicitud de cancelacion pendiente',
              };
              const urgentText = urgentLabel[msg.intent] ?? 'Requiere atencion del estudio';

              return (
                <TouchableOpacity
                  key={msg.id}
                  style={[styles.messageCard, isUnread && styles.messageCardUnread]}
                  onPress={() => handleOpenDetail(msg)}
                  activeOpacity={0.75}
                >
                  <View style={styles.messageHeader}>
                    <View style={styles.messageHeaderLeft}>
                      <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                      <View style={styles.clientGroup}>
                        <View style={styles.clientNameRow}>
                          <Text style={styles.messageClient} numberOfLines={1}>{displayName}</Text>
                          {isUnread && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.messagePhone} numberOfLines={1}>{displayPhone}</Text>
                      </View>
                    </View>
                    <View style={[styles.intentBadge, { backgroundColor: intentCfg.color + '18' }]}>
                      <Ionicons name={intentCfg.icon} size={12} color={intentCfg.color} />
                      <Text style={[styles.intentText, { color: intentCfg.color }]} numberOfLines={1}>
                        {intentCfg.label}
                      </Text>
                    </View>
                  </View>

                  {needsUrgentAttention && (
                    <View style={styles.attentionBar}>
                      <Ionicons name="alert-circle" size={13} color={colors.error} />
                      <Text style={styles.attentionText}>{urgentText}</Text>
                    </View>
                  )}
                  {notRecognized && (
                    <View style={styles.notRecognizedBar}>
                      <Ionicons name="help-circle-outline" size={13} color={colors.warning} />
                      <Text style={styles.notRecognizedText}>El bot no reconocio este mensaje</Text>
                    </View>
                  )}
                  {botHandled && (
                    <View style={styles.autoRepliedBar}>
                      <Ionicons name="checkmark-circle-outline" size={13} color={colors.statusConfirmed} />
                      <Text style={styles.autoRepliedText}>Respondida automaticamente por el sistema</Text>
                    </View>
                  )}

                  <Text style={styles.messageBody} numberOfLines={3}>{msg.body}</Text>

                  {msg.appointment ? (
                    <Text style={styles.messageMeta} numberOfLines={1}>
                      {msg.appointment.serviceName} — {formatDateTime(msg.appointment.requestedStartAt)}
                    </Text>
                  ) : null}

                  <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>
                      Recibido: {formatDateTime(msg.receivedAt)}
                    </Text>
                    {isUnread ? (
                      isMarkingThis ? (
                        <ActivityIndicator size="small" color={colors.gold} />
                      ) : (
                        <Text style={styles.markReadHint}>Toca para marcar leido</Text>
                      )
                    ) : (
                      <Text style={styles.readLabel}>
                        Leido: {formatDateTime(msg.readAt)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.infoBar}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
            <Text style={styles.infoText}>
              Toca cualquier mensaje para ver el detalle y actuar directamente.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Inbound detail bottom sheet ─────────────────────────── */}
      <Modal
        visible={selectedMsg !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMsg(null)}
        statusBarTranslucent
      >
        <View style={styles.sheetContainer}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSelectedMsg(null)} />
          {selectedMsg !== null && (
            <View style={styles.sheet}>
              {/* Handle bar + close */}
              <View style={styles.sheetTopBar}>
                <View style={styles.sheetHandle} />
                <TouchableOpacity onPress={() => setSelectedMsg(null)} hitSlop={12}>
                  <Ionicons name="close" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
                {/* Client header */}
                <View style={styles.sheetClientRow}>
                  <View style={styles.sheetAvatar}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  </View>
                  <View style={styles.sheetClientInfo}>
                    <Text style={styles.sheetClientName} numberOfLines={1}>
                      {selectedMsg.client?.fullName ?? selectedMsg.fromPhone}
                    </Text>
                    <Text style={styles.sheetClientPhone}>
                      {selectedMsg.client?.phone ?? selectedMsg.fromPhone}
                    </Text>
                  </View>
                  {(() => {
                    const cfg2 = INBOUND_INTENT_CONFIG[selectedMsg.intent] ?? INBOUND_INTENT_CONFIG.unknown;
                    return (
                      <View style={[styles.intentBadge, { backgroundColor: cfg2.color + '18' }]}>
                        <Ionicons name={cfg2.icon} size={12} color={cfg2.color} />
                        <Text style={[styles.intentText, { color: cfg2.color }]}>{cfg2.label}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* No-reply warning — solo si el cliente realmente necesita respuesta */}
                {!selectedMsg.botReplied && (['human_help', 'booking', 'reschedule', 'cancel'] as InboundMessageIntent[]).includes(selectedMsg.intent) && (
                  <View style={styles.sheetWarning}>
                    <Ionicons name="warning-outline" size={15} color={colors.error} />
                    <Text style={styles.sheetWarningText}>
                      Este cliente no ha recibido respuesta — atiende por WhatsApp directamente
                    </Text>
                  </View>
                )}

                {/* Full message body */}
                <View style={styles.sheetBodyBlock}>
                  <Text style={styles.sheetBodyLabel}>MENSAJE DEL CLIENTE</Text>
                  <Text style={styles.sheetBodyText}>{selectedMsg.body}</Text>
                </View>

                {/* Linked appointment */}
                {selectedMsg.appointment && (
                  <View style={styles.sheetAppt}>
                    <Ionicons name="calendar-outline" size={15} color={colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetApptService} numberOfLines={1}>
                        {selectedMsg.appointment.serviceName ?? 'Servicio sin especificar'}
                      </Text>
                      <Text style={styles.sheetApptDate}>
                        {formatDateTime(selectedMsg.appointment.requestedStartAt)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Timestamps */}
                <View style={styles.sheetMeta}>
                  <Text style={styles.sheetMetaText}>
                    Recibido {formatDateTime(selectedMsg.receivedAt)}
                  </Text>
                  {selectedMsg.readAt && (
                    <Text style={styles.sheetMetaText}>
                      Leido {formatDateTime(selectedMsg.readAt)}
                    </Text>
                  )}
                  {selectedMsg.botReplied && selectedMsg.botRepliedAt && (
                    <Text style={[styles.sheetMetaText, { color: colors.statusConfirmed }]}>
                      Bot respondio {formatDateTime(selectedMsg.botRepliedAt)}
                    </Text>
                  )}
                </View>

                {/* Context-aware action buttons */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.sheetBtnPrimary}
                    activeOpacity={0.8}
                    onPress={() => {
                      const raw = selectedMsg.client?.phone ?? selectedMsg.fromPhone;
                      Linking.openURL(`https://wa.me/${raw.replace(/\D/g, '')}`);
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color={colors.black} />
                    <Text style={styles.sheetBtnPrimaryText}>Abrir WhatsApp</Text>
                  </TouchableOpacity>

                  {(selectedMsg.intent === 'reschedule' || selectedMsg.intent === 'cancel') && (
                    selectedMsg.appointment ? (
                      <TouchableOpacity
                        style={styles.sheetBtnSecondary}
                        activeOpacity={0.8}
                        onPress={() => {
                          const apptVm = mapMsgToApptViewModel(selectedMsg);
                          setSelectedMsg(null);
                          setRescheduleFromMsg(apptVm);
                        }}
                      >
                        <Ionicons name="refresh-circle-outline" size={16} color={colors.gold} />
                        <Text style={styles.sheetBtnSecondaryText}>Reprogramar cita</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.sheetBtnSecondary}
                        activeOpacity={0.8}
                        onPress={() => { setSelectedMsg(null); router.push('/(owner)/agenda'); }}
                      >
                        <Ionicons name="calendar-outline" size={16} color={colors.gold} />
                        <Text style={styles.sheetBtnSecondaryText}>Ir a Agenda</Text>
                      </TouchableOpacity>
                    )
                  )}

                  {selectedMsg.intent === 'booking' && (
                    <TouchableOpacity
                      style={styles.sheetBtnSecondary}
                      activeOpacity={0.8}
                      onPress={() => {
                        const phone = selectedMsg.client?.phone ?? selectedMsg.fromPhone;
                        setSelectedMsg(null);
                        setNewApptPhone(phone);
                        setShowNewApptFromMsg(true);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.gold} />
                      <Text style={styles.sheetBtnSecondaryText}>Crear cita para este cliente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* ── RescheduleModal opened from inbound message bottom sheet ────────── */}
      <RescheduleModal
        visible={rescheduleFromMsg !== null}
        appointment={rescheduleFromMsg}
        onClose={() => setRescheduleFromMsg(null)}
        onSimulationComplete={(result: RescheduleSimulationResult) => {
          setRescheduleFromMsg(null);
          // Nothing to update in messages list — the appointment lives in dashboard
          console.info('[MESSAGES] Reschedule from message completed', result);
        }}
      />

      {/* ── NewAppointmentModal opened from inbound booking message ─────────── */}
      <NewAppointmentModal
        visible={showNewApptFromMsg}
        onClose={() => { setShowNewApptFromMsg(false); setNewApptPhone(''); }}
        onCreated={() => { setShowNewApptFromMsg(false); setNewApptPhone(''); }}
        initialPhone={newApptPhone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.gray900,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.gold },
  tabLabel: { ...typography.bodySmall, color: colors.gray500, fontWeight: '600' },
  tabLabelActive: { color: colors.gold },
  tabBadge: {
    backgroundColor: colors.gray700,
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: colors.gold + '30' },
  tabBadgeUnread: { backgroundColor: colors.error },
  tabBadgeText: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.md },

  // KPI summary row
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  summaryItemActive: { borderWidth: 2, borderColor: colors.gold },
  summaryValue: { ...typography.h2, color: colors.white },
  summaryLabel: { ...typography.caption, color: colors.gray400, marginTop: spacing.xxs },

  // Inbound filter chips
  inboundFilters: { gap: spacing.sm, paddingVertical: spacing.xxs },
  inboundFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.gray900,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  inboundFilterChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  inboundFilterLabel: { ...typography.caption, color: colors.gray400, fontWeight: '600' },
  inboundFilterLabelActive: { color: colors.black },
  chipCount: {
    backgroundColor: colors.error,
    borderRadius: radii.full,
    paddingHorizontal: 5,
    minWidth: 16,
    alignItems: 'center',
  },
  chipCountText: { fontSize: 9, color: colors.white, fontWeight: '700' },

  // Filter indicator
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold + '12',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: { ...typography.bodySmall, color: colors.gold, flex: 1, fontWeight: '600' },

  // Error bar
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '12',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorText: { ...typography.bodySmall, color: colors.error, flex: 1 },

  // Center state
  centerState: { alignItems: 'center', justifyContent: 'center', padding: spacing.huge },
  stateTitle: { ...typography.h3, color: colors.white, marginTop: spacing.md, textAlign: 'center' },
  stateMessage: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.sm, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { ...typography.buttonSmall, color: colors.black },

  // Message card (shared)
  messageCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  messageCardUnread: { borderColor: colors.gold + '60', backgroundColor: colors.gray900 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  messageHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  clientGroup: { flex: 1, minWidth: 0 },
  clientNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messageClient: { ...typography.subtitle, color: colors.white },
  messagePhone: { ...typography.caption, color: colors.gray500, marginTop: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },

  // Outbound status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  statusText: { ...typography.caption, fontWeight: '600' },

  // Inbound intent badge
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
    maxWidth: 150,
  },
  intentText: { ...typography.caption, fontWeight: '600', flexShrink: 1 },

  // Inbound attention bar — rojo: requiere acción humana real
  attentionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.error + '15',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  attentionText: { ...typography.caption, color: colors.error, fontWeight: '600' },
  // Inbound not-recognized bar — amber: bot no entendio el mensaje
  notRecognizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.warning + '18',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  notRecognizedText: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  // Inbound auto-replied bar — verde: el bot procesó y respondió correctamente
  autoRepliedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.statusConfirmed + '18',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  autoRepliedText: { ...typography.caption, color: colors.statusConfirmed, fontWeight: '600' },

  messageType: { ...typography.caption, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  messageBody: { ...typography.bodySmall, color: colors.gray400 },
  messageMeta: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  failureText: { ...typography.caption, color: colors.error, marginTop: spacing.xxs },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  messageTime: { ...typography.caption, color: colors.gray400, flex: 1 },
  markReadHint: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  readLabel: { ...typography.caption, color: colors.gray600 },

  retryMessageButton: {
    minWidth: 88,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryMessageText: { ...typography.buttonSmall, color: colors.black },

  // Info bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    marginTop: spacing.sm,
  },
  infoText: { ...typography.caption, color: colors.gray500, flex: 1 },

  // ── Detail bottom sheet ────────────────────────────────────────
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: colors.gray900,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.gray800,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray700,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  sheetClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sheetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D36618',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#25D36640',
  },
  sheetClientInfo: { flex: 1, minWidth: 0 },
  sheetClientName: { ...typography.subtitle, color: colors.white },
  sheetClientPhone: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  sheetWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.error + '12',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  sheetWarningText: { ...typography.bodySmall, color: colors.error, flex: 1, fontWeight: '600' },
  sheetBodyBlock: { gap: spacing.xs },
  sheetBodyLabel: {
    ...typography.caption,
    color: colors.gray600,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  sheetBodyText: { ...typography.body, color: colors.white, lineHeight: 22 },
  sheetAppt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gold + '10',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  sheetApptService: { ...typography.bodySmall, color: colors.gold, fontWeight: '600' },
  sheetApptDate: { ...typography.caption, color: colors.gray400, marginTop: 2 },
  sheetMeta: { gap: 4 },
  sheetMetaText: { ...typography.caption, color: colors.gray600 },
  sheetActions: { gap: spacing.sm },
  sheetBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  sheetBtnPrimaryText: { ...typography.button, color: colors.black, fontWeight: '700' },
  sheetBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold + '15',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  sheetBtnSecondaryText: { ...typography.button, color: colors.gold, fontWeight: '700' },
});
