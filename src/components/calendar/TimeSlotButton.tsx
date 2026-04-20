import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../../theme';
import type { TimeSlot } from '../../types/models';

interface Props {
  slot: TimeSlot;
  isSelected: boolean;
  onPress: () => void;
}

export function TimeSlotButton({ slot, isSelected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isSelected && styles.selectedText]}>
        {slot.startTime}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: 80,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  text: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  selectedText: {
    color: colors.white,
  },
});
