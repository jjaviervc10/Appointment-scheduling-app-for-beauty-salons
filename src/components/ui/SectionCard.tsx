import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../../theme';

interface Props {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SectionCard({ title, children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    ...typography.h3,
    color: colors.gray900,
    marginBottom: spacing.md,
  },
});
