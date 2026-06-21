import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { fetchAppointmentsByDate, fetchAppointmentsByRange } from '../../src/services/appointments';
import { fetchTimeBlocks } from '../../src/services/availability';
import type { AppointmentViewModel } from '../../src/types/models';
import type { TimeBlock } from '../../src/types/database';
import { formatLocalDateKey } from '../../src/utils/date';

type AgendaTab = 'day' | 'week' | 'month' | 'availability' | 'blocks';

const TABS: { key: AgendaTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'day', label: 'Día', icon: 'today-outline' },
  { key: 'week', label: 'Semana', icon: 'calendar-outline' },
  { key: 'month', label: 'Mes', icon: 'grid-outline' },
  { key: 'availability', label: 'Disponibilidad', icon: 'time-outline' },
  { key: 'blocks', label: 'Bloqueos', icon: 'shield-outline' },
];

function fmt(d: Date): string {
  return formatLocalDateKey(d);
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
  const [dayAppointments, setDayAppointments] = useState<AppointmentViewModel[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<AppointmentViewModel[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<AppointmentViewModel[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const selectedDateKey = useMemo(() => fmt(selectedDate), [selectedDate]);

  const dayBlocks = useMemo(
    () => timeBlocks.filter(b => b.date === selectedDateKey),
    [selectedDateKey, timeBlocks]
  );

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const weekStartKey = useMemo(() => fmt(weekStart), [weekStart]);
  const weekEndKey = useMemo(() => fmt(weekEnd), [weekEnd]);

  const monthRange = useMemo(() => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }, [monthDate]);

  const weekBlocks = useMemo(
    () => {
      return timeBlocks.filter(b => b.date >= weekStartKey && b.date <= weekEndKey);
    },
    [timeBlocks, weekStartKey, weekEndKey]
  );

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);

    try {
      const [dayData, weekData, monthData, blocksData] = await Promise.all([
        fetchAppointmentsByDate(selectedDateKey),
        fetchAppointmentsByRange(weekStartKey, weekEndKey),
        fetchAppointmentsByRange(monthRange.start, monthRange.end),
        fetchTimeBlocks(weekStartKey, weekEndKey),
      ]);

      setDayAppointments(dayData);
      setWeekAppointments(weekData);
      setMonthAppointments(monthData);
      setTimeBlocks(blocksData);
    } catch (error) {
      setAppointmentsError(error instanceof Error ? error.message : 'No se pudo cargar la agenda.');
      setDayAppointments([]);
      setWeekAppointments([]);
      setMonthAppointments([]);
      setTimeBlocks([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [selectedDateKey, weekStartKey, weekEndKey, monthRange]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

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
    if (appointmentsLoading) {
      return <Text style={styles.stateText}>Sincronizando agenda con backend...</Text>;
    }

    if (appointmentsError) {
      return <Text style={[styles.stateText, styles.errorText]}>{appointmentsError}</Text>;
    }

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
            appointments={monthAppointments}
            onMonthChange={setMonthDate}
            onDayPress={(d) => {
              setSelectedDate(d);
              setActiveTab('day');
            }}
          />
        );
      case 'availability':
        return <AvailabilityPanel onGoToBlocks={() => setActiveTab('blocks')} />;
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

      <NewAppointmentModal
        visible={showNewAppt}
        onClose={() => setShowNewAppt(false)}
        onCreated={() => void loadAppointments()}
      />
      <BlockTimeModal
        visible={showBlockTime}
        onClose={() => {
          setShowBlockTime(false);
          void loadAppointments();
        }}
      />
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
  stateText: {
    padding: spacing.lg,
    color: colors.gray400,
    fontSize: 13,
  },
  errorText: {
    color: colors.error,
  },
});
