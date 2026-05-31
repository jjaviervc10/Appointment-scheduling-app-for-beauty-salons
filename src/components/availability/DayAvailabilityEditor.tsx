import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { WeeklyAvailability } from '../../types/database';
import { TimeDropdown, ALL_TIME_SLOTS } from './TimeDropdown';

// ─── Business rules ───────────────────────────────────────────────────────────

const MIN_START = '09:00';
const MAX_END = '20:00';

/** Clamps a time string to the nearest slot within [MIN_START, MAX_END]. */
function clampToSlot(time: string): string {
  const all = ALL_TIME_SLOTS;
  if (all.includes(time)) return time;

  // If outside range, clamp to bounds
  if (time < MIN_START) return MIN_START;
  if (time > MAX_END) return MAX_END;

  // Round to nearest slot
  const [hStr = '0', mStr = '0'] = time.split(':');
  const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

  let nearest = all[0] ?? MIN_START;
  let minDiff = Infinity;
  for (const slot of all) {
    const [sh = '0', sm = '0'] = slot.split(':');
    const diff = Math.abs(parseInt(sh, 10) * 60 + parseInt(sm, 10) - totalMins);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = slot;
    }
  }
  return nearest;
}

function validate(
  isActive: boolean,
  startTime: string,
  endTime: string,
): string | null {
  if (!isActive) return null;
  if (startTime < MIN_START)
    return 'La hora de inicio no puede ser antes de las 9:00 AM.';
  if (endTime > MAX_END)
    return 'La hora de fin no puede ser después de las 8:00 PM.';
  if (startTime >= endTime)
    return 'La hora de inicio debe ser menor que la hora de fin.';
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayPatch = {
  isActive: boolean;
  startTime: string;
  endTime: string;
};

interface DayAvailabilityEditorProps {
  day: WeeklyAvailability;
  dayFullName: string;
  dateLabel: string;
  onSave: (patch: DayPatch) => void;
  onApplyToAll: (patch: DayPatch) => void;
  onClose: () => void;
  isSaving: boolean;
  saveError?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DayAvailabilityEditor({
  day,
  dayFullName,
  dateLabel,
  onSave,
  onApplyToAll,
  onClose,
  isSaving,
  saveError,
}: DayAvailabilityEditorProps) {
  const [isActive, setIsActive] = useState(day.is_active);
  const [startTime, setStartTime] = useState(clampToSlot(day.start_time));
  const [endTime, setEndTime] = useState(clampToSlot(day.end_time));

  // Re-initialize draft when the edited day changes
  useEffect(() => {
    setIsActive(day.is_active);
    setStartTime(clampToSlot(day.start_time));
    setEndTime(clampToSlot(day.end_time));
  }, [day.day_of_week, day.is_active, day.start_time, day.end_time]);

  // Start slots: 09:00 to 19:45
  const startSlots = ALL_TIME_SLOTS.filter((s) => s <= '19:45');
  // End slots: must be strictly after selected start
  const endSlots = ALL_TIME_SLOTS.filter((s) => s > startTime);

  function handleStartChange(t: string) {
    setStartTime(t);
    // If current end is no longer valid, advance it to next available slot
    if (endTime <= t) {
      const next = ALL_TIME_SLOTS.find((s) => s > t);
      setEndTime(next ?? MAX_END);
    }
  }

  const patch: DayPatch = { isActive, startTime, endTime };
  const validationError = validate(isActive, startTime, endTime);
  const canSave = !validationError && !isSaving;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Editar disponibilidad</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.gray500} />
            <Text style={styles.subtitle}>
              {dayFullName}, {dateLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estado toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Estado</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isActive && styles.toggleBtnAvailable]}
              onPress={() => setIsActive(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.toggleText, isActive && styles.toggleTextActive]}
              >
                Disponible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isActive && styles.toggleBtnClosed]}
              onPress={() => setIsActive(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  !isActive && styles.toggleTextActive,
                ]}
              >
                Cerrado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time pickers */}
        <View style={[styles.section, !isActive && styles.sectionDisabled]}>
          <TimeDropdown
            label="Hora de inicio"
            value={startTime}
            onChange={handleStartChange}
            slots={startSlots}
            disabled={!isActive}
          />
        </View>

        <View style={[styles.section, !isActive && styles.sectionDisabled]}>
          <TimeDropdown
            label="Hora de fin"
            value={endTime}
            onChange={setEndTime}
            slots={endSlots}
            disabled={!isActive}
          />
        </View>

        {/* Helper text */}
        {isActive ? (
          <View style={styles.helperBanner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.info}
            />
            <Text style={styles.helperText}>
              Tu horario base permite trabajar entre{' '}
              <Text style={styles.helperBold}>9:00 AM</Text> y{' '}
              <Text style={styles.helperBold}>8:00 PM</Text>
            </Text>
          </View>
        ) : null}

        {/* Validation error */}
        {validationError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        ) : null}

        {/* Save error from backend */}
        {saveError && !validationError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Acciones rápidas</Text>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => onApplyToAll(patch)}
            activeOpacity={0.8}
            disabled={isSaving || !!validationError}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.gray300}
            />
            <Text style={styles.quickBtnText}>Aplicar a toda la semana</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer: save button always visible */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={() => canSave && onSave(patch)}
          activeOpacity={0.85}
          disabled={!canSave}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={canSave ? colors.black : colors.gray500}
            />
          )}
          <Text
            style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray800,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerText: { flex: 1, gap: spacing.xs },
  title: { ...typography.subtitle, color: colors.white },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subtitle: { ...typography.caption, color: colors.gray500 },
  closeBtn: { padding: spacing.xs },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionDisabled: { opacity: 0.45, pointerEvents: 'none' },
  sectionLabel: {
    ...typography.caption,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray800,
    alignItems: 'center',
  },
  toggleBtnAvailable: {
    backgroundColor: '#1B4D1E',
    borderColor: '#4CAF50',
  },
  toggleBtnClosed: {
    backgroundColor: colors.gray700,
    borderColor: colors.gray600,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.gray500,
    fontWeight: '600',
  },
  toggleTextActive: { color: colors.white },
  helperBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '14',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.gray400,
    flex: 1,
    lineHeight: 18,
  },
  helperBold: { color: colors.white, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.error + '14',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  quickBtnText: { ...typography.bodySmall, color: colors.gray300 },
  footer: { padding: spacing.lg, paddingTop: 0 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  saveBtnDisabled: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  saveBtnText: { ...typography.button, color: colors.black },
  saveBtnTextDisabled: { color: colors.gray500 },
});
