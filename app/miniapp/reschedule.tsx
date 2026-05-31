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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography } from '../../src/theme';
import {
  createPublicRescheduleRequest,
  getPublicAvailability,
  getPublicMiniAppToken,
} from '../../src/services/bookingApi';
import type {
  PublicAvailabilitySlot,
  PublicMiniAppTokenAppointment,
  PublicMiniAppTokenResponse,
} from '../../src/types/api';
import { isHttpError } from '../../src/types/api';
import { formatLocalDateKey, getIsoDateKey } from '../../src/utils/date';
import { returnToWhatsApp, useMiniAppExitGuard } from '../../src/hooks/useMiniAppExitGuard';

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
    top: date.toLocaleDateString('es-MX', { weekday: 'short' }),
    bottom: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
  };
}

function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return `${date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })} ${date.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatTimeLabel(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapErrorMessage(status: number): string {
  if (status === 400) return 'Revisa los datos enviados.';
  if (status === 404) return 'El enlace ya no es valido o la cita no existe.';
  if (status === 409) return 'Ese horario ya no esta disponible. Elige otro.';
  if (status === 422) return 'Esta cita no se puede reprogramar desde este enlace.';
  if (status === 429) return 'Demasiados intentos. Intenta mas tarde.';
  return 'No se pudo completar. Intenta otra vez.';
}

const BOOKING_LEAD_MINUTES = 30;

function isSlotBookable(slotStartAt: string): boolean {
  return new Date(slotStartAt).getTime() - Date.now() >= BOOKING_LEAD_MINUTES * 60 * 1000;
}

export default function MiniAppRescheduleScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
    returnUrl?: string | string[];
    waReturnUrl?: string | string[];
  }>();

  const token = firstParam(params.token).trim();
  const whatsappReturnUrl = firstParam(params.returnUrl).trim() || firstParam(params.waReturnUrl).trim();
  const dayOptions = useMemo(() => getNextSevenDays(), []);

  const [tokenData, setTokenData] = useState<PublicMiniAppTokenResponse | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayOptions[0] ?? dateKey(new Date()));
  const [availabilitySlots, setAvailabilitySlots] = useState<PublicAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showExitHint, setShowExitHint] = useState(false);

  const handleReturnToWhatsApp = useCallback(() => {
    void returnToWhatsApp(whatsappReturnUrl);
    setTimeout(() => setShowExitHint(true), 2500);
  }, [whatsappReturnUrl]);

  useMiniAppExitGuard(handleReturnToWhatsApp);

  const appointments = useMemo<PublicMiniAppTokenAppointment[]>(() => {
    if (!tokenData) return [];
    if (tokenData.appointment) return [tokenData.appointment];
    return tokenData.appointments ?? [];
  }, [tokenData]);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId],
  );

  const visibleSlots = useMemo(
    () =>
      availabilitySlots
        .filter((slot) => getIsoDateKey(slot.slotStartAt) === selectedDate && isSlotBookable(slot.slotStartAt))
        .sort((a, b) => new Date(a.slotStartAt).getTime() - new Date(b.slotStartAt).getTime()),
    [availabilitySlots, selectedDate],
  );

  const loadToken = useCallback(async () => {
    if (!token) {
      setTokenLoading(false);
      setTokenError('El enlace no incluye token de seguridad.');
      return;
    }

    try {
      setTokenLoading(true);
      setTokenError(null);
      const response = await getPublicMiniAppToken(token);

      if (response.purpose !== 'reschedule') {
        setTokenData(null);
        setTokenError('Este enlace no corresponde a reprogramacion.');
        return;
      }

      const resolvedAppointments = response.appointment ? [response.appointment] : response.appointments ?? [];
      setTokenData(response);
      setSelectedAppointmentId(resolvedAppointments[0]?.id ?? '');
    } catch (error) {
      setTokenData(null);
      setTokenError(isHttpError(error) ? mapErrorMessage(error.status) : 'No se pudo abrir este enlace.');
    } finally {
      setTokenLoading(false);
    }
  }, [token]);

  const loadAvailability = useCallback(async () => {
    if (!selectedAppointment?.serviceId || success) return;

    try {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      setSelectedSlotStartAt('');

      const availResponse = await getPublicAvailability(selectedAppointment.serviceId, getWeekStart(selectedDate));
      setAvailabilitySlots(availResponse.slots);
    } catch (error) {
      setAvailabilitySlots([]);
      setAvailabilityError(isHttpError(error) ? mapErrorMessage(error.status) : 'No se pudieron cargar horarios.');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [selectedAppointment?.serviceId, selectedDate, success]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const handleSubmit = async () => {
    if (!selectedAppointment || !selectedSlotStartAt || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await createPublicRescheduleRequest({
        token,
        appointmentId: selectedAppointment.id,
        newStartAt: selectedSlotStartAt,
        notes: notes.trim() || null,
      });

      setSuccess(true);
    } catch (error) {
      setSubmitError(isHttpError(error) ? mapErrorMessage(error.status) : 'No se pudo enviar la reprogramacion.');
      if (isHttpError(error) && error.status === 409) {
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
          <BrandHeader onExit={handleReturnToWhatsApp} showHint={showExitHint} />

          {tokenLoading ? (
            <StateCard icon="time-outline" title="Validando enlace" message="Estamos preparando tu cita." loading />
          ) : tokenError ? (
            <StateCard
              icon="warning-outline"
              title="No se pudo abrir"
              message={tokenError}
              actionLabel="Volver a WhatsApp"
              onAction={handleReturnToWhatsApp}
            />
          ) : success ? (
            <StateCard
              icon="checkmark"
              title="Solicitud enviada"
              message="Recibimos tu solicitud de reprogramacion. Te responderemos por WhatsApp."
              actionLabel="Volver al chat de WhatsApp"
              onAction={handleReturnToWhatsApp}
              success
            />
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEyebrow}>Opcion 3</Text>
                  <Text style={styles.cardTitle}>Reprogramar cita</Text>
                  <Text style={styles.cardHelper}>Elige una cita y un nuevo horario disponible.</Text>
                </View>

                {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

                {appointments.length > 1 ? (
                  <>
                    <Text style={styles.label}>Cita a reprogramar</Text>
                    <View style={styles.optionStack}>
                      {appointments.map((appointment) => {
                        const active = appointment.id === selectedAppointmentId;
                        return (
                          <TouchableOpacity
                            key={appointment.id}
                            style={[styles.appointmentCard, active && styles.selectedCard]}
                            onPress={() => {
                              setSelectedAppointmentId(appointment.id);
                              setSelectedSlotStartAt('');
                              setAvailabilitySlots([]);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.appointmentTitle, active && styles.selectedText]}>
                              {appointment.serviceName ?? 'Servicio'}
                            </Text>
                            <Text style={[styles.appointmentMeta, active && styles.selectedText]}>
                              {formatDateTime(appointment.startAt)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : selectedAppointment ? (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Cita actual</Text>
                    <Text style={styles.summaryTitle}>{selectedAppointment.serviceName ?? 'Servicio'}</Text>
                    <Text style={styles.summaryMeta}>{formatDateTime(selectedAppointment.startAt)}</Text>
                  </View>
                ) : (
                  <EmptyMessage text="No encontramos citas activas para reprogramar." />
                )}

                {selectedAppointment ? (
                  <>
                    <Text style={styles.label}>Nuevo dia</Text>
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
                            <Text style={[styles.dayBottom, active && styles.selectedText]}>{label.bottom}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <Text style={styles.label}>Nuevo horario</Text>
                    {availabilityLoading ? (
                      <LoadingInline label="Buscando horarios" />
                    ) : availabilityError ? (
                      <RetryBlock message={availabilityError} onPress={() => void loadAvailability()} />
                    ) : visibleSlots.length === 0 ? (
                      <EmptyMessage text="No hay horarios disponibles este dia." />
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

                    <Text style={styles.label}>Notas opcionales</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Ej. Prefiero por la manana"
                      placeholderTextColor={colors.gray500}
                      style={[styles.input, styles.notesInput]}
                      multiline
                    />

                    <PrimaryAction
                      label="Enviar solicitud"
                      onPress={() => void handleSubmit()}
                      disabled={!selectedSlotStartAt || availabilityLoading || isSubmitting}
                      loading={isSubmitting}
                    />
                  </>
                ) : null}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BrandHeader({ onExit, showHint }: { onExit: () => void; showHint?: boolean }) {
  return (
    <View>
      <View style={styles.brandHeader}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo-whatsapp.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>Jaquelina Lopez</Text>
          <Text style={styles.brandMeta}>Barber Studio</Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={14} color={colors.gray400} />
          <Text style={styles.exitText}>Salir</Text>
        </TouchableOpacity>
      </View>
      {showHint ? (
        <Text style={styles.exitHint}>
          Si WhatsApp no se abrió automáticamente, vuelve manualmente al chat.
        </Text>
      ) : null}
    </View>
  );
}

function StateCard({
  icon,
  title,
  message,
  loading,
  actionLabel,
  onAction,
  success,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  success?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, success && styles.stateIconSuccess]}>
        {loading ? <ActivityIndicator color={colors.black} /> : <Ionicons name={icon} size={28} color={colors.black} />}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  exitHint: { ...typography.caption, color: colors.gray400, textAlign: 'center', paddingBottom: spacing.xs },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exitText: { ...typography.caption, color: colors.gray400 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    boxShadow: '0px 3px 10px rgba(0,0,0,0.10)',
    elevation: 4,
  },
  cardHeader: { gap: spacing.xs },
  cardEyebrow: { ...typography.caption, color: colors.goldDark, fontWeight: '700' },
  cardTitle: { ...typography.h2, color: colors.black },
  cardHelper: { ...typography.bodySmall, color: colors.gray600 },
  label: { ...typography.buttonSmall, color: colors.gray800 },
  errorBanner: {
    ...typography.bodySmall,
    color: colors.error,
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  optionStack: { gap: spacing.sm },
  appointmentCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    padding: spacing.md,
    gap: spacing.xs,
  },
  appointmentTitle: { ...typography.subtitle, color: colors.black },
  appointmentMeta: { ...typography.bodySmall, color: colors.gray600, textTransform: 'capitalize' },
  selectedCard: {
    backgroundColor: colors.gold,
    borderColor: colors.goldDark,
  },
  selectedText: { color: colors.black, fontWeight: '700' },
  summaryBox: {
    borderRadius: radii.md,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryLabel: { ...typography.caption, color: colors.gray500 },
  summaryTitle: { ...typography.subtitle, color: colors.black },
  summaryMeta: { ...typography.bodySmall, color: colors.gray600, textTransform: 'capitalize' },
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
  primaryButton: {
    minHeight: 60,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    alignSelf: 'stretch',
  },
  disabledButton: { opacity: 0.45 },
  primaryText: { ...typography.button, color: colors.black },
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
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconSuccess: { backgroundColor: colors.successLight },
  stateTitle: { ...typography.h2, color: colors.black, textAlign: 'center' },
  stateMessage: { ...typography.body, color: colors.gray600, textAlign: 'center' },
});
