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

const MOCK_MESSAGES = [
  {
    id: 'm1',
    clientName: 'Ana López',
    type: 'Confirmación de cita',
    channel: 'WhatsApp',
    status: 'delivered',
    sentAt: '2026-04-12 10:30',
    body: 'Hola Ana, tu cita para Corte de cabello ha sido confirmada para el Mié 15 abril · 12:45 pm.',
  },
  {
    id: 'm2',
    clientName: 'Martha Ruiz',
    type: 'Recordatorio',
    channel: 'WhatsApp',
    status: 'read',
    sentAt: '2026-04-11 18:00',
    body: 'Recordatorio: tienes cita mañana a las 16:00. Responde 1 para confirmar o 2 para cancelar.',
  },
  {
    id: 'm3',
    clientName: 'Carlos Méndez',
    type: 'Confirmación de cita',
    channel: 'WhatsApp',
    status: 'sent',
    sentAt: '2026-04-12 09:15',
    body: 'Hola Carlos, tu cita ha sido aceptada para hoy a las 09:00.',
  },
  {
    id: 'm4',
    clientName: 'Lucía Ramírez',
    type: 'Reprogramación',
    channel: 'WhatsApp',
    status: 'failed',
    sentAt: '2026-04-10 14:00',
    body: 'Hola Lucía, tu cita necesita reprogramarse por una emergencia del estudio.',
  },
];

const STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  sent: { icon: 'checkmark', color: colors.gray500, label: 'Enviado' },
  delivered: { icon: 'checkmark-done', color: colors.info, label: 'Entregado' },
  read: { icon: 'checkmark-done', color: colors.statusConfirmed, label: 'Leído' },
  failed: { icon: 'close-circle', color: colors.error, label: 'Fallido' },
};

export default function MessagesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <Text style={styles.headerSubtitle}>Estado de notificaciones enviadas</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary bar */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{MOCK_MESSAGES.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.statusConfirmed }]}>
              {MOCK_MESSAGES.filter((m) => m.status === 'read').length}
            </Text>
            <Text style={styles.summaryLabel}>Leídos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {MOCK_MESSAGES.filter((m) => m.status === 'failed').length}
            </Text>
            <Text style={styles.summaryLabel}>Fallidos</Text>
          </View>
        </View>

        {/* Message list */}
        {MOCK_MESSAGES.map((msg) => {
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs },
  headerContent: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSubtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  summaryValue: { ...typography.h2, color: colors.gray900 },
  summaryLabel: { ...typography.caption, color: colors.gray600, marginTop: spacing.xxs },
  messageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.card,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageClient: { ...typography.subtitle, color: colors.gray900 },
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
  messageBody: { ...typography.bodySmall, color: colors.gray600 },
  messageTime: { ...typography.caption, color: colors.gray400, marginTop: spacing.xxs },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  infoText: { ...typography.bodySmall, color: colors.info, flex: 1 },
});
