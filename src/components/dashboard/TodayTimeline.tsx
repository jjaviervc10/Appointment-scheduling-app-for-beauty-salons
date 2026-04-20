import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { statusColors, statusLabels } from '../../theme';
import type { AppointmentViewModel } from '../../types/models';
import type { TimeBlock } from '../../types/database';

interface TodayTimelineProps {
  appointments: AppointmentViewModel[];
  blocks: TimeBlock[];
  onAppointmentPress: (id: string) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;

export function TodayTimeline({ appointments, blocks, onAppointmentPress }: TodayTimelineProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const HOUR_HEIGHT = isMobile ? 48 : 60;
  const LEFT_GUTTER = isMobile ? 42 : 56;

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const getTopOffset = (time: Date | string) => {
    let h: number, m: number;
    if (typeof time === 'string') {
      [h, m] = time.split(':').map(Number);
    } else {
      h = time.getHours();
      m = time.getMinutes();
    }
    return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  };

  const getBlockHeight = (durationMinutes: number) => {
    return (durationMinutes / 60) * HOUR_HEIGHT;
  };

  const getStatusColor = (status: string) => {
    const sc = statusColors[status as keyof typeof statusColors];
    return sc || { text: colors.gray600, bg: colors.gray200 };
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>Timeline del día</Text>
      </View>
      <View style={[styles.timeline, { paddingLeft: LEFT_GUTTER }]}>
        {/* Hour labels + grid lines */}
        {hours.map((hour) => (
          <View key={hour} style={[styles.hourRow, { top: (hour - START_HOUR) * HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { width: LEFT_GUTTER - 8 }]}>
              {String(hour).padStart(2, '0')}:00
            </Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {/* Time blocks (lunch, etc.) */}
        {blocks.map((block) => {
          const top = getTopOffset(block.start_time);
          const [sh, sm] = block.start_time.split(':').map(Number);
          const [eh, em] = block.end_time.split(':').map(Number);
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          const height = getBlockHeight(duration);

          return (
            <View
              key={block.id}
              style={[styles.blockItem, { top, height, backgroundColor: colors.gray200 + '80', left: LEFT_GUTTER }]}
            >
              <Text style={styles.blockLabel}>
                <Ionicons name="lock-closed" size={10} color={colors.gray500} /> {block.label}
              </Text>
            </View>
          );
        })}

        {/* Appointments */}
        {appointments.map((appt) => {
          const top = getTopOffset(appt.startAt);
          const height = Math.max(getBlockHeight(appt.durationMinutes), 36);
          const sc = getStatusColor(appt.status);

          return (
            <TouchableOpacity
              key={appt.id}
              style={[styles.apptBlock, { top, height, backgroundColor: sc.bg, borderLeftColor: sc.text, left: LEFT_GUTTER }]}
              onPress={() => onAppointmentPress(appt.id)}
              activeOpacity={0.7}
            >
              <View style={styles.apptContent}>
                <Text style={[styles.apptClient, { color: sc.text }]} numberOfLines={1}>
                  {appt.clientName}
                </Text>
                <Text style={styles.apptService} numberOfLines={1}>
                  {appt.serviceName} · {appt.startAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator startHour={START_HOUR} hourHeight={HOUR_HEIGHT} leftGutter={LEFT_GUTTER} />

        {/* Bottom spacer to ensure all hours are visible */}
        <View style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }} />
      </View>
    </View>
  );
}

function CurrentTimeIndicator({ startHour, hourHeight, leftGutter }: { startHour: number; hourHeight: number; leftGutter: number }) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < startHour || h > 20) return null;
  const top = (h - startHour) * hourHeight + (m / 60) * hourHeight;

  return (
    <View style={[styles.nowLine, { top, left: leftGutter - 8 }]}>
      <View style={styles.nowDot} />
      <View style={styles.nowLineBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerMobile: {
    padding: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.white,
    fontSize: 16,
  },
  titleMobile: {
    fontSize: 14,
  },
  timeline: {
    position: 'relative',
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
    textAlign: 'right',
    paddingRight: spacing.xs,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray800,
  },
  blockItem: {
    position: 'absolute',
    right: spacing.md,
    borderRadius: radii.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  blockLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
  },
  apptBlock: {
    position: 'absolute',
    right: spacing.md,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  apptContent: {
    gap: spacing.xxs,
  },
  apptClient: {
    ...typography.bodySmall,
    fontWeight: '600',
    fontSize: 12,
  },
  apptService: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 10,
  },
  nowLine: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  nowLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.error,
  },
});
