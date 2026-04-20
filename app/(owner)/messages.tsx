import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { MOCK_MESSAGES } from '../../src/services/mock-data';

type MessageFilter = 'all' | 'read' | 'failed' | null;

const STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  sent: { icon: 'checkmark', color: colors.gray500, label: 'Enviado' },
  delivered: { icon: 'checkmark-done', color: colors.info, label: 'Entregado' },
  read: { icon: 'checkmark-done', color: colors.statusConfirmed, label: 'Leído' },
  failed: { icon: 'close-circle', color: colors.error, label: 'Fallido' },
};

export default function MessagesScreen() {
  const [filter, setFilter] = useState<MessageFilter>(null);

  const filteredMessages = useMemo(() => {
    if (!filter || filter === 'all') return MOCK_MESSAGES;
    return MOCK_MESSAGES.filter((m) => m.status === filter);
  }, [filter]);

  const handleFilterPress = (key: MessageFilter) => {
    setFilter(prev => prev === key ? null : key);
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="Mensajes"
        subtitle="Estado de notificaciones enviadas"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary bar */}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'all' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('all')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryValue}>{MOCK_MESSAGES.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'read' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('read')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: colors.statusConfirmed }]}>
              {MOCK_MESSAGES.filter((m) => m.status === 'read').length}
            </Text>
            <Text style={styles.summaryLabel}>Leídos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryItem, filter === 'failed' && styles.summaryItemActive]}
            onPress={() => handleFilterPress('failed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {MOCK_MESSAGES.filter((m) => m.status === 'failed').length}
            </Text>
            <Text style={styles.summaryLabel}>Fallidos</Text>
          </TouchableOpacity>
        </View>

        {/* Active filter indicator */}
        {filter && (
          <View style={styles.filterIndicator}>
            <Ionicons name="funnel" size={14} color={colors.gold} />
            <Text style={styles.filterText}>
              Filtrando: {filter === 'all' ? 'Todos' : filter === 'read' ? 'Leídos' : 'Fallidos'}
              {' '}({filteredMessages.length})
            </Text>
            <TouchableOpacity onPress={() => setFilter(null)}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        )}

        {/* Message list */}
        {filteredMessages.map((msg) => {
          const statusCfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.sent;
          return (
            <View key={msg.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.messageHeaderLeft}>
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.messageClient}>{msg.clientName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
                  <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.messageType}>{msg.type}</Text>
              <Text style={styles.messageBody} numberOfLines={2}>{msg.body}</Text>
              <Text style={styles.messageTime}>{msg.sentAt}</Text>
            </View>
          );
        })}

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
          <Text style={styles.infoText}>
            Los mensajes se envían automáticamente por WhatsApp al cambiar el estado de una cita.
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
  },
  messageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageClient: { ...typography.subtitle, color: colors.white },
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
  messageTime: { ...typography.caption, color: colors.gray400, marginTop: spacing.xxs },
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
