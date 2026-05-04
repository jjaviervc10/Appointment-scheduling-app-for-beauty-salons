import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

type Step = 'details' | 'service' | 'schedule' | 'confirm';

const STEP_ORDER: Step[] = ['details', 'service', 'schedule', 'confirm'];

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

function getNextSevenDays(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return dateKey(date);
  });
}

function formatDayShort(dayKey: string): { top: string; bottom: string } {
  const todayKey = dateKey(new Date());
  const date = new Date(`${dayKey}T12:00:00`);

  if (dayKey === todayKey) {
    return { top: 'Hoy', bottom: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) };
  }

  return {
    top: date.toLocaleDateString('es-MX', {
      weekday: 'short',
    }),
    bottom: date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    }),
  };
}

function formatDayLong(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
  const [notes, setNotes] = useState('');
  const [services, setServices] = useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayOptions[0] ?? dateKey(new Date()));
  const [availabilitySlots, setAvailabilitySlots] = useState<PublicAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = STEP_ORDER.indexOf(step) + 1;
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

      const slots = await getPublicAvailability(selectedServiceId, getWeekStart(selectedDate));
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

  const goToDetails = () => {
    setFormError(null);
    setStep('details');
  };

  const goToService = () => {
    setFormError(null);
    if (!fullName.trim() || !phone.trim()) {
      setFormError('Escribe tu nombre y celular');
      return;
    }
    setStep('service');
  };

  const goToSchedule = () => {
    setFormError(null);
    if (!selectedServiceId) {
      setFormError('Elige un servicio');
      return;
    }
    setStep('schedule');
  };

  const goToConfirm = () => {
    setFormError(null);
    if (!selectedSlotStartAt) {
      setFormError('Elige un horario');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedSlotStartAt || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setFormError(null);

      const response = await createPublicBookingRequest({
        fullName: fullName.trim(),
        phone: phone.trim(),
        serviceId: selectedServiceId,
        startAt: selectedSlotStartAt,
        notes: notes.trim() ? notes.trim() : undefined,
        token: token || undefined,
      });

      router.replace({
        pathname: '/miniapp/success',
        params: { appointmentId: response.appointment.id },
      });
    } catch (error) {
      setFormError(isHttpError(error) ? mapErrorMessage(error.status) : 'Ocurrió un error. Intenta más tarde');
      if (isHttpError(error) && error.status === 409) {
        setStep('schedule');
        void loadAvailability();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.appShell}>
          <BrandHeader />
          <Progress current={currentStepIndex} />

          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          {step === 'details' ? (
            <WizardCard title="Agenda tu cita" helper="Es rápido y fácil">
              <Text style={styles.label}>Nombre completo</Text>
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
                onPress={goToService}
                disabled={!fullName.trim() || !phone.trim()}
              />
            </WizardCard>
          ) : null}

          {step === 'service' ? (
            <WizardCard title="Elige un servicio" helper="Selecciona una opción">
              {servicesLoading ? (
                <LoadingInline label="Cargando servicios" />
              ) : servicesError ? (
                <RetryBlock message={servicesError} onPress={() => void loadServices()} />
              ) : services.length === 0 ? (
                <EmptyMessage text="No hay servicios disponibles." />
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
                        <View style={styles.serviceHeader}>
                          <Text style={[styles.serviceName, active && styles.selectedText]}>{service.name}</Text>
                          <View style={styles.serviceBadges}>
                            {service.price != null ? (
                              <Text style={[styles.servicePrice, active && styles.selectedText]}>
                                ${service.price}
                              </Text>
                            ) : null}
                            {service.durationMinutes ? (
                              <Text style={[styles.serviceDuration, active && styles.selectedSubtext]}>
                                {service.durationMinutes} min
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {service.description ? (
                          <Text style={[styles.serviceDescription, active && styles.selectedSubtext]} numberOfLines={2}>
                            {service.description}
                          </Text>
                        ) : null}
                        {active ? (
                          <Text style={styles.serviceCheckBadge}>✓ Seleccionado</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <PrimaryAction
                label="Continuar"
                onPress={goToSchedule}
                disabled={!selectedServiceId || servicesLoading}
              />
              <SecondaryAction label="Regresar" onPress={goToDetails} />
            </WizardCard>
          ) : null}

          {step === 'schedule' ? (
            <WizardCard title="Elige día y horario" helper="Horarios reales disponibles">
              <Text style={styles.label}>Día</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
                {dayOptions.map((day) => {
                  const active = day === selectedDate;
                  const label = formatDayShort(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCard, active && styles.selectedCard]}
                      onPress={() => {
                        setSelectedDate(day);
                        setSelectedSlotStartAt('');
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.dayTop, active && styles.selectedText]}>{label.top}</Text>
                      <Text style={[styles.dayBottom, active && styles.selectedSubtext]}>{label.bottom}</Text>
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
                <EmptyMessage text="No hay horarios disponibles este día." />
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
                        <Text style={[styles.slotText, active && styles.selectedText]}>
                          {formatTimeLabel(slot.slotStartAt)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <PrimaryAction
                label="Continuar"
                onPress={goToConfirm}
                disabled={!selectedSlotStartAt || availabilityLoading}
              />
              <SecondaryAction label="Cambiar servicio" onPress={() => setStep('service')} />
            </WizardCard>
          ) : null}

          {step === 'confirm' ? (
            <WizardCard title="Confirma tu cita" helper="Revisa antes de enviar">
              <View style={styles.confirmBox}>
                <ConfirmRow label="Nombre" value={fullName.trim()} />
                <ConfirmRow label="Celular" value={phone.trim()} />
                <ConfirmRow label="Servicio" value={selectedService?.name ?? 'Sin elegir'} />
                <ConfirmRow label="Día" value={formatDayLong(selectedDate)} />
                <ConfirmRow label="Hora" value={selectedSlot ? formatTimeLabel(selectedSlot.slotStartAt) : 'Sin elegir'} />
              </View>

              <Text style={styles.label}>Notas opcionales</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej. Voy con mi hijo"
                placeholderTextColor={colors.gray500}
                style={[styles.input, styles.notesInput]}
                multiline
              />

              <PrimaryAction
                label="Enviar solicitud"
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                loading={isSubmitting}
              />
              <SecondaryAction label="Cambiar horario" onPress={() => setStep('schedule')} />
            </WizardCard>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/LogoJL.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.brandCopy}>
        <Text style={styles.brandName}>Jaquelina López</Text>
        <Text style={styles.brandMeta}>Barber Studio</Text>
      </View>
    </View>
  );
}

const STEP_LABELS = ['Datos', 'Servicio', 'Horario', 'Confirmar'] as const;

function Progress({ current }: { current: number }) {
  return (
    <View style={styles.progressBox}>
      <View style={styles.stepsRow}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const isDone = num < current;
          const isActive = num === current;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepBubble,
                    isDone && styles.stepBubbleDone,
                    isActive && styles.stepBubbleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBubbleText,
                      (isDone || isActive) && styles.stepBubbleTextOn,
                    ]}
                  >
                    {isDone ? '✓' : String(num)}
                  </Text>
                </View>
                <Text
                  style={[styles.stepName, isActive && styles.stepNameActive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
              {i < STEP_LABELS.length - 1 && (
                <View style={styles.stepConnectorWrap}>
                  <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

function WizardCard({
  title,
  subtitle,
  helper,
  children,
}: {
  title: string;
  subtitle?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {subtitle ? <Text style={styles.cardEyebrow}>{subtitle}</Text> : null}
        <Text style={styles.cardTitle}>{title}</Text>
        {helper ? <Text style={styles.cardHelper}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
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

function EmptyMessage({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  appShell: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: spacing.md,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 38, height: 38 },
  brandCopy: { flex: 1 },
  brandName: { ...typography.subtitle, color: colors.white },
  brandMeta: { ...typography.bodySmall, color: colors.gold },
  progressBox: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleDone: {
    backgroundColor: colors.goldDark,
    borderColor: colors.goldDark,
  },
  stepBubbleActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  stepBubbleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.gray600,
  },
  stepBubbleTextOn: {
    color: colors.black,
  },
  stepName: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: colors.gray600,
    textAlign: 'center' as const,
    maxWidth: 56,
  },
  stepNameActive: {
    color: colors.gold,
    fontWeight: '600' as const,
  },
  stepConnectorWrap: {
    flex: 1,
    height: 30,
    justifyContent: 'center' as const,
    paddingHorizontal: 2,
  },
  stepConnector: {
    height: 2,
    backgroundColor: colors.gray700,
  },
  stepConnectorDone: {
    backgroundColor: colors.goldDark,
  },

  errorBanner: {
    ...typography.bodySmall,
    color: colors.error,
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: { gap: spacing.xs },
  cardEyebrow: { ...typography.caption, color: colors.goldDark, fontWeight: '700' },
  cardTitle: { ...typography.h2, color: colors.black },
  cardHelper: { ...typography.bodySmall, color: colors.gray600 },
  label: { ...typography.buttonSmall, color: colors.gray800 },
  input: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    color: colors.black,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 82,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  optionStack: { gap: spacing.sm },
  serviceCard: {
    minHeight: 86,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  serviceName: { ...typography.subtitle, color: colors.black, flex: 1 },
  serviceDuration: { ...typography.caption, color: colors.gray600, marginTop: 2 },
  serviceDescription: { ...typography.bodySmall, color: colors.gray600 },
  serviceBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servicePrice: {
    ...typography.subtitle,
    color: colors.goldDark,
  },
  serviceCheckBadge: {
    ...typography.caption,
    color: colors.black,
    fontWeight: '700' as const,
    marginTop: spacing.xs,
  },
  selectedCard: {
    backgroundColor: colors.gold,
    borderColor: colors.goldDark,
  },
  selectedText: { color: colors.black, fontWeight: '700' },
  selectedSubtext: { color: colors.black },
  daysRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayCard: {
    minWidth: 96,
    minHeight: 66,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dayTop: { ...typography.buttonSmall, color: colors.black, textTransform: 'capitalize' },
  dayBottom: { ...typography.caption, color: colors.gray600, textTransform: 'capitalize' },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotButton: {
    width: '47%',
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: { ...typography.button, color: colors.black },
  confirmBox: {
    borderRadius: radii.md,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    gap: spacing.sm,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.gray200,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  confirmLabel: { ...typography.caption, color: colors.gray600, width: 76 },
  confirmValue: { ...typography.bodySmall, color: colors.black, flex: 1, textAlign: 'right', fontWeight: '600' },
  primaryButton: {
    minHeight: 60,
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
    minHeight: 76,
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
    minHeight: 46,
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
