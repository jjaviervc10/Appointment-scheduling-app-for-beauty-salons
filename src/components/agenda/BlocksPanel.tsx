import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import type { TimeBlock, Incident } from '../../types/database';
import { MOCK_TIME_BLOCKS, MOCK_INCIDENTS } from '../../services/mock-data';

const BLOCK_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
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

export function BlocksPanel() {
  const [blocks, setBlocks] = useState<TimeBlock[]>(MOCK_TIME_BLOCKS);
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [showNewIncident, setShowNewIncident] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bloqueos e incidencias</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewBlock(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addBtnText}>Bloqueo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.incidentBtn} onPress={() => setShowNewIncident(true)} activeOpacity={0.7}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={styles.incidentBtnText}>Incidencia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Active Incidents */}
        {incidents.filter(i => !i.is_resolved).length > 0 && (
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
                  {inc.description && <Text style={styles.incidentDesc}>{inc.description}</Text>}
                  <Text style={styles.incidentTime}>{inc.block_start_time} - {inc.block_end_time}</Text>
                  {inc.affected_appointment_ids.length > 0 && (
                    <Text style={styles.affectedText}>
                      {inc.affected_appointment_ids.length} citas afectadas
                    </Text>
                  )}
                  <View style={styles.incidentActions}>
                    <TouchableOpacity style={styles.notifyBtn} activeOpacity={0.7}>
                      <Ionicons name="send" size={14} color={colors.info} />
                      <Text style={styles.notifyBtnText}>Notificar clientes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.7}>
                      <Ionicons name="calendar-outline" size={14} color={colors.gold} />
                      <Text style={styles.rescheduleBtnText}>Reprogramar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resolveBtn} activeOpacity={0.7}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.statusConfirmed} />
                      <Text style={styles.resolveBtnText}>Resolver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Time Blocks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bloqueos de horario</Text>
          {blocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={28} color={colors.gray300} />
              <Text style={styles.emptyText}>Sin bloqueos registrados</Text>
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
                    <Text style={styles.blockLabel}>{block.label}</Text>
                    <Text style={styles.blockMeta}>
                      {block.date} · {block.start_time} - {block.end_time}
                      {block.is_recurring ? ' · Recurrente' : ''}
                    </Text>
                    {block.notes && <Text style={styles.blockNotes}>{block.notes}</Text>}
                  </View>
                  <TouchableOpacity style={styles.blockDelete}>
                    <Ionicons name="trash-outline" size={16} color={colors.gray400} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Block Modal */}
      {showNewBlock && (
        <NewBlockModal onClose={() => setShowNewBlock(false)} />
      )}
    </View>
  );
}

function NewBlockModal({ onClose }: { onClose: () => void }) {
  const [blockType, setBlockType] = useState<string>('comida');
  const [label, setLabel] = useState('');
  const types = Object.entries(BLOCK_TYPE_CONFIG);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={mStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={mStyles.card}>
          <Text style={mStyles.title}>Nuevo bloqueo de horario</Text>

          <View style={mStyles.typeGrid}>
            {types.map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[mStyles.typeBtn, blockType === key && { backgroundColor: cfg.color + '15', borderColor: cfg.color }]}
                onPress={() => { setBlockType(key); setLabel(cfg.label); }}
              >
                <Ionicons name={cfg.icon} size={16} color={blockType === key ? cfg.color : colors.gray500} />
                <Text style={[mStyles.typeLabel, blockType === key && { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={mStyles.field}>
            <Text style={mStyles.fieldLabel}>Etiqueta</Text>
            <TextInput style={mStyles.input} value={label} onChangeText={setLabel} placeholder="Nombre del bloqueo" placeholderTextColor={colors.gray400} />
          </View>

          <View style={mStyles.buttonRow}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.saveBtn} onPress={onClose}>
              <Text style={mStyles.saveBtnText}>Crear bloqueo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.gray900, borderRadius: radii.lg, padding: spacing.xxl, width: 380, borderWidth: 1, borderColor: colors.gray800 },
  title: { ...typography.h3, color: colors.white, marginBottom: spacing.xl },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.gray800 },
  typeLabel: { ...typography.bodySmall, color: colors.gray400 },
  field: { gap: spacing.xs, marginBottom: spacing.xl },
  fieldLabel: { ...typography.caption, color: colors.gray400, textTransform: 'uppercase' },
  input: { backgroundColor: colors.gray800, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body, color: colors.white },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.gray800, alignItems: 'center' },
  cancelBtnText: { ...typography.buttonSmall, color: colors.gray400 },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.gold, alignItems: 'center' },
  saveBtnText: { ...typography.buttonSmall, color: colors.black },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.black, borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  title: { ...typography.h3, color: colors.white, fontSize: 16 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    backgroundColor: colors.black, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.sm,
  },
  addBtnText: { ...typography.caption, color: colors.white, fontWeight: '600' },
  incidentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    backgroundColor: colors.errorLight, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.sm,
  },
  incidentBtnText: { ...typography.caption, color: colors.error, fontWeight: '600' },
  scrollView: { flex: 1, padding: spacing.xl },
  section: { gap: spacing.sm, marginBottom: spacing.xxl },
  sectionTitle: { ...typography.subtitle, color: colors.white, fontSize: 14, marginBottom: spacing.xs },
  incidentCard: {
    backgroundColor: colors.gray900, borderRadius: radii.md, padding: spacing.lg,
    borderLeftWidth: 4, gap: spacing.xs, borderWidth: 1, borderColor: colors.gray800,
  },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.full },
  severityText: { ...typography.caption, fontWeight: '600' },
  incidentDate: { ...typography.caption, color: colors.gray400 },
  incidentTitle: { ...typography.subtitle, color: colors.white, fontSize: 14 },
  incidentDesc: { ...typography.bodySmall, color: colors.gray400 },
  incidentTime: { ...typography.caption, color: colors.gray500 },
  affectedText: { ...typography.caption, color: colors.error, fontWeight: '500' },
  incidentActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  notifyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.infoLight },
  notifyBtnText: { ...typography.caption, color: colors.info, fontWeight: '500' },
  rescheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.gold + '15' },
  rescheduleBtnText: { ...typography.caption, color: colors.gold, fontWeight: '500' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.statusConfirmedBg },
  resolveBtnText: { ...typography.caption, color: colors.statusConfirmed, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.gray400 },
  blockCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.gray900, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.gray800,
  },
  blockIcon: { width: 36, height: 36, borderRadius: radii.sm, justifyContent: 'center', alignItems: 'center' },
  blockInfo: { flex: 1, gap: spacing.xxs },
  blockLabel: { ...typography.subtitle, color: colors.white, fontSize: 13 },
  blockMeta: { ...typography.caption, color: colors.gray500 },
  blockNotes: { ...typography.caption, color: colors.gray400, fontStyle: 'italic' },
  blockDelete: { padding: spacing.xs },
});
