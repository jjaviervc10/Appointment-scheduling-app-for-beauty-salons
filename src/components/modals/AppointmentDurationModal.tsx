import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { colors, radii, spacing, typography } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';

interface Props {
  visible: boolean;
  appointment: AppointmentViewModel | null;
  startAt?: Date | null;
  initialDurationMinutes?: number;
  baseDurationMinutes?: number;
  title?: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (durationMinutes: number) => void;
}

const QUICK_OPTIONS = [20, 30, 45, 60, 90];
const MIN_DURATION = 10;
const MAX_DURATION = 240;
const STEP_DURATION = 5;

function clampInitialDuration(value?: number): number {
  if (!value || !Number.isFinite(value)) return 30;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(value / STEP_DURATION) * STEP_DURATION));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AppointmentDurationModal({
  visible,
  appointment,
  startAt,
  initialDurationMinutes,
  baseDurationMinutes,
  title = 'Duración de la cita',
  confirmLabel = 'Confirmar duración',
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const defaultDuration = appointment?.durationMinutes ?? initialDurationMinutes;
  const [manualValue, setManualValue] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(() => clampInitialDuration(defaultDuration));

  useEffect(() => {
    if (!visible) return;
    const next = clampInitialDuration(appointment?.durationMinutes ?? initialDurationMinutes ?? baseDurationMinutes);
    setSelectedDuration(next);
    setManualValue(String(next));
  }, [appointment?.durationMinutes, baseDurationMinutes, initialDurationMinutes, visible]);

  const effectiveStartAt = startAt ?? appointment?.startAt ?? null;
  const effectiveBaseDuration = baseDurationMinutes ?? appointment?.serviceDurationMinutes ?? appointment?.durationMinutes ?? selectedDuration;

  const endAtLabel = useMemo(() => {
    if (!effectiveStartAt) return '--:--';
    return formatTime(new Date(effectiveStartAt.getTime() + selectedDuration * 60 * 1000));
  }, [effectiveStartAt, selectedDuration]);

  const error = useMemo(() => {
    if (!Number.isFinite(selectedDuration)) return 'Escribe una duración válida.';
    if (selectedDuration < MIN_DURATION) return `Mínimo ${MIN_DURATION} min.`;
    if (selectedDuration > MAX_DURATION) return `Máximo ${MAX_DURATION} min.`;
    if (selectedDuration % STEP_DURATION !== 0) return `Usa múltiplos de ${STEP_DURATION} min.`;
    return null;
  }, [selectedDuration]);

  const handleManualChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setManualValue(cleaned);
    setSelectedDuration(Number(cleaned));
  };

  const handleQuickSelect = (minutes: number) => {
    setSelectedDuration(minutes);
    setManualValue(String(minutes));
  };

  if (!appointment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="time-outline" size={20} color={colors.gold} />
              </View>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={isSubmitting} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.summaryCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(appointment.clientName)}</Text>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.clientName} numberOfLines={1}>{appointment.clientName}</Text>
                <Text style={styles.serviceName} numberOfLines={1}>{appointment.serviceName}</Text>
                <Text style={styles.metaLine}>
                  Inicio {effectiveStartAt ? formatTime(effectiveStartAt) : '--:--'} · Base {effectiveBaseDuration} min
                </Text>
              </View>
            </View>

            <View style={styles.timePreview}>
              <View>
                <Text style={styles.previewLabel}>Duración</Text>
                <Text style={styles.previewValue}>{selectedDuration || 0} min</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.gray500} />
              <View style={styles.previewEnd}>
                <Text style={styles.previewLabel}>Termina aprox.</Text>
                <Text style={styles.previewValue}>{endAtLabel}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Rápido</Text>
            <View style={styles.quickGrid}>
              {QUICK_OPTIONS.map((minutes) => {
                const selected = selectedDuration === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.quickButton, selected && styles.quickButtonSelected]}
                    onPress={() => handleQuickSelect(minutes)}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.quickText, selected && styles.quickTextSelected]}>{minutes}</Text>
                    <Text style={[styles.quickUnit, selected && styles.quickTextSelected]}>min</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Manual</Text>
            <View style={[styles.inputWrap, error && styles.inputWrapError]}>
              <TextInput
                style={styles.input}
                value={manualValue}
                onChangeText={handleManualChange}
                placeholder="Ej. 45"
                placeholderTextColor={colors.gray500}
                keyboardType="number-pad"
                editable={!isSubmitting}
                maxLength={3}
              />
              <Text style={styles.inputSuffix}>min</Text>
            </View>
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, (isSubmitting || !!error) && styles.buttonDisabled]}
              onPress={() => onConfirm(selectedDuration)}
              disabled={isSubmitting || !!error}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color={colors.black} />
              )}
              <Text style={styles.confirmText}>{isSubmitting ? 'Guardando...' : confirmLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  cardMobile: {
    maxHeight: '96%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontSize: 17,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.gray800,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  clientName: {
    ...typography.subtitle,
    color: colors.white,
    fontSize: 15,
  },
  serviceName: {
    ...typography.bodySmall,
    color: colors.gray300,
  },
  metaLine: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
    backgroundColor: colors.gold + '10',
  },
  previewEnd: {
    alignItems: 'flex-end',
  },
  previewLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  previewValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickButton: {
    flexGrow: 1,
    minWidth: 88,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray800,
  },
  quickButtonSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  quickText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  quickUnit: {
    color: colors.gray400,
    fontSize: 11,
    fontWeight: '700',
  },
  quickTextSelected: {
    color: colors.black,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray700,
    backgroundColor: colors.gray800,
    paddingHorizontal: spacing.md,
  },
  inputWrapError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: spacing.md,
  },
  inputSuffix: {
    color: colors.gray400,
    fontSize: 14,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    ...typography.buttonSmall,
    color: colors.gray400,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  confirmText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
