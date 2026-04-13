import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { StatusChip } from '../../src/components/ui/StatusChip';
import { TimeBlockCard } from '../../src/components/availability/TimeBlockCard';
import { IncidentCard } from '../../src/components/incidents/IncidentCard';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { SecondaryButton } from '../../src/components/ui/SecondaryButton';
import { getMockDayDetail } from '../../src/services/mock-data';
import type { TimeBlock } from '../../src/types/database';
import type { TimeBlockType } from '../../src/types/enums';

const BLOCK_TYPE_OPTIONS: { value: TimeBlockType; label: string; icon: string }[] = [
  { value: 'comida', label: 'Comida', icon: 'restaurant-outline' },
  { value: 'escuela', label: 'Escuela', icon: 'school-outline' },
  { value: 'descanso', label: 'Descanso', icon: 'cafe-outline' },
  { value: 'mandado', label: 'Mandado', icon: 'car-outline' },
  { value: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date ?? new Date().toISOString().split('T')[0];

  const detail = useMemo(() => getMockDayDetail(date), [date]);

  // Local blocks state (mock data + user-created)
  const [extraBlocks, setExtraBlocks] = useState<TimeBlock[]>([]);
  const allBlocks = [...detail.timeBlocks, ...extraBlocks];

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [blockType, setBlockType] = useState<TimeBlockType>('comida');
  const [blockLabel, setBlockLabel] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('10:00');
  const [blockNotes, setBlockNotes] = useState('');
  const [editingField, setEditingField] = useState<'desde' | 'hasta'>('desde');

  const resetForm = () => {
    setBlockType('comida');
    setBlockLabel('');
    setBlockStart('09:00');
    setBlockEnd('10:00');
    setBlockNotes('');
    setEditingField('desde');
  };

  const handleCreateBlock = () => {
    if (blockStart >= blockEnd) {
      Alert.alert('Error', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    const label = blockLabel.trim() || BLOCK_TYPE_OPTIONS.find(o => o.value === blockType)!.label;
    const newBlock: TimeBlock = {
      id: `tb_new_${Date.now()}`,
      owner_id: 'owner1',
      block_type: blockType,
      label,
      date,
      start_time: blockStart,
      end_time: blockEnd,
      is_recurring: false,
      recurrence_day_of_week: null,
      notes: blockNotes.trim() || null,
      created_at: new Date().toISOString(),
    };
    setExtraBlocks(prev => [...prev, newBlock]);
    setShowModal(false);
    resetForm();
    Alert.alert('Bloque creado', `${label}: ${blockStart} - ${blockEnd}`);
  };

  const handleDeleteBlock = (id: string) => {
    setExtraBlocks(prev => prev.filter(b => b.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const handleAccept = (id: string) => {
    Alert.alert('Cita aceptada', `Se confirmará la cita ${id} y se notificará al cliente.`);
  };

  const handleReject = (id: string) => {
    Alert.alert('Cita rechazada', `Se notificará al cliente sobre el rechazo.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{formatDate(date)}</Text>
          <Text style={styles.headerSubtitle}>Vista operativa del día</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionChip} activeOpacity={0.7}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.gray800} />
            <Text style={styles.actionChipText}>Bloquear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionChip}
            activeOpacity={0.7}
            onPress={() => router.push('/(owner)/incidents')}
          >
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.actionChipText}>Incidencia</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.info} />
            <Text style={styles.actionChipText}>Reprogramar</Text>
          </TouchableOpacity>
        </View>

        {/* Incidents (if any) */}
        {detail.incidents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incidencias activas</Text>
            {detail.incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </View>
        )}

        {/* Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citas del día</Text>
          {detail.appointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sin citas para este día</Text>
            </View>
          ) : (
            detail.appointments.map((appt) => (
              <View key={appt.id} style={styles.apptCard}>
                <View style={styles.apptTime}>
                  <Text style={styles.apptTimeText}>
                    {appt.startAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.apptInfo}>
                  <View style={styles.apptHeader}>
                    <Text style={styles.apptClient}>{appt.clientName}</Text>
                    <StatusChip status={appt.status} />
                  </View>
                  <Text style={styles.apptService}>
                    {appt.serviceName} · {appt.durationMinutes} min
                  </Text>
                  {appt.status === 'pending_owner_approval' && (
                    <View style={styles.apptActions}>
                      <TouchableOpacity
                        style={styles.miniAcceptBtn}
                        onPress={() => handleAccept(appt.id)}
                      >
                        <Text style={styles.miniAcceptText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.miniRejectBtn}
                        onPress={() => handleReject(appt.id)}
                      >
                        <Text style={styles.miniRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Time Blocks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bloques del día</Text>
            <TouchableOpacity onPress={() => { resetForm(); setShowModal(true); }}>
              <Ionicons name="add-circle-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
          </View>
          {allBlocks.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => { resetForm(); setShowModal(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-outline" size={24} color={colors.gold} style={{ marginBottom: spacing.xs }} />
              <Text style={styles.emptyText}>Sin bloques personales</Text>
              <Text style={[styles.emptyText, { fontSize: 12, color: colors.gold, marginTop: spacing.xxs }]}>
                Toca para agregar uno
              </Text>
            </TouchableOpacity>
          ) : (
            allBlocks.map((block) => (
              <TouchableOpacity
                key={block.id}
                onLongPress={() => {
                  if (block.id.startsWith('tb_new_')) {
                    Alert.alert('Eliminar bloque', `¿Eliminar "${block.label}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteBlock(block.id) },
                    ]);
                  }
                }}
                activeOpacity={0.9}
              >
                <TimeBlockCard block={block} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Availability info */}
        {detail.availableFrom && detail.availableTo && (
          <View style={styles.availabilityBar}>
            <Ionicons name="time-outline" size={16} color={colors.gray600} />
            <Text style={styles.availabilityText}>
              Horario: {detail.availableFrom} a {detail.availableTo}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Block Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo bloque</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: spacing.lg }}>
              {/* Block Type */}
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.modalLabel}>Tipo de bloque</Text>
                <View style={styles.typeGrid}>
                  {BLOCK_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.typeChip,
                        blockType === opt.value && styles.typeChipActive,
                      ]}
                      onPress={() => setBlockType(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={blockType === opt.value ? colors.black : colors.gray600}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          blockType === opt.value && styles.typeChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Label */}
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.modalLabel}>Etiqueta (opcional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ej: Comida con familia"
                  placeholderTextColor={colors.gray400}
                  value={blockLabel}
                  onChangeText={setBlockLabel}
                />
              </View>

              {/* Time Range */}
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.modalLabel}>Horario</Text>
                <View style={styles.timeLabelsRow}>
                  <TouchableOpacity
                    style={[styles.timeLabelBox, editingField === 'desde' && styles.timeLabelBoxActive]}
                    onPress={() => setEditingField('desde')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeSublabel, editingField === 'desde' && styles.timeSublabelActive]}>Desde</Text>
                    <Text style={[styles.timeLabelValue, editingField === 'desde' && styles.timeLabelValueActive]}>{blockStart}</Text>
                  </TouchableOpacity>
                  <Ionicons name="arrow-forward" size={16} color={colors.gray400} />
                  <TouchableOpacity
                    style={[styles.timeLabelBox, editingField === 'hasta' && styles.timeLabelBoxActive]}
                    onPress={() => setEditingField('hasta')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeSublabel, editingField === 'hasta' && styles.timeSublabelActive]}>Hasta</Text>
                    <Text style={[styles.timeLabelValue, editingField === 'hasta' && styles.timeLabelValueActive]}>{blockEnd}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.editingHint}>
                  {editingField === 'desde' ? 'Selecciona la hora de inicio' : 'Selecciona la hora de fin'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: spacing.xs }}>
                  {HOUR_OPTIONS.map((h) => {
                    const isStart = h === blockStart;
                    const isEnd = h === blockEnd;
                    const isBetween = h > blockStart && h < blockEnd;
                    const isDisabled = editingField === 'hasta' && h <= blockStart;
                    return (
                      <TouchableOpacity
                        key={`bh_${h}`}
                        style={[
                          styles.timeOption,
                          isBetween && styles.timeOptionBetween,
                          isStart && styles.timeOptionActive,
                          isEnd && styles.timeOptionActive,
                          isDisabled && styles.timeOptionDisabled,
                        ]}
                        disabled={isDisabled}
                        onPress={() => {
                          if (editingField === 'desde') {
                            setBlockStart(h);
                            if (h >= blockEnd) {
                              const nextIdx = HOUR_OPTIONS.indexOf(h) + 1;
                              if (nextIdx < HOUR_OPTIONS.length) setBlockEnd(HOUR_OPTIONS[nextIdx]);
                            }
                            setEditingField('hasta');
                          } else {
                            setBlockEnd(h);
                          }
                        }}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          (isStart || isEnd) && styles.timeOptionTextActive,
                          isBetween && { color: colors.gray800 },
                          isDisabled && styles.timeOptionTextDisabled,
                        ]}>{h}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Notes */}
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.modalLabel}>Notas (opcional)</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Ej: Llevar a los niños a la escuela"
                  placeholderTextColor={colors.gray400}
                  value={blockNotes}
                  onChangeText={setBlockNotes}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateBtn}
                onPress={handleCreateBlock}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color={colors.black} />
                <Text style={styles.modalCreateText}>Crear bloque</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  actionChipText: {
    ...typography.buttonSmall,
    color: colors.gray800,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray900,
  },
  apptCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  apptTime: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  apptTimeText: {
    ...typography.subtitle,
    color: colors.gray800,
  },
  apptInfo: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apptClient: {
    ...typography.subtitle,
    color: colors.gray900,
  },
  apptService: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  apptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  miniAcceptBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  miniAcceptText: {
    ...typography.buttonSmall,
    color: colors.white,
    fontSize: 12,
  },
  miniRejectBtn: {
    borderWidth: 1,
    borderColor: colors.gray400,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  miniRejectText: {
    ...typography.buttonSmall,
    color: colors.gray600,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray500,
  },
  availabilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.card,
  },
  availabilityText: {
    ...typography.body,
    color: colors.gray700,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.gray900,
  },
  modalScroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalLabel: {
    ...typography.caption,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray100,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: colors.gold + '20',
    borderColor: colors.gold,
  },
  typeChipText: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  typeChipTextActive: {
    color: colors.black,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray900,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeSublabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  timeLabelBox: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeLabelBoxActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '10',
  },
  timeLabelValue: { ...typography.h3, color: colors.gray400 },
  timeLabelValueActive: { color: colors.gray900 },
  timeSublabelActive: { color: colors.gold, fontWeight: '600' },
  editingHint: {
    ...typography.caption,
    color: colors.gold,
    textAlign: 'center',
  },
  timeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    marginRight: spacing.xs,
  },
  timeOptionBetween: {
    backgroundColor: colors.gold + '15',
  },
  timeOptionActive: {
    backgroundColor: colors.gold,
  },
  timeOptionDisabled: {
    backgroundColor: colors.gray50,
    opacity: 0.4,
  },
  timeOptionText: {
    ...typography.bodySmall,
    color: colors.gray700,
  },
  timeOptionTextActive: {
    color: colors.black,
    fontWeight: '600',
  },
  timeOptionTextDisabled: {
    color: colors.gray400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.subtitle,
    color: colors.gray600,
  },
  modalCreateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  modalCreateText: {
    ...typography.subtitle,
    color: colors.black,
  },
});
