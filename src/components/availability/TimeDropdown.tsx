import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Converts "14:30" → "2:30 PM". Works for any HH:mm string. */
export function format12h(time24: string): string {
  const [hStr = '00', mStr = '00'] = time24.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${period}`;
}

/** Generates slots every 15 min between startH:00 and endH:00 (inclusive). */
export function generateSlots(startH: number, endH: number): string[] {
  const slots: string[] = [];
  for (let h = startH; h <= endH; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endH && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

/** All valid display slots: 09:00 – 20:00 every 15 min (45 total). */
export const ALL_TIME_SLOTS = generateSlots(9, 20);

const ITEM_HEIGHT = 44;

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeDropdownProps {
  value: string;
  onChange: (time: string) => void;
  slots: string[];
  disabled?: boolean;
  label?: string;
}

export function TimeDropdown({
  value,
  onChange,
  slots,
  disabled = false,
  label,
}: TimeDropdownProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (open && value && scrollRef.current) {
      const idx = slots.indexOf(value);
      if (idx >= 0) {
        const timer = setTimeout(() => {
          scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
        }, 60);
        return () => clearTimeout(timer);
      }
    }
  }, [open, value, slots]);

  const displayText = value ? format12h(value) : '—';

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled}
      >
        <Ionicons
          name="time-outline"
          size={15}
          color={disabled ? colors.gray600 : colors.gray400}
        />
        <Text style={[styles.triggerText, disabled && styles.triggerTextDisabled]}>
          {displayText}
        </Text>
        <Ionicons
          name="chevron-down"
          size={15}
          color={disabled ? colors.gray600 : colors.gray500}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          {/* Prevent backdrop tap from closing when touching the card */}
          <View
            style={styles.card}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{label ?? 'Seleccionar hora'}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.gray400} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.slotList}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {slots.map((slot) => {
                const active = slot === value;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotRow, active && styles.slotRowActive]}
                    onPress={() => {
                      onChange(slot);
                      setOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>
                      {format12h(slot)}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={16} color={colors.gold} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  triggerDisabled: {
    backgroundColor: colors.gray900,
    borderColor: colors.gray800,
    opacity: 0.5,
  },
  triggerText: {
    ...typography.body,
    color: colors.white,
    flex: 1,
    fontWeight: '500',
  },
  triggerTextDisabled: { color: colors.gray500 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray700,
    width: 220,
    maxHeight: 360,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  cardTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  slotList: { maxHeight: 310 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: ITEM_HEIGHT,
  },
  slotRowActive: { backgroundColor: colors.gold + '18' },
  slotText: { ...typography.body, color: colors.gray300, fontSize: 14 },
  slotTextActive: { color: colors.gold, fontWeight: '600' },
});
