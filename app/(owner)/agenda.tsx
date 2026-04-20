import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { DayView } from '../../src/components/agenda/DayView';
import { WeekView } from '../../src/components/agenda/WeekView';
import { MonthView } from '../../src/components/agenda/MonthView';
import { AvailabilityPanel } from '../../src/components/agenda/AvailabilityPanel';
import { BlocksPanel } from '../../src/components/agenda/BlocksPanel';
import { FloatingActionButton } from '../../src/components/ui/FloatingActionButton';
import { NewAppointmentModal } from '../../src/components/modals/NewAppointmentModal';
import { BlockTimeModal } from '../../src/components/modals/BlockTimeModal';
import { IncidentModal } from '../../src/components/modals/IncidentModal';
import {
  MOCK_APPOINTMENTS,
  MOCK_TIME_BLOCKS,
  getAppointmentsForDate,
  getAppointmentsForRange,
} from '../../src/services/mock-data';

type AgendaTab = 'day' | 'week' | 'month' | 'availability' | 'blocks';

const TABS: { key: AgendaTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'day', label: 'Día', icon: 'today-outline' },
  { key: 'week', label: 'Semana', icon: 'calendar-outline' },
  { key: 'month', label: 'Mes', icon: 'grid-outline' },
  { key: 'availability', label: 'Disponibilidad', icon: 'time-outline' },
  { key: 'blocks', label: 'Bloqueos', icon: 'shield-outline' },
];

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function AgendaScreen() {
  const [activeTab, setActiveTab] = useState<AgendaTab>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [monthDate, setMonthDate] = useState(new Date());
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showIncident, setShowIncident] = useState(false);

  const dayAppointments = useMemo(
    () => getAppointmentsForDate(fmt(selectedDate)),
    [selectedDate]
  );

  const dayBlocks = useMemo(
    () => MOCK_TIME_BLOCKS.filter(b => b.date === fmt(selectedDate)),
    [selectedDate]
  );

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const weekAppointments = useMemo(
    () => getAppointmentsForRange(weekStart, weekEnd),
    [weekStart, weekEnd]
  );

  const weekBlocks = useMemo(
    () => {
      const start = fmt(weekStart);
      const end = fmt(weekEnd);
      return MOCK_TIME_BLOCKS.filter(b => b.date >= start && b.date <= end);
    },
    [weekStart, weekEnd]
  );

  const getSubtitle = () => {
    switch (activeTab) {
      case 'day':
        return selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
      case 'week': {
        const endLabel = weekEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        const startLabel = weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        return `${startLabel} – ${endLabel}`;
      }
      case 'month':
        return monthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      case 'availability':
        return 'Configura los horarios disponibles';
      case 'blocks':
        return 'Bloqueos de horario e incidencias';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'day':
        return (
          <DayView
            date={selectedDate}
            appointments={dayAppointments}
            blocks={dayBlocks}
            onDateChange={setSelectedDate}
          />
        );
      case 'week':
        return (
          <WeekView
            weekStart={weekStart}
            appointments={weekAppointments}
            blocks={weekBlocks}
            onWeekChange={setWeekStart}
            onAppointmentPress={(id) => console.log('Appointment', id)}
          />
        );
      case 'month':
        return (
          <MonthView
            date={monthDate}
            appointments={MOCK_APPOINTMENTS}
            onMonthChange={setMonthDate}
            onDayPress={(d) => {
              setSelectedDate(d);
              setActiveTab('day');
            }}
          />
        );
      case 'availability':
        return <AvailabilityPanel />;
      case 'blocks':
        return <BlocksPanel />;
    }
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="Agenda"
        subtitle={getSubtitle()}
        onNewAppointment={() => setShowNewAppt(true)}
      />

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBarScroll, isMobile && styles.tabBarScrollMobile]}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={isMobile ? 16 : 18}
                color={isActive ? colors.gold : colors.gray500}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      <FloatingActionButton
        onNewAppointment={() => setShowNewAppt(true)}
        onBlockTime={() => setShowBlockTime(true)}
        onNewIncident={() => setShowIncident(true)}
      />

      <NewAppointmentModal visible={showNewAppt} onClose={() => setShowNewAppt(false)} />
      <BlockTimeModal visible={showBlockTime} onClose={() => setShowBlockTime(false)} />
      <IncidentModal visible={showIncident} onClose={() => setShowIncident(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  tabBarScroll: {
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    flexGrow: 0,
  },
  tabBarScrollMobile: {},
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    gap: 6,
  },
  tabMobile: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabActive: {
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.gray500,
  },
  tabLabelActive: {
    color: colors.gold,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
});
