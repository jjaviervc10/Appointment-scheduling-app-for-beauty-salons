import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface Props {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({ title, message, icon = 'calendar-outline' }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.gray300} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.huge,
  },
  title: {
    ...typography.h3,
    color: colors.gray700,
    marginTop: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
