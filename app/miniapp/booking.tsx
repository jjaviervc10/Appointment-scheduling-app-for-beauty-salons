import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import {
  createPublicBookingRequest,
  getPublicAvailability,
  getPublicServices,
} from '../../src/services/bookingApi';
import type { PublicAvailabilitySlot, PublicService } from '../../src/types/api';
import { isHttpError } from '../../src/types/api';
import { formatLocalDateKey, getIsoDateKey } from '../../src/utils/date';

type Step = 'details' | 'service' | 'schedule';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function dateKey(date: Date): string {
  return formatLocalDateKey(date);
}

function getWeekStart(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return dateKey(date);
}

function formatDayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  return date.toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTimeLabel(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapErrorMessage(status: number): string {
  if (status === 400 || status === 422) return 'Revisa tus datos';
  if (status === 404) return 'El servicio ya no está disponible';
  if (status === 409) return 'Ese horario ya fue ocupado. Elige otro';
  if (status === 429) return 'Demasiados intentos. Intenta más tarde';
  if (status === 500) return 'Ocurrió un error. Intenta más tarde';
  return 'No se pudo completar. Intenta otra vez';
}

function getNextSevenDays(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return dateKey(date);
  });
}

export default function MiniAppBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    fullName?: string | string[];
    phone?: string | string[];
    token?: string | string[];
  }>();

  const token = firstParam(params.token).trim();
  const dayOptions = useMemo(() => getNextSevenDays(), []);

  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState(firstParam(params.fullName));
  const [phone, setPhone] = useState(firstParam(params.phone));
  const [services, setServices] = useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayOptions[0] ?? dateKey(new Date()));
  const [availabilitySlots, setAvailabilitySlots] = useState<PublicAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const selectedSlot = useMemo(
    () => availabilitySlots.find((slot) => slot.slotStartAt === selectedSlotStartAt) ?? null,
    [availabilitySlots, selectedSlotStartAt],
  );

  const visibleSlots = useMemo(
    () =>
      availabilitySlots
        .filter((slot) => getIsoDateKey(slot.slotStartAt) === selectedDate)
        .sort((a, b) => new Date(a.slotStartAt).getTime() - new Date(b.slotStartAt).getTime()),
    [availabilitySlots, selectedDate],
  );

  const requestStatus = useMemo(() => {
    if (isSubmitting) return 'Enviando solicitud';
    if (submitError) return 'Revisa el aviso';
    if (selectedSlotStartAt) return 'Lista para enviar';
    return 'Pendiente por enviar';
  }, [isSubmitting, selectedSlotStartAt, submitError]);

  const loadServices = useCallback(async () => {
    try {
      setServicesLoading(true);
      setServicesError(null);
      const response = await getPublicServices();
      setServices(response);
    } catch (error) {
      setServices([]);
      setServicesError(isHttpError(error) ? mapErrorMessage(error.status) : 'Ocurrió un error. Intenta más tarde');
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    if (!selectedServiceId || step !== 'schedule') return;

    try {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      setSelectedSlotStartAt('');

      const weekStart = getWeekStart(selectedDate);
      const slots = await getPublicAvailability(selectedServiceId, weekStart);
      setAvailabilitySlots(slots);
    } catch (error) {
      setAvailabilitySlots([]);
      setAvailabilityError(isHttpError(error) ? mapErrorMessage(error.status) : 'Ocurrió un error. Intenta más tarde');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [selectedDate, selectedServiceId, step]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const goToServiceStep = () => {
    setSubmitError(null);
    if (!fullName.trim() || !phone.trim()) {
      setSubmitError('Escribe tu nombre y celular');
      return;
    }
    setStep('service');
  };

  const goToScheduleStep = () => {
    setSubmitError(null);
    if (!selectedServiceId) {
      setSubmitError('Elige un servicio');
      return;
    }
    setStep('schedule');
  };

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedSlotStartAt || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const response = await createPublicBookingRequest({
        fullName: fullName.trim(),
        phone: phone.trim(),
        serviceId: selectedServiceId,
        startAt: selectedSlotStartAt,
        token: token || undefined,
      });

      router.replace({
        pathname: '/miniapp/success',
        params: {
          appointmentId: response.appointment.id,
        },
      });
    } catch (error) {
      setSubmitError(isHttpError(error) ? mapErrorMessage(error.status) : 'Ocurrió un error. Intenta más tarde');
      if (isHttpError(error) && error.status === 409) {
        void loadAvailability();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Agenda tu cita</Text>
          <Text style={styles.subtitle}>Te guiamos paso a paso</Text>
        </View>

        <View style={styles.summary}>
          <SummaryRow label="Servicio" value={selectedService?.name ?? 'Sin elegir'} />
          <SummaryRow label="Fecha y hora" value={selectedSlot ? `${formatDayLabel(selectedDate)} · ${formatTimeLabel(selectedSlot.slotStartAt)}` : 'Sin elegir'} />
          <SummaryRow label="Estado" value={requestStatus} highlight />
        </View>

        {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

        {step === 'details' ? (
          <View style={styles.panel}>
            <StepHeader current={1} title="Tus datos" />

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ana López"
              placeholderTextColor={colors.gray500}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Celular</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+526141234567"
              placeholderTextColor={colors.gray500}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <PrimaryAction
              label="Continuar"
              onPress={goToServiceStep}
              disabled={!fullName.trim() || !phone.trim()}
            />
          </View>
        ) : null}

        {step === 'service' ? (
          <View style={styles.panel}>
            <StepHeader current={2} title="Elige servicio" />

            {servicesLoading ? (
              <LoadingInline label="Cargando servicios" />
            ) : servicesError ? (
              <RetryBlock message={servicesError} onPress={() => void loadServices()} />
            ) : services.length === 0 ? (
              <Text style={styles.emptyText}>No hay servicios disponibles.</Text>
            ) : (
              <View style={styles.optionStack}>
                {services.map((service) => {
                  const active = service.id === selectedServiceId;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceCard, active && styles.selectedCard]}
                      onPress={() => {
                        setSelectedServiceId(service.id);
                        setSelectedSlotStartAt('');
                        setAvailabilitySlots([]);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.serviceName, active && styles.selectedText]}>{service.name}</Text>
                      {service.durationMinutes ? (
                        <Text style={[styles.serviceMeta, active && styles.selectedSubtext]}>{service.durationMinutes} min</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <PrimaryAction
              label="Continuar"
              onPress={goToScheduleStep}
              disabled={!selectedServiceId || servicesLoading}
            />
            <SecondaryAction label="Regresar" onPress={() => setStep('details')} />
          </View>
        ) : null}

        {step === 'schedule' ? (
          <View style={styles.panel}>
            <StepHeader current={3} title="Día y horario" />

            <Text style={styles.label}>Día</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
              {dayOptions.map((day) => {
                const active = day === selectedDate;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayButton, active && styles.selectedCard]}
                    onPress={() => {
                      setSelectedDate(day);
                      setSelectedSlotStartAt('');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.dayText, active && styles.selectedText]}>{formatDayLabel(day)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Horario</Text>
            {availabilityLoading ? (
              <LoadingInline label="Buscando horarios" />
            ) : availabilityError ? (
              <RetryBlock message={availabilityError} onPress={() => void loadAvailability()} />
            ) : visibleSlots.length === 0 ? (
              <Text style={styles.emptyText}>No hay horarios disponibles ese día.</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {visibleSlots.map((slot) => {
                  const active = slot.slotStartAt === selectedSlotStartAt;
                  return (
                    <TouchableOpacity
                      key={slot.slotStartAt}
                      style={[styles.slotButton, active && styles.selectedCard]}
                      onPress={() => setSelectedSlotStartAt(slot.slotStartAt)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.slotText, active && styles.selectedText]}>{formatTimeLabel(slot.slotStartAt)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <PrimaryAction
              label="Enviar solicitud"
              onPress={() => void handleSubmit()}
              disabled={!selectedSlotStartAt || availabilityLoading || isSubmitting}
              loading={isSubmitting}
            />
            <SecondaryAction label="Cambiar servicio" onPress={() => setStep('service')} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StepHeader({ current, title }: { current: number; title: string }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.stepBadge}>Paso {current} de 3</Text>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function SummaryRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function LoadingInline({ label }: { label: string }) {
  return (
    <View style={styles.inlineState}>
      <ActivityIndicator color={colors.gold} />
      <Text style={styles.inlineText}>{label}</Text>
    </View>
  );
}

function RetryBlock({ message, onPress }: { message: string; onPress: () => void }) {
  return (
    <View style={styles.retryBlock}>
      <Text style={styles.retryText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

function PrimaryAction({
  label,
  onPress,
  disabled,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color={colors.black} /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function SecondaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryButton} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  header: { gap: spacing.xxs },
  title: { ...typography.h1, color: colors.white },
  subtitle: { ...typography.body, color: colors.gray400 },
  summary: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: { ...typography.caption, color: colors.gray500, width: 86 },
  summaryValue: { ...typography.bodySmall, color: colors.white, flex: 1, textAlign: 'right' },
  summaryValueHighlight: { color: colors.gold, fontWeight: '700' },
  errorBanner: {
    ...typography.bodySmall,
    color: colors.error,
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepHeader: { gap: spacing.xs },
  stepBadge: { ...typography.caption, color: colors.goldDark, fontWeight: '700' },
  stepTitle: { ...typography.h2, color: colors.black },
  label: { ...typography.buttonSmall, color: colors.gray800 },
  input: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    color: colors.black,
    fontSize: 16,
  },
  optionStack: { gap: spacing.sm },
  serviceCard: {
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  selectedCard: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  serviceName: { ...typography.subtitle, color: colors.black },
  serviceMeta: { ...typography.bodySmall, color: colors.gray600 },
  selectedText: { color: colors.black, fontWeight: '700' },
  selectedSubtext: { color: colors.black },
  daysRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayButton: {
    minWidth: 104,
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dayText: { ...typography.buttonSmall, color: colors.black, textTransform: 'capitalize' },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotButton: {
    width: '47%',
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: { ...typography.button, color: colors.black },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  disabledButton: { opacity: 0.45 },
  primaryText: { ...typography.button, color: colors.black },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...typography.buttonSmall, color: colors.gray600 },
  inlineState: {
    minHeight: 70,
    borderRadius: radii.md,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  inlineText: { ...typography.bodySmall, color: colors.gray600 },
  retryBlock: {
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  retryText: { ...typography.bodySmall, color: colors.error },
  retryButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: { ...typography.buttonSmall, color: colors.error },
  emptyText: {
    ...typography.body,
    color: colors.gray600,
    backgroundColor: colors.gray50,
    borderRadius: radii.md,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
