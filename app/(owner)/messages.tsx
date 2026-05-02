import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getOwnerMessages, retryOwnerMessage } from '../../src/services/ownerApi';
import type { OwnerMessage, OwnerMessagesSummary, OwnerMessageStatus } from '../../src/types/messages';

type MessageFilter = 'all' | 'read' | 'failed' | null;

const PAGE_SIZE = 20;

const EMPTY_SUMMARY: OwnerMessagesSummary = {
  total: 0,
  pending: 0,
  queued: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
};

const STATUS_CONFIG: Record<OwnerMessageStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  pending: { icon: 'time-outline', color: colors.statusPending, label: 'Pendiente' },
  queued: { icon: 'hourglass-outline', color: colors.gold, label: 'En cola' },
  sent: { icon: 'checkmark', color: colors.gray500, label: 'Enviado' },
  delivered: { icon: 'checkmark-done', color: colors.info, label: 'Entregado' },
  read: { icon: 'checkmark-done', color: colors.statusConfirmed, label: 'Leido' },
  failed: { icon: 'close-circle', color: colors.error, label: 'Fallido' },
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmacion',
  reminder: 'Recordatorio',
  reconfirmation: 'Reconfirmacion',
  cancellation: 'Cancelacion',
  reschedule: 'Reprogramacion',
  incident: 'Incidente',
  owner_approval_result: 'Resultado de aprobacion',
  general: 'General',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
}

function getStatusFilter(filter: MessageFilter): OwnerMessageStatus | undefined {
  return filter === 'read' || filter === 'failed' ? filter : undefined;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMessageTimestamp(message: OwnerMessage): string {
  if (message.deliveredAt) return `Entregado: ${formatDateTime(message.deliveredAt)}`;
  if (message.sentAt) return `Enviado: ${formatDateTime(message.sentAt)}`;
  if (message.failedAt) return `Fallido: ${formatDateTime(message.failedAt)}`;
  return `Creado: ${formatDateTime(message.createdAt)}`;
}

export default function MessagesScreen() {
  const [filter, setFilter] = useState<MessageFilter>(null);
  const [messages, setMessages] = useState<OwnerMessage[]>([]);
  const [summary, setSummary] = useState<OwnerMessagesSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);

      const response = await getOwnerMessages({
        status: getStatusFilter(filter),
        page: 1,
        limit: PAGE_SIZE,
      });

      setMessages(response.data);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (err) {
      setMessages([]);
      setTotal(0);
      setSummary(EMPTY_SUMMARY);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  const handleFilterPress = (key: MessageFilter) => {
    setFilter((prev) => (prev === key ? null : key));
  };

  const handleRetry = async (messageId: string) => {
    try {
      setRetryingId(messageId);
      setActionError(null);
      await retryOwnerMessage(messageId);
      await fetchMessages();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setRetryingId(null);
    }
  };

  const filterLabel = useMemo(() => {
    if (filter === 'all') return 'Todos';
    if (filter === 'read') return 'Leidos';
    if (filter === 'failed') return 'Fallidos';
    return null;
  }, [filter]);

  return (
    <View style={styles.container}>
      <TopHeader
        title="Mensajes"
        subtitle="Estado de notificaciones enviadas"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'all' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('all')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'read' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('read')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: colors.statusConfirmed }]}>
              {summary.read}
            </Text>
            <Text style={styles.summaryLabel}>Leidos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'failed' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('failed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {summary.failed}
            </Text>
            <Text style={styles.summaryLabel}>Fallidos</Text>
          </TouchableOpacity>
        </View>

        {filterLabel && (
          <View style={styles.filterIndicator}>
            <Ionicons name="funnel" size={14} color={colors.gold} />
            <Text style={styles.filterText}>
              Filtrando: {filterLabel} ({total})
            </Text>
            <TouchableOpacity onPress={() => setFilter(null)}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        )}

        {actionError ? (
          <View style={styles.errorBar}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="warning-outline" size={42} color={colors.error} />
            <Text style={styles.stateTitle}>No se pudieron cargar los mensajes</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchMessages} activeOpacity={0.7}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="Sin mensajes"
            message={filter ? 'No hay mensajes para este filtro.' : 'Aun no hay mensajes en la cola.'}
          />
        ) : (
          messages.map((msg) => {
            const statusCfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.pending;
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
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.messageType}>
                  {MESSAGE_TYPE_LABELS[msg.messageType] ?? msg.messageType}
                </Text>
                <Text style={styles.messageBody} numberOfLines={2}>{msg.body}</Text>
                {msg.appointment ? (
                  <Text style={styles.messageMeta} numberOfLines={1}>
                    {msg.appointment.serviceName} - {formatDateTime(msg.appointment.requestedStartAt)}
                  </Text>
                ) : null}
                {msg.failureReason ? (
                  <Text style={styles.failureText} numberOfLines={2}>{msg.failureReason}</Text>
                ) : null}
                <View style={styles.messageFooter}>
                  <Text style={styles.messageTime}>{getMessageTimestamp(msg)}</Text>
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
            WhatsApp aun no esta conectado. Los mensajes quedan en cola para futuro envio.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scrollView: {
    flex: 1,
  },
  scrollContent: { padding: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  summaryItemActive: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  summaryValue: { ...typography.h2, color: colors.white },
  summaryLabel: { ...typography.caption, color: colors.gray400, marginTop: spacing.xxs },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold + '12',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.gold,
    flex: 1,
    fontWeight: '600',
  },
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
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.huge,
  },
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
  messageCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  messageHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  clientGroup: { flex: 1, minWidth: 0 },
  messageClient: { ...typography.subtitle, color: colors.white },
  messagePhone: { ...typography.caption, color: colors.gray500, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  statusText: { ...typography.caption, fontWeight: '600' },
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
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  infoText: { ...typography.bodySmall, color: colors.gray400, flex: 1 },
});
