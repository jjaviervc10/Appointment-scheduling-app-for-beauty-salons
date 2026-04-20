import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  onSearch?: () => void;
  onNewAppointment?: () => void;
  rightContent?: React.ReactNode;
}

export function TopHeader({ title, subtitle, onSearch, onNewAppointment, rightContent }: TopHeaderProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={[styles.left, isMobile && styles.leftMobile]}>
        <Image
          source={require('../../../assets/LogoJL.png')}
          style={[styles.logo, isMobile && styles.logoMobile]}
          resizeMode="contain"
        />
        <View style={styles.titleGroup}>
          <Text style={[styles.title, isMobile && styles.titleMobile]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightContent}
        {onSearch && (
          <TouchableOpacity style={[styles.iconBtn, isMobile && styles.iconBtnMobile]} onPress={onSearch} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={isMobile ? 18 : 20} color={colors.gray700} />
          </TouchableOpacity>
        )}
        {onNewAppointment && (
          <TouchableOpacity style={[styles.newBtn, isMobile && styles.newBtnMobile]} onPress={onNewAppointment} activeOpacity={0.7}>
            <Ionicons name="add" size={isMobile ? 16 : 18} color={colors.black} />
            {!isMobile && <Text style={styles.newBtnText}>Nueva cita</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  containerMobile: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  leftMobile: {},
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  logoMobile: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.h2,
    color: colors.white,
    fontSize: 20,
  },
  titleMobile: {
    fontSize: 17,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.gold,
  },
  subtitleMobile: {
    fontSize: 11,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnMobile: {
    width: 36,
    height: 36,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  newBtnMobile: {
    width: 36,
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    borderRadius: 18,
  },
  newBtnText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
});
