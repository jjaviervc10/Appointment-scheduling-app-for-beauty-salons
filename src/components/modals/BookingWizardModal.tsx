import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { MOCK_SERVICES } from '../../services/mock-data';
import { PrimaryButton } from '../ui/PrimaryButton';
import type { Service } from '../../types/database';
import type { TimeSlot } from '../../types/models';

interface Props {
  visible: boolean;
  selectedDate: string;
  selectedSlot: TimeSlot | null;
  onClose: () => void;
  onConfirm: () => void;
  onSubmit: (input: BookingSubmitInput) => Promise<void>;
}

export interface BookingSubmitInput {
  serviceId: string;
  startAt: string;
  notes?: string;
}

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

type AppointmentType = 'individual' | 'familiar';
type FamilyWho = 'papa_hijos' | 'solo_hijos';

export function BookingWizardModal({ visible, selectedDate, selectedSlot, onClose, onConfirm, onSubmit }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('individual');
  const [familyWho, setFamilyWho] = useState<FamilyWho>('papa_hijos');
  const [childCount, setChildCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedService(null);
      setAppointmentType('individual');
      setFamilyWho('papa_hijos');
      setChildCount(1);
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [visible]);

  const familyLabel = appointmentType === 'familiar'
    ? `${familyWho === 'papa_hijos' ? 'Papá + ' : ''}${childCount} hijo${childCount > 1 ? 's' : ''}`
    : 'Individual';

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayName = DAYS_ES[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = MONTHS_ES[dateObj.getMonth()];
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot) return;

    const notes =
      appointmentType === 'familiar'
        ? `[Tipo: familiar] ${familyWho === 'papa_hijos' ? 'Papa + hijos' : 'Solo hijos'} (${childCount} hijo${childCount > 1 ? 's' : ''})`
        : undefined;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        serviceId: selectedService.id,
        startAt: new Date(`${selectedDate}T${selectedSlot.startTime}:00`).toISOString(),
        notes,
      });

      Alert.alert(
        'Solicitud enviada',
        'Tu cita queda pendiente hasta que Jaquelina la apruebe.',
        [{ text: 'OK', onPress: () => { onConfirm(); } }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar la solicitud.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSlot) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Handle bar (mobile feel) */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={20} color={colors.gold} />
              </View>
              <Text style={styles.headerTitle}>Agendar cita</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Steps indicator */}
          <View style={styles.steps}>
            {[1, 2].map((s) => (
              <View key={s} style={styles.stepRow}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  {step > s ? (
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  ) : (
                    <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
                  {s === 1 ? 'Servicio' : 'Confirmar'}
                </Text>
                {s < 2 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* Date-time badge (always visible) */}
          <View style={styles.dateBadge}>
            <Ionicons name="time-outline" size={16} color={colors.gold} />
            <Text style={styles.dateBadgeText}>
              {dayName} {dayNum} {monthCap} · {selectedSlot.startTime} – {selectedSlot.endTime}
            </Text>
          </View>

          {/* ─── STEP 1: Select service ─── */}
          {step === 1 && (
            <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.stepContent}>
                {/* Appointment type */}
                <Text style={styles.sectionLabel}>Tipo de cita</Text>
                <View style={styles.typePillRow}>
                  <TouchableOpacity
                    style={[styles.typePill, appointmentType === 'individual' && styles.typePillActive]}
                    onPress={() => setAppointmentType('individual')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person" size={16} color={appointmentType === 'individual' ? colors.white : colors.gray500} />
                    <Text style={[styles.typePillText, appointmentType === 'individual' && styles.typePillTextActive]}>Individual</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typePill, appointmentType === 'familiar' && styles.typePillActive]}
                    onPress={() => setAppointmentType('familiar')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people" size={16} color={appointmentType === 'familiar' ? colors.white : colors.gray500} />
                    <Text style={[styles.typePillText, appointmentType === 'familiar' && styles.typePillTextActive]}>Familiar</Text>
                  </TouchableOpacity>
                </View>

                {/* Family sub-form */}
                {appointmentType === 'familiar' && (
                  <View style={styles.familyForm}>
                    <Text style={styles.familyLabel}>¿Quién asiste?</Text>
                    <View style={styles.familyWhoRow}>
                      <TouchableOpacity
                        style={[styles.familyWhoPill, familyWho === 'papa_hijos' && styles.familyWhoPillActive]}
                        onPress={() => setFamilyWho('papa_hijos')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.familyWhoPillText, familyWho === 'papa_hijos' && styles.familyWhoPillTextActive]}>Papá e hijo(s)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.familyWhoPill, familyWho === 'solo_hijos' && styles.familyWhoPillActive]}
                        onPress={() => setFamilyWho('solo_hijos')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.familyWhoPillText, familyWho === 'solo_hijos' && styles.familyWhoPillTextActive]}>Solo hijo(s)</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.familyLabel}>¿Cuántos hijos?</Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, childCount <= 1 && styles.stepperBtnDisabled]}
                        onPress={() => setChildCount((c) => Math.max(1, c - 1))}
                        disabled={childCount <= 1}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={18} color={childCount <= 1 ? colors.gray300 : colors.gray700} />
                      </TouchableOpacity>
                      <View style={styles.stepperValue}>
                        <Text style={styles.stepperValueText}>{childCount}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setChildCount((c) => Math.min(5, c + 1))}
                        disabled={childCount >= 5}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={18} color={childCount >= 5 ? colors.gray300 : colors.gray700} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Service selection */}
                <Text style={styles.sectionLabel}>Selecciona servicio</Text>
              {MOCK_SERVICES.map((service) => {
                const isActive = selectedService?.id === service.id;
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceRow, isActive && styles.serviceRowActive]}
                    onPress={() => setSelectedService(service)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, isActive && { color: colors.white }]}>{service.name}</Text>
                    </View>
                    <Text style={[styles.servicePrice, isActive && { color: colors.white }]}>
                      ${service.price?.toLocaleString()}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.white} style={{ marginLeft: spacing.xs }} />}
                  </TouchableOpacity>
                );
              })}

              <PrimaryButton
                label="Continuar"
                onPress={() => setStep(2)}
                style={[styles.actionBtn, !selectedService && styles.actionBtnDisabled]}
                disabled={!selectedService}
              />
              </View>
            </ScrollView>
          )}

          {/* ─── STEP 2: Confirm ─── */}
          {step === 2 && selectedService && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionLabel}>Resumen de tu cita</Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Ionicons name="cut-outline" size={18} color={colors.gold} />
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryKey}>Servicio</Text>
                    <Text style={styles.summaryValue}>{selectedService.name}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.gold} />
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryKey}>Fecha y hora</Text>
                    <Text style={styles.summaryValue}>
                      {dayName} {dayNum} {monthCap} · {selectedSlot.startTime} – {selectedSlot.endTime}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.gold} />
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryKey}>Precio</Text>
                    <Text style={styles.summaryValue}>${selectedService.price?.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Ionicons name={appointmentType === 'familiar' ? 'people-outline' : 'person-outline'} size={18} color={colors.gold} />
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryKey}>Tipo de cita</Text>
                    <Text style={styles.summaryValue}>{familyLabel}</Text>
                  </View>
                </View>
                {selectedService.duration_minutes && (
                  <>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Ionicons name="hourglass-outline" size={18} color={colors.gold} />
                      <View style={styles.summaryTextBlock}>
                        <Text style={styles.summaryKey}>Duración</Text>
                        <Text style={styles.summaryValue}>{selectedService.duration_minutes} min</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <Ionicons name="arrow-back" size={16} color={colors.gray600} />
                  <Text style={styles.backBtnText}>Cambiar servicio</Text>
                </TouchableOpacity>
                <PrimaryButton
                  label="Solicitar cita"
                  onPress={() => void handleConfirm()}
                  style={styles.confirmBtn}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
              </View>

              {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

              <Text style={styles.disclaimer}>La cita queda pendiente hasta que Jaquelina la apruebe.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.gray900,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  cardMobile: { paddingHorizontal: spacing.lg },

  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.gray700,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray800,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 36, height: 36, borderRadius: radii.md,
    backgroundColor: colors.gold + '15', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.white },

  // Steps
  steps: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xxs, paddingVertical: spacing.md,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.gold },
  stepNum: { fontSize: 11, fontWeight: '700', color: colors.gray400 },
  stepNumActive: { color: colors.white },
  stepLabel: { ...typography.caption, color: colors.gray400, marginRight: spacing.xs },
  stepLabelActive: { color: colors.white, fontWeight: '600' },
  stepLine: {
    width: 30, height: 2, backgroundColor: colors.gray800,
    borderRadius: 1, marginRight: spacing.xs,
  },
  stepLineActive: { backgroundColor: colors.gold },

  // Date badge
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.gold + '10',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.md, marginBottom: spacing.md,
  },
  dateBadgeText: { ...typography.bodySmall, color: colors.gold, fontWeight: '700' },

  // Step content
  stepScroll: { maxHeight: 420 },
  stepContent: { gap: spacing.sm },
  sectionLabel: { ...typography.caption, color: colors.gray500, textTransform: 'uppercase', fontWeight: '700', marginBottom: spacing.xxs },

  // Service rows
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.gray800,
    borderWidth: 1, borderColor: colors.gray800,
  },
  serviceRowActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  serviceInfo: { flex: 1, gap: 2 },
  serviceName: { ...typography.subtitle, color: colors.white },
  serviceDuration: { ...typography.caption, color: colors.gray400 },
  servicePrice: { ...typography.subtitle, color: colors.gold, marginLeft: spacing.sm },

  // Action buttons
  actionBtn: { marginTop: spacing.sm },
  actionBtnDisabled: { opacity: 0.5 },

  // Appointment type pills
  typePillRow: { flexDirection: 'row', gap: spacing.sm },
  typePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: radii.full, backgroundColor: colors.gray800,
    borderWidth: 1.5, borderColor: colors.gray800,
  },
  typePillActive: { backgroundColor: colors.black, borderColor: colors.gold },
  typePillText: { ...typography.bodySmall, color: colors.gray400, fontWeight: '600' },
  typePillTextActive: { color: colors.white },

  // Family sub-form
  familyForm: {
    backgroundColor: colors.gray800, borderRadius: radii.md,
    padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.gray800,
  },
  familyLabel: { ...typography.caption, color: colors.gray500, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  familyWhoRow: { flexDirection: 'row', gap: spacing.sm },
  familyWhoPill: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radii.md, backgroundColor: colors.gray900,
    borderWidth: 1.5, borderColor: colors.gray800,
  },
  familyWhoPillActive: { borderColor: colors.gold, backgroundColor: colors.gold + '10' },
  familyWhoPillText: { ...typography.bodySmall, color: colors.gray500, fontWeight: '600' },
  familyWhoPillTextActive: { color: colors.gold },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.gray800, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.gray800,
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValue: {
    width: 44, height: 36, borderRadius: radii.md,
    backgroundColor: colors.gray900, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.gray800,
  },
  stepperValueText: { ...typography.subtitle, color: colors.white, fontSize: 16 },

  // Summary card
  summaryCard: {
    backgroundColor: colors.gray800, borderRadius: radii.lg,
    padding: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.gray800,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryTextBlock: { flex: 1, gap: 1 },
  summaryKey: { ...typography.caption, color: colors.gray400, fontWeight: '600' },
  summaryValue: { ...typography.body, color: colors.white, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: colors.gray700 },

  // Confirm actions
  confirmActions: { gap: spacing.sm, marginTop: spacing.xs },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  backBtnText: { ...typography.bodySmall, color: colors.gray400, fontWeight: '600' },
  confirmBtn: {},
  submitError: { ...typography.caption, color: colors.error, marginTop: spacing.sm },

  disclaimer: { ...typography.caption, color: colors.gray500, textAlign: 'center', marginTop: spacing.xs },
});
