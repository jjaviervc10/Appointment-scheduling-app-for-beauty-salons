import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BLOCK_TYPES = [
  { key: 'comida', label: 'Comida', icon: 'restaurant' as const, color: '#FF9800' },
  { key: 'escuela', label: 'Escuela hijos', icon: 'school' as const, color: '#42A5F5' },
  { key: 'descanso', label: 'Descanso', icon: 'bed' as const, color: '#66BB6A' },
  { key: 'mandado', label: 'Mandado', icon: 'car' as const, color: '#AB47BC' },
  { key: 'otro', label: 'Otro', icon: 'ellipsis-horizontal' as const, color: colors.gray600 },
];

function clampHour(v: string): string {
  const n = parseInt(v, 10);
  if (isNaN(n)) return '';
  if (n < 1) return '1';
  if (n > 12) return '12';
  return String(n);
}
function clampMinute(v: string): string {
  const n = parseInt(v, 10);
  if (isNaN(n)) return '';
  if (n < 0) return '00';
  if (n > 59) return '59';
  return v.length === 1 ? v : String(n).padStart(2, '0');
}

export function BlockTimeModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [startHourText, setStartHourText] = useState('1');
  const [startMinText, setStartMinText] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('PM');
  const [endHourText, setEndHourText] = useState('2');
  const [endMinText, setEndMinText] = useState('00');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);

  const blockType = BLOCK_TYPES.find(t => t.key === selectedType);

  const displayStart = `${startHourText || '12'}:${startMinText || '00'} ${startPeriod}`;
  const displayEnd = `${endHourText || '12'}:${endMinText || '00'} ${endPeriod}`;

  const handleCreate = () => {
    const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    Alert.alert(
      '🔒 Bloqueo creado (simulación)',
      `Tipo: ${blockType?.label}\nFecha: ${today}\nHorario: ${displayStart} – ${displayEnd}\nEtiqueta: ${label || blockType?.label}\n${recurring ? '🔄 Recurrente' : '📅 Solo hoy'}`,
      [{ text: 'OK', onPress: onClose }],
    );
    resetForm();
  };

  const resetForm = () => {
    setSelectedType(null);
    setStartHourText('1');
    setStartMinText('00');
    setStartPeriod('PM');
    setEndHourText('2');
    setEndMinText('00');
    setEndPeriod('PM');
    setLabel('');
    setNotes('');
    setRecurring(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Header */}
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
            {/* Block type */}
            <Text style={styles.sectionTitle}>Tipo de bloqueo</Text>
            <View style={styles.typeGrid}>
              {BLOCK_TYPES.map(t => {
                const isSelected = selectedType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeCard, isSelected && { borderColor: t.color, backgroundColor: `${t.color}10` }]}
                    onPress={() => {
                      setSelectedType(t.key);
                      if (!label) setLabel(t.label);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: `${t.color}20` }]}>
                      <Ionicons name={t.icon} size={22} color={t.color} />
                    </View>
                    <Text style={[styles.typeLabel, isSelected && { color: t.color, fontWeight: '600' }]}>
                      {t.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.typeCheck, { backgroundColor: t.color }]}>
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time */}
            <Text style={styles.sectionTitle}>Horario</Text>
            <View style={styles.timeSection}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Inicio</Text>
                <View style={styles.manualTimeRow}>
                  <View style={styles.timeInputGroup}>
                    <TextInput
                      style={styles.timeInput}
                      value={startHourText}
                      onChangeText={(v) => setStartHourText(clampHour(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="HH"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={startMinText}
                      onChangeText={(v) => setStartMinText(clampMinute(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      style={[styles.periodBtn, startPeriod === 'AM' && styles.periodBtnActive]}
                      onPress={() => setStartPeriod('AM')}
                    >
                      <Text style={[styles.periodText, startPeriod === 'AM' && styles.periodTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodBtn, startPeriod === 'PM' && styles.periodBtnActive]}
                      onPress={() => setStartPeriod('PM')}
                    >
                      <Text style={[styles.periodText, startPeriod === 'PM' && styles.periodTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Fin</Text>
                <View style={styles.manualTimeRow}>
                  <View style={styles.timeInputGroup}>
                    <TextInput
                      style={styles.timeInput}
                      value={endHourText}
                      onChangeText={(v) => setEndHourText(clampHour(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="HH"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={endMinText}
                      onChangeText={(v) => setEndMinText(clampMinute(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      style={[styles.periodBtn, endPeriod === 'AM' && styles.periodBtnActiveEnd]}
                      onPress={() => setEndPeriod('AM')}
                    >
                      <Text style={[styles.periodText, endPeriod === 'AM' && styles.periodTextActiveEnd]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodBtn, endPeriod === 'PM' && styles.periodBtnActiveEnd]}
                      onPress={() => setEndPeriod('PM')}
                    >
                      <Text style={[styles.periodText, endPeriod === 'PM' && styles.periodTextActiveEnd]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Label */}
            <Text style={styles.fieldLabel}>Etiqueta</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Comida, Junta de padres..."
              placeholderTextColor={colors.gray400}
              value={label}
              onChangeText={setLabel}
            />

            {/* Notes */}
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

            {/* Recurring toggle */}
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
                  {recurring ? 'Se bloqueará todos los mismos días' : 'Solo se bloqueará hoy'}
                </Text>
              </View>
              <View style={[styles.toggleTrack, recurring && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, recurring && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCreate, !selectedType && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!selectedType}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed" size={18} color={colors.white} />
              <Text style={styles.btnCreateText}>Bloquear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  typeLabel: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
  },
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
  timeSection: {
    gap: spacing.md,
  },
  timeBlock: {
    gap: spacing.xs,
  },
  timeLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
  },
  manualTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
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
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray400,
  },
  periodToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  periodBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray900,
  },
  periodBtnActive: {
    backgroundColor: colors.gold,
  },
  periodBtnActiveEnd: {
    backgroundColor: colors.gray800,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
  },
  periodTextActive: {
    color: colors.black,
  },
  periodTextActiveEnd: {
    color: colors.white,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
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
  recurringToggleActive: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}08`,
  },
  recurringInfo: {
    flex: 1,
  },
  recurringLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.gray400,
  },
  recurringLabelActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  recurringSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.gold,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
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
  btnCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  btnCancelText: {
    ...typography.buttonSmall,
    color: colors.gray400,
  },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray800,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnCreateText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
