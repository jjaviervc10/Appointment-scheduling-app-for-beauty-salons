import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { fetchWeeklyAvailability } from '../../src/services/availability';
import { MOCK_TIME_BLOCKS } from '../../src/services/mock-data';
import { TimeBlockCard } from '../../src/components/availability/TimeBlockCard';
import { WeekCalendarView } from '../../src/components/calendar/WeekCalendarView';
import { IncidentsInlineView } from '../../src/components/incidents/IncidentsInlineView';
import type { WeeklyAvailability, TimeBlock } from '../../src/types/database';
import type { TimeBlockType } from '../../src/types/enums';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LABELS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TABS = ['Agenda', 'Disponibilidad', 'Bloqueos', 'Incidencias'] as const;

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

function getWeekDates(referenceDate: string) {
  const ref = new Date(referenceDate + 'T12:00:00');
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dow + (dow === 0 ? -6 : 1));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d.toISOString().split('T')[0], dayOfWeek: d.getDay(), dayNum: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
  });
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Disponibilidad');
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(new Date().getDay());
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  // Editable hours for selected day
  const selectedAvail = availability.find((a) => a.day_of_week === selectedDayOfWeek);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Blocks for selected day date
  const selectedDateStr = weekDates.find(w => w.dayOfWeek === selectedDayOfWeek)?.date ?? today;
  const dayBlocks = MOCK_TIME_BLOCKS.filter(b => b.date === selectedDateStr);
  const [extraBlocks, setExtraBlocks] = useState<TimeBlock[]>([]);
  const allBlocks = [...dayBlocks, ...extraBlocks.filter(b => b.date === selectedDateStr)];

  // Block creation modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState<TimeBlockType>('comida');
  const [blockLabel, setBlockLabel] = useState('');
  const [blockStart, setBlockStart] = useState('14:00');
  const [blockEnd, setBlockEnd] = useState('15:00');
  const [editingField, setEditingField] = useState<'desde' | 'hasta'>('desde');
  const [editingDayField, setEditingDayField] = useState<'desde' | 'hasta'>('desde');

  useEffect(() => {
    fetchWeeklyAvailability().then((data) => {
      setAvailability(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedAvail) {
      setEditStart(selectedAvail.start_time);
      setEditEnd(selectedAvail.end_time);
    } else {
      setEditStart('09:00');
      setEditEnd('18:00');
    }
  }, [selectedDayOfWeek, selectedAvail]);

  const handleSave = () => {
    Alert.alert('Disponibilidad guardada', `${DAY_LABELS_FULL[selectedDayOfWeek]}: ${editStart} - ${editEnd}`);
  };

  const handleCreateBlock = () => {
    if (blockStart >= blockEnd) {
      Alert.alert('Error', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    const label = blockLabel.trim() || BLOCK_TYPE_OPTIONS.find(o => o.value === blockType)!.label;
    const newBlock: TimeBlock = {
      id: `tb_avail_${Date.now()}`,
      owner_id: 'owner1',
      block_type: blockType,
      label,
      date: selectedDateStr,
      start_time: blockStart,
      end_time: blockEnd,
      is_recurring: false,
      recurrence_day_of_week: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
    setExtraBlocks(prev => [...prev, newBlock]);
    setShowBlockModal(false);
    setBlockLabel('');
  };

  const handleTabPress = (tab: typeof TABS[number]) => {
    setActiveTab(tab);
  };

  const handleAgendaDayPress = (date: string) => {
    router.push({ pathname: '/(owner)/day-detail', params: { date } });
  };

  // Weekly bar chart data
  const barData = [1, 2, 3, 4, 5, 6].map(dow => {
    const a = availability.find(av => av.day_of_week === dow);
    if (!a?.is_active) return { dow, hours: 0, label: DAY_LABELS[dow] };
    const start = parseInt(a.start_time.split(':')[0]);
    const end = parseInt(a.end_time.split(':')[0]);
    return { dow, hours: end - start, label: DAY_LABELS[dow] };
  });
  const maxHours = Math.max(...barData.map(b => b.hours), 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Disponibilidad</Text>
          <Text style={styles.headerSubtitle}>Configura horarios y bloques por día</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Week context */}
        {weekDates.length > 0 && (() => {
          const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
          const first = weekDates[0];
          const last = weekDates[weekDates.length - 1];
          const monthLabel = first.month === last.month
            ? MONTHS[first.month]
            : `${MONTHS[first.month]} - ${MONTHS[last.month]}`;
          return (
            <View style={styles.weekContextBar}>
              <Ionicons name="calendar-outline" size={16} color={colors.gold} />
              <Text style={styles.weekContextText}>
                Semana del {first.dayNum} al {last.dayNum} de {monthLabel} {first.year}
              </Text>
            </View>
          );
        })()}
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'Agenda' && (
          <WeekCalendarView onDayPress={handleAgendaDayPress} compact />
        )}

        {activeTab === 'Disponibilidad' && (
          <>
            {/* Week strip with hours */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
              {weekDates.map((item) => {
                const avail = availability.find(a => a.day_of_week === item.dayOfWeek);
                const isSelected = item.dayOfWeek === selectedDayOfWeek;
                const hoursLabel = avail?.is_active
                  ? `${avail.start_time.slice(0, -3)}-${avail.end_time.slice(0, -3)}`
                  : 'Cerrado';
                return (
                  <TouchableOpacity
                    key={item.date}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedDayOfWeek(item.dayOfWeek)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>
                      {DAY_LABELS[item.dayOfWeek]} {item.dayNum}
                    </Text>
                    <Text style={[styles.dayHoursLabel, isSelected && styles.dayTextSelected]}>
                      {hoursLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Day Configuration */}
            <View style={styles.dayConfigCard}>
              {(() => {
                const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
                const sel = weekDates.find(w => w.dayOfWeek === selectedDayOfWeek);
                const dateStr = sel ? `${sel.dayNum} de ${MONTHS[sel.month]}` : '';
                return (
                  <>
                    <Text style={styles.dayConfigTitle}>
                      {DAY_LABELS_FULL[selectedDayOfWeek]} {dateStr} · configuración del día
                    </Text>
                    <Text style={styles.dayConfigDate}>{dateStr ? `Semana actual · ${sel?.year}` : ''}</Text>
                  </>
                );
              })()}
              <Text style={styles.dayConfigSubtitle}>Horario laboral</Text>

              <View style={styles.timeLabelsRow}>
                <TouchableOpacity
                  style={[styles.timeLabelBox, editingDayField === 'desde' && styles.timeLabelBoxActive]}
                  onPress={() => setEditingDayField('desde')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeSublabel, editingDayField === 'desde' && styles.timeSublabelActive]}>Desde</Text>
                  <Text style={[styles.timeLabelValue, editingDayField === 'desde' && styles.timeLabelValueActive]}>{editStart}</Text>
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color={colors.gray400} />
                <TouchableOpacity
                  style={[styles.timeLabelBox, editingDayField === 'hasta' && styles.timeLabelBoxActive]}
                  onPress={() => setEditingDayField('hasta')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeSublabel, editingDayField === 'hasta' && styles.timeSublabelActive]}>Hasta</Text>
                  <Text style={[styles.timeLabelValue, editingDayField === 'hasta' && styles.timeLabelValueActive]}>{editEnd}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.editingHint}>
                {editingDayField === 'desde' ? 'Selecciona hora de apertura' : 'Selecciona hora de cierre (máx 20:00)'}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.hourPicker} contentContainerStyle={{ gap: 4, paddingRight: spacing.md }}>
                {HOUR_OPTIONS.map(h => {
                  const isStart = h === editStart;
                  const isEnd = h === editEnd;
                  const isBetween = h > editStart && h < editEnd;
                  const isDisabled = editingDayField === 'hasta' && h <= editStart;
                  return (
                    <TouchableOpacity
                      key={`day_${h}`}
                      style={[
                        styles.hourChip,
                        isBetween && styles.hourChipBetween,
                        (isStart || isEnd) && styles.hourChipActive,
                        isDisabled && styles.hourChipDisabled,
                      ]}
                      disabled={isDisabled}
                      onPress={() => {
                        if (editingDayField === 'desde') {
                          setEditStart(h);
                          if (h >= editEnd) {
                            const nextIdx = HOUR_OPTIONS.indexOf(h) + 1;
                            if (nextIdx < HOUR_OPTIONS.length) setEditEnd(HOUR_OPTIONS[nextIdx]);
                          }
                          setEditingDayField('hasta');
                        } else {
                          setEditEnd(h);
                        }
                      }}
                    >
                      <Text style={[
                        styles.hourChipText,
                        (isStart || isEnd) && styles.hourChipTextActive,
                        isBetween && { color: colors.gray800 },
                        isDisabled && styles.hourChipTextDisabled,
                      ]}>{h}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Blocks for this day */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bloques del día</Text>
                <TouchableOpacity onPress={() => { setEditingField('desde'); setShowBlockModal(true); }}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.gold} />
                </TouchableOpacity>
              </View>
              {allBlocks.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyCard}
                  onPress={() => { setEditingField('desde'); setShowBlockModal(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyText}>Sin bloques · Toca + para agregar</Text>
                </TouchableOpacity>
              ) : (
                allBlocks.map(block => (
                  <TimeBlockCard key={block.id} block={block} />
                ))
              )}
            </View>

            {/* Weekly Preview Bar Chart */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Vista previa semanal</Text>
              {barData.map(bar => (
                <View key={bar.dow} style={styles.barRow}>
                  <Text style={styles.barLabel}>{bar.label}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(bar.hours / maxHours) * 100}%` },
                        bar.dow === selectedDayOfWeek && styles.barFillActive,
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Save button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>Guardar disponibilidad</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'Bloqueos' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Todos los bloques personales</Text>
              <TouchableOpacity onPress={() => { setEditingField('desde'); setShowBlockModal(true); }}>
                <Ionicons name="add-circle-outline" size={22} color={colors.gold} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>Comida, escuela, mandados y otros bloqueos</Text>
            {[...MOCK_TIME_BLOCKS, ...extraBlocks].map(block => (
              <TimeBlockCard key={block.id} block={block} />
            ))}
          </View>
        )}

        {activeTab === 'Incidencias' && (
          <IncidentsInlineView />
        )}
      </ScrollView>

      {/* Block Creation Modal */}
      <Modal visible={showBlockModal} animationType="slide" transparent onRequestClose={() => setShowBlockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo bloque</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: spacing.lg }}>
              {/* Type */}
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.modalLabel}>Tipo de bloque</Text>
                <View style={styles.typeGrid}>
                  {BLOCK_TYPE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.typeChip, blockType === opt.value && styles.typeChipActive]}
                      onPress={() => setBlockType(opt.value)}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={blockType === opt.value ? colors.black : colors.gray600} />
                      <Text style={[styles.typeChipText, blockType === opt.value && styles.typeChipTextActive]}>{opt.label}</Text>
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
              {/* Time */}
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
                  {HOUR_OPTIONS.map(h => {
                    const isStart = h === blockStart;
                    const isEnd = h === blockEnd;
                    const isBetween = h > blockStart && h < blockEnd;
                    const isDisabled = editingField === 'hasta' && h <= blockStart;
                    return (
                      <TouchableOpacity
                        key={`bh_${h}`}
                        style={[
                          styles.hourChip,
                          isBetween && styles.hourChipBetween,
                          isStart && styles.hourChipActive,
                          isEnd && styles.hourChipActive,
                          isDisabled && styles.hourChipDisabled,
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
                          styles.hourChipText,
                          (isStart || isEnd) && styles.hourChipTextActive,
                          isBetween && { color: colors.gray800 },
                          isDisabled && styles.hourChipTextDisabled,
                        ]}>{h}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBlockModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleCreateBlock} activeOpacity={0.8}>
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
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xl },
  // Week context
  weekContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.card,
  },
  weekContextText: { ...typography.body, color: colors.gray700 },
  // Tabs
  tabsRow: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tabActive: { backgroundColor: colors.black, borderColor: colors.black },
  tabText: { ...typography.buttonSmall, color: colors.gray600 },
  tabTextActive: { color: colors.white },
  // Week strip
  weekStrip: { flexDirection: 'row', gap: spacing.sm },
  dayCell: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    minWidth: 56,
    ...shadows.card,
  },
  dayCellSelected: { backgroundColor: colors.black },
  dayLabel: { ...typography.caption, color: colors.gray600, marginBottom: spacing.xxs },
  dayHoursLabel: { ...typography.caption, color: colors.gray800, fontWeight: '600', fontSize: 11 },
  dayTextSelected: { color: colors.white },
  // Day config
  dayConfigCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  dayConfigTitle: { ...typography.h3, color: colors.gray900 },
  dayConfigDate: { ...typography.caption, color: colors.gray500, marginTop: -spacing.xs },
  dayConfigSubtitle: { ...typography.caption, color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  hourPicker: { maxHeight: 38, marginTop: spacing.xs },
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    marginRight: spacing.xs,
  },
  hourChipActive: { backgroundColor: colors.gold },
  hourChipText: { ...typography.caption, color: colors.gray700 },
  hourChipTextActive: { color: colors.black, fontWeight: '600' },
  // Sections
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.gray900 },
  sectionSubtitle: { ...typography.bodySmall, color: colors.gray600, marginTop: -spacing.sm },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyText: { ...typography.body, color: colors.gray500 },
  // Bar chart
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.card,
  },
  previewTitle: { ...typography.h3, color: colors.gray900, marginBottom: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...typography.caption, color: colors.gray600, width: 30 },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.gray100,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    opacity: 0.6,
  },
  barFillActive: { opacity: 1 },
  // Save
  saveButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveButtonText: { ...typography.button, color: colors.white },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '80%',
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
  modalTitle: { ...typography.h3, color: colors.gray900 },
  modalScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  modalLabel: { ...typography.caption, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray900,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  typeChipActive: { backgroundColor: colors.gold + '20', borderColor: colors.gold },
  typeChipText: { ...typography.bodySmall, color: colors.gray600 },
  typeChipTextActive: { color: colors.black, fontWeight: '600' },
  timeSublabel: { ...typography.caption, color: colors.gray500 },
  timeSublabelActive: { color: colors.gold, fontWeight: '600' },
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
  editingHint: {
    ...typography.caption,
    color: colors.gold,
    textAlign: 'center',
  },
  hourChipBetween: { backgroundColor: colors.gold + '15' },
  hourChipDisabled: { backgroundColor: colors.gray50, opacity: 0.4 },
  hourChipTextDisabled: { color: colors.gray400 },
  modalActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: { ...typography.subtitle, color: colors.gray600 },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCreateText: { ...typography.subtitle, color: colors.black },
});
