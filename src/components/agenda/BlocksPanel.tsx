import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { Incident, TimeBlock } from '../../types/database';
import { MOCK_INCIDENTS } from '../../services/mock-data';
import { fetchTimeBlocks } from '../../services/availability';
import { formatLocalDateKey } from '../../utils/date';
import { BlockTimeModal } from '../modals/BlockTimeModal';

const BLOCK_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  personal: { icon: 'person', color: colors.info, label: 'Personal' },
  comida: { icon: 'restaurant', color: colors.gold, label: 'Comida' },
  escuela: { icon: 'school', color: colors.info, label: 'Escuela' },
  descanso: { icon: 'cafe', color: colors.statusConfirmed, label: 'Descanso' },
  mandado: { icon: 'car', color: colors.statusPending, label: 'Mandado' },
  otro: { icon: 'ellipse', color: colors.gray600, label: 'Otro' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: colors.info, label: 'Baja' },
  medium: { color: colors.statusPending, label: 'Media' },
  high: { color: colors.error, label: 'Alta' },
  emergency: { color: colors.statusRejected || colors.error, label: 'Emergencia' },
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function BlocksPanel() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [incidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = formatLocalDateKey(new Date());
      const endDate = formatLocalDateKey(addDays(new Date(), 44));
      setBlocks(await fetchTimeBlocks(startDate, endDate));
    } catch (loadError) {
      setBlocks([]);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los bloqueos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bloqueos e incidencias</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewBlock(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addBtnText}>Bloqueo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {error ? (
          <TouchableOpacity style={styles.errorBanner} onPress={() => void loadBlocks()} activeOpacity={0.7}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={styles.loadingText}>Cargando bloqueos reales...</Text>
          </View>
        ) : null}

        {incidents.filter(i => !i.is_resolved).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incidencias activas</Text>
            {incidents.filter(i => !i.is_resolved).map((inc) => {
              const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.low;
              return (
                <View key={inc.id} style={[styles.incidentCard, { borderLeftColor: sev.color }]}>
                  <View style={styles.incidentHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: sev.color + '15' }]}>
                      <Ionicons name="warning" size={12} color={sev.color} />
                      <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                    <Text style={styles.incidentDate}>{inc.date}</Text>
                  </View>
                  <Text style={styles.incidentTitle}>{inc.title}</Text>
                  {inc.description ? <Text style={styles.incidentDesc}>{inc.description}</Text> : null}
                  <Text style={styles.incidentTime}>{inc.block_start_time} - {inc.block_end_time}</Text>
                  {inc.affected_appointment_ids.length > 0 ? (
                    <Text style={styles.affectedText}>
                      {inc.affected_appointment_ids.length} citas afectadas
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bloqueos de horario</Text>
          {blocks.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={28} color={colors.gray300} />
              <Text style={styles.emptyText}>Sin bloqueos activos en los proximos 45 dias</Text>
            </View>
          ) : (
            blocks.map((block) => {
              const cfg = BLOCK_TYPE_CONFIG[block.block_type] || BLOCK_TYPE_CONFIG.otro;
              return (
                <View key={block.id} style={styles.blockCard}>
                  <View style={[styles.blockIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  </View>
                  <View style={styles.blockInfo}>
                    <Text style={styles.blockLabel}>{block.label || cfg.label}</Text>
                    <Text style={styles.blockMeta}>
                      {block.date} - {block.start_time} a {block.end_time}
                      {block.is_recurring ? ' - Recurrente' : ''}
                    </Text>
                    {block.notes ? <Text style={styles.blockNotes}>{block.notes}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <BlockTimeModal
        visible={showNewBlock}
        onClose={() => {
          setShowNewBlock(false);
          void loadBlocks();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  title: { ...typography.h3, color: colors.white, fontSize: 16 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.black,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  addBtnText: { ...typography.caption, color: colors.white, fontWeight: '600' },
  scrollView: { flex: 1, padding: spacing.xl },
  section: { gap: spacing.sm, marginBottom: spacing.xxl },
  sectionTitle: { ...typography.subtitle, color: colors.white, fontSize: 14, marginBottom: spacing.xs },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  loadingText: { ...typography.bodySmall, color: colors.gray400 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '14',
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.bodySmall, color: colors.error, flex: 1 },
  retryText: { ...typography.caption, color: colors.gold, fontWeight: '700' },
  incidentCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  severityText: { ...typography.caption, fontWeight: '600' },
  incidentDate: { ...typography.caption, color: colors.gray400 },
  incidentTitle: { ...typography.subtitle, color: colors.white, fontSize: 14 },
  incidentDesc: { ...typography.bodySmall, color: colors.gray400 },
  incidentTime: { ...typography.caption, color: colors.gray500 },
  affectedText: { ...typography.caption, color: colors.error, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.gray400 },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  blockIcon: { width: 36, height: 36, borderRadius: radii.sm, justifyContent: 'center', alignItems: 'center' },
  blockInfo: { flex: 1, gap: spacing.xxs },
  blockLabel: { ...typography.subtitle, color: colors.white, fontSize: 13 },
  blockMeta: { ...typography.caption, color: colors.gray500 },
  blockNotes: { ...typography.caption, color: colors.gray400, fontStyle: 'italic' },
});
