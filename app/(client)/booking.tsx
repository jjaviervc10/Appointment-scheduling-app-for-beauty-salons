import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { MOCK_SERVICES, MOCK_TIME_SLOTS } from '../../src/services/mock-data';
import { TimeSlotButton } from '../../src/components/calendar/TimeSlotButton';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { SectionCard } from '../../src/components/ui/SectionCard';
import type { Service } from '../../src/types/database';
import type { TimeSlot } from '../../src/types/models';

function getWeekDates(referenceDate: string) {
  const ref = new Date(referenceDate + 'T12:00:00');
  const dayOfWeek = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d.toISOString().split('T')[0], dayLabel: labels[i], dayNum: d.getDate() };
  });
}

export default function BookingScreen() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const availableSlots = useMemo(() => MOCK_TIME_SLOTS.filter((s) => s.isAvailable), []);
  const today = new Date().toISOString().split('T')[0];

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleSubmit = () => {
    Alert.alert(
      'Solicitud enviada',
      'Tu cita queda pendiente hasta que Jaquelina la apruebe.',
      [{ text: 'OK', onPress: () => { setSelectedService(null); setSelectedSlot(null); } }]
    );
  };

  const formatWeekRange = () => {
    if (weekDates.length === 0) return '';
    const first = weekDates[0].dayNum;
    const last = weekDates[weekDates.length - 1].dayNum;
    const d = new Date(selectedDate + 'T12:00:00');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `Semana del ${first} al ${last} ${months[d.getMonth()]}`;
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${days[d.getDay()]} ${d.getDate()}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Branded Hero Header with logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/LogoJL.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Reservar cita</Text>
          <Text style={styles.headerSubtitle}>{formatWeekRange()}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Week Strip — Lun to Sáb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
          {weekDates.map((item) => {
            const isSelected = item.date === selectedDate;
            const isToday = item.date === today;
            return (
              <TouchableOpacity
                key={item.date}
                style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                onPress={() => handleDateSelect(item.date)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>{item.dayLabel}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayNumToday]}>{item.dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Service Selection — always visible */}
        <SectionCard title="Elige tu servicio">
          {MOCK_SERVICES.map((service) => {
            const isActive = selectedService?.id === service.id;
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceOption, isActive && styles.serviceOptionActive]}
                onPress={() => handleServiceSelect(service)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceOptionInfo}>
                  <Text style={[styles.serviceOptionName, isActive && styles.serviceOptionNameActive]}>{service.name}</Text>
                  <Text style={styles.serviceOptionMeta}>{service.duration_minutes} min</Text>
                </View>
                <Text style={styles.serviceOptionPrice}>${service.price?.toLocaleString()}</Text>
                {isActive && (
                  <View style={styles.serviceCheck}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* Time Slots — visible once a service is selected */}
        {selectedService && (
          <View style={styles.slotsSection}>
            <Text style={styles.slotsSectionTitle}>Horarios disponibles</Text>
            <Text style={styles.slotsSectionSubtitle}>
              Se muestran solo los espacios libres aprobables por la estilista
            </Text>
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot) => (
                <TimeSlotButton
                  key={slot.startTime}
                  slot={slot}
                  isSelected={selectedSlot?.startTime === slot.startTime}
                  onPress={() => handleSlotSelect(slot)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Summary card */}
        {selectedService && selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de solicitud</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Servicio:</Text>
              <Text style={styles.summaryValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duración estimada:</Text>
              <Text style={styles.summaryValue}>{selectedService.duration_minutes} minutos</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hora elegida:</Text>
              <Text style={styles.summaryValue}>
                {formatDateShort(selectedDate)} · {selectedSlot.startTime} pm
              </Text>
            </View>

            <PrimaryButton label="Solicitar cita" onPress={handleSubmit} style={styles.submitButton} />

            <Text style={styles.disclaimer}>
              La cita queda pendiente hasta que Jaquelina la apruebe.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  // Header with logo
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLogo: { width: 48, height: 48 },
  headerTextBlock: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSubtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg },
  // Week strip
  weekStrip: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    minWidth: 48,
    ...shadows.card,
  },
  dayCellSelected: { backgroundColor: colors.black },
  dayCellToday: { borderWidth: 1, borderColor: colors.gold },
  dayLabel: { ...typography.caption, color: colors.gray600, marginBottom: spacing.xxs },
  dayNum: { ...typography.subtitle, color: colors.gray900 },
  dayTextSelected: { color: colors.white },
  dayNumToday: { color: colors.gold },
  // Services
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.sm,
  },
  serviceOptionActive: {
    backgroundColor: colors.gold + '08',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderBottomColor: 'transparent',
  },
  serviceOptionInfo: { flex: 1 },
  serviceOptionName: { ...typography.subtitle, color: colors.gray900 },
  serviceOptionNameActive: { color: colors.black, fontWeight: '700' },
  serviceOptionMeta: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  serviceOptionPrice: { ...typography.subtitle, color: colors.gold },
  serviceCheck: { marginLeft: spacing.xs },
  // Slots
  slotsSection: { gap: spacing.sm },
  slotsSectionTitle: { ...typography.h3, color: colors.gray900 },
  slotsSectionSubtitle: { ...typography.caption, color: colors.gray500, marginBottom: spacing.xs },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Summary
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    ...shadows.card,
    gap: spacing.sm,
  },
  summaryTitle: { ...typography.h3, color: colors.gray900, marginBottom: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  summaryLabel: { ...typography.body, color: colors.gray600 },
  summaryValue: { ...typography.subtitle, color: colors.gray900, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  submitButton: { marginTop: spacing.lg },
  disclaimer: { ...typography.caption, color: colors.gray500, textAlign: 'center', marginTop: spacing.sm },
});
