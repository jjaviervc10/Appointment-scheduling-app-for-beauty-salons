import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { createTimeBlock } from '../../services/availability';
import { formatLocalDateKey } from '../../utils/date';
import type { TimeBlock } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BLOCK_TYPES = [
  { key: 'personal', label: 'Personal', icon: 'person' as const, color: '#42A5F5' },
  { key: 'comida', label: 'Comida', icon: 'restaurant' as const, color: '#FF9800' },
  { key: 'descanso', label: 'Descanso', icon: 'bed' as const, color: '#66BB6A' },
  { key: 'mandado', label: 'Mandado', icon: 'car' as const, color: '#AB47BC' },
  { key: 'otro', label: 'Otro', icon: 'ellipsis-horizontal' as const, color: colors.gray600 },
];

function clampHour(value: string): string {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return '';
  if (n < 1) return '1';
  if (n > 12) return '12';
  return String(n);
}

function clampMinute(value: string): string {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return '';
  if (n < 0) return '00';
  if (n > 59) return '59';
  return value.length === 1 ? value : String(n).padStart(2, '0');
}

function to24h(hourText: string, minuteText: string, period: 'AM' | 'PM'): string {
  let hour = parseInt(hourText || '12', 10);
  const minute = clampMinute(minuteText || '00').padStart(2, '0');
  if (Number.isNaN(hour) || hour < 1 || hour > 12) hour = 12;
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function minutesOfDay(time: string): number {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

export function BlockTimeModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedType, setSelectedType] = useState<string | null>('personal');
  const [startHourText, setStartHourText] = useState('1');
  const [startMinText, setStartMinText] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('PM');
  const [endHourText, setEndHourText] = useState('2');
  const [endMinText, setEndMinText] = useState('00');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [label, setLabel] = useState('Personal');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [dateText, setDateText] = useState(() => formatLocalDateKey(new Date()));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const blockType = useMemo(
    () => BLOCK_TYPES.find((type) => type.key === selectedType) ?? BLOCK_TYPES[0],
    [selectedType]
  );

  const startTime = to24h(startHourText, startMinText, startPeriod);
  const endTime = to24h(endHourText, endMinText, endPeriod);
  const invalidRange = minutesOfDay(startTime) >= minutesOfDay(endTime);

  const resetForm = () => {
    setSelectedType('personal');
    setStartHourText('1');
    setStartMinText('00');
    setStartPeriod('PM');
    setEndHourText('2');
    setEndMinText('00');
    setEndPeriod('PM');
    setLabel('Personal');
    setNotes('');
    setRecurring(false);
    setDateText(formatLocalDateKey(new Date()));
    setSubmitError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!blockType) return;
    if (invalidRange) {
      setSubmitError('La hora de fin debe ser mayor que la hora de inicio.');
      return;
    }

    const resolvedDate = recurring ? formatLocalDateKey(new Date()) : dateText.trim();
    if (!recurring && !/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      setSubmitError('Ingresa una fecha valida en formato AAAA-MM-DD.');
      return;
    }

    setSubmitError(null);
    const block: Omit<TimeBlock, 'id' | 'created_at'> = {
      owner_id: '',
      block_type: blockType.key as TimeBlock['block_type'],
      label: label.trim() || blockType.label,
      date: resolvedDate,
      start_time: startTime,
      end_time: endTime,
      is_recurring: recurring,
      recurrence_day_of_week: recurring
        ? new Date().getDay() as TimeBlock['recurrence_day_of_week']
        : null,
      notes: notes.trim() || null,
    };

    try {
      await createTimeBlock(block);
      resetForm();
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('overlap')) {
        setSubmitError('Conflicto: existe una cita activa en ese horario. Elige otro rango o cancela primero la cita.');
      } else {
        setSubmitError(msg || 'No se pudo guardar el bloqueo. Intenta de nuevo.');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="lock-closed" size={20} color={colors.gray800} />
              </View>
              <Text style={styles.headerTitle}>Bloquear horario</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.sectionTitle}>Tipo de bloqueo</Text>
            <View style={styles.typeGrid}>
              {BLOCK_TYPES.map((type) => {
                const isSelected = selectedType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeCard, isSelected && { borderColor: type.color, backgroundColor: `${type.color}10` }]}
                    onPress={() => {
                      setSelectedType(type.key);
                      setLabel((current) => current.trim() ? current : type.label);
                      setSubmitError(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                      <Ionicons name={type.icon} size={22} color={type.color} />
                    </View>
                    <Text style={[styles.typeLabel, isSelected && { color: type.color, fontWeight: '600' }]}>
                      {type.label}
                    </Text>
                    {isSelected ? (
                      <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Horario</Text>
            <View style={styles.timeSection}>
              <TimeInput
                label="Inicio"
                hour={startHourText}
                minute={startMinText}
                period={startPeriod}
                onHourChange={setStartHourText}
                onMinuteChange={setStartMinText}
                onPeriodChange={setStartPeriod}
              />
              <TimeInput
                label="Fin"
                hour={endHourText}
                minute={endMinText}
                period={endPeriod}
                onHourChange={setEndHourText}
                onMinuteChange={setEndMinText}
                onPeriodChange={setEndPeriod}
                endTone
              />
            </View>

            <Text style={styles.fieldLabel}>Etiqueta</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Comida, Junta de padres..."
              placeholderTextColor={colors.gray400}
              value={label}
              onChangeText={setLabel}
            />

            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Detalles adicionales..."
              placeholderTextColor={colors.gray400}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            {!recurring ? (
              <>
                <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2026-06-04"
                  placeholderTextColor={colors.gray400}
                  value={dateText}
                  onChangeText={(v) => { setDateText(v); setSubmitError(null); }}
                  maxLength={10}
                />
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.recurringToggle, recurring && styles.recurringToggleActive]}
              onPress={() => setRecurring(!recurring)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={recurring ? 'repeat' : 'repeat-outline'}
                size={20}
                color={recurring ? colors.gold : colors.gray500}
              />
              <View style={styles.recurringInfo}>
                <Text style={[styles.recurringLabel, recurring && styles.recurringLabelActive]}>
                  Repetir cada semana
                </Text>
                <Text style={styles.recurringSub}>
                  {recurring ? 'Se bloqueara cada semana en este dia' : `Solo para el ${dateText || 'dia seleccionado'}`}
                </Text>
              </View>
              <View style={[styles.toggleTrack, recurring && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, recurring && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {submitError ? (
              <View style={styles.submitError}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCreate, (!selectedType || invalidRange) && styles.btnDisabled]}
              onPress={() => void handleCreate()}
              disabled={!selectedType || invalidRange}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed" size={18} color={colors.white} />
              <Text style={styles.btnCreateText}>Guardar bloqueo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimeInput({
  label,
  hour,
  minute,
  period,
  endTone = false,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: {
  label: string;
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
  endTone?: boolean;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  onPeriodChange: (value: 'AM' | 'PM') => void;
}) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.manualTimeRow}>
        <View style={styles.timeInputGroup}>
          <TextInput
            style={styles.timeInput}
            value={hour}
            onChangeText={(value) => onHourChange(clampHour(value.replace(/[^0-9]/g, '')))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="HH"
            placeholderTextColor={colors.gray400}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={minute}
            onChangeText={(value) => onMinuteChange(clampMinute(value.replace(/[^0-9]/g, '')))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="MM"
            placeholderTextColor={colors.gray400}
          />
        </View>
        <View style={styles.periodToggle}>
          {(['AM', 'PM'] as const).map((item) => {
            const active = period === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.periodBtn, active && (endTone ? styles.periodBtnActiveEnd : styles.periodBtnActive)]}
                onPress={() => onPeriodChange(item)}
              >
                <Text style={[styles.periodText, active && (endTone ? styles.periodTextActiveEnd : styles.periodTextActive)]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  cardMobile: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.white },
  body: { flex: 1 },
  bodyContent: { padding: spacing.xl, gap: spacing.md },
  sectionTitle: { ...typography.subtitle, color: colors.white, marginBottom: spacing.xs },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '30%',
    minWidth: 90,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.xs,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: { ...typography.bodySmall, color: colors.gray400, textAlign: 'center' },
  typeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSection: { gap: spacing.md },
  timeBlock: { gap: spacing.xs },
  timeLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.gray400 },
  manualTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  timeInputGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeInput: {
    width: 52,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  timeSeparator: { fontSize: 20, fontWeight: '700', color: colors.gray400 },
  periodToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  periodBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.gray900 },
  periodBtnActive: { backgroundColor: colors.gold },
  periodBtnActiveEnd: { backgroundColor: colors.gray800 },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.gray500 },
  periodTextActive: { color: colors.black },
  periodTextActiveEnd: { color: colors.white },
  fieldLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.gray400, marginTop: spacing.sm },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  recurringToggleActive: { borderColor: colors.gold, backgroundColor: `${colors.gold}08` },
  recurringInfo: { flex: 1 },
  recurringLabel: { ...typography.body, fontWeight: '500', color: colors.gray400 },
  recurringLabelActive: { color: colors.gold, fontWeight: '600' },
  recurringSub: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: { backgroundColor: colors.gold },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '14',
  },
  submitErrorText: { ...typography.bodySmall, flex: 1, color: colors.error },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
    gap: spacing.md,
  },
  btnCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  btnCancelText: { ...typography.buttonSmall, color: colors.gray400 },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray800,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnDisabled: { opacity: 0.4 },
  btnCreateText: { ...typography.buttonSmall, color: colors.white },
});
