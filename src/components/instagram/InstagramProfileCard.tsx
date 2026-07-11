import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { colors, spacing, typography } from '../../theme';
import type { InstagramProfile } from '../../types/instagram.types';

interface Props {
  profile: InstagramProfile;
}

export function InstagramProfileCard({ profile }: Props) {
  return (
    <SectionCard title="Perfil de Instagram">
      <View style={styles.row}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-circle-outline" size={36} color={colors.gold} />
        </View>
        <View style={styles.info}>
          <Text style={styles.username}>@{profile.username}</Text>
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.statusText}>Cuenta conectada</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={1}>{profile.userId}</Text>
          <Text style={styles.statLabel}>User ID</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={1}>{profile.id}</Text>
          <Text style={styles.statLabel}>Perfil</Text>
        </View>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  username: {
    ...typography.h3,
    color: colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
});
