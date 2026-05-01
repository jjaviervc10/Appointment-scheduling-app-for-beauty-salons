import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import {
  createPublicBookingRequest,
  getPublicAvailability,
  getPublicServices,
} from '../../src/services/bookingApi';
import type { PublicAvailabilitySlot, PublicService } from '../../src/types/api';
import { isHttpError } from '../../src/types/api';
import { formatLocalDateKey, getIsoDateKey } from '../../src/utils/date';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function fmt(d: Date): string {
  return formatLocalDateKey(d);
}

function getWeekStart(dateInput: string): string {
  const date = new Date(`${dateInput}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return fmt(date);
}

function formatHour(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function mapErrorMessage(status: number): string {
  if (status === 400) return 'Revisa nombre, celular y horario seleccionado.';
  if (status === 404) return 'Servicio no encontrado. Actualiza la mini app.';
  if (status === 409) return 'Ese horario ya no esta disponible. Elige otro.';
  if (status === 413) return 'Las notas son demasiado largas. Reduce el texto.';
  if (status === 422) return 'La cita debe solicitarse con al menos 30 minutos de anticipacion.';
  if (status === 429) return 'Demasiados intentos. Intenta en unos minutos.';
  if (status === 500) return 'Error inesperado. Intenta nuevamente.';
  return 'No se pudo enviar la solicitud.';
}

export default function MiniAppBookingScreen() {
  const params = useLocalSearchParams<{ token?: string | string[]; phone?: string | string[]; fullName?: string | string[] }>();
  const router = useRouter();
  const today = fmt(new Date());

  const token = firstParam(params.token).trim();
  const [fullName, setFullName] = useState(firstParam(params.fullName));
  const [phone, setPhone] = useState(firstParam(params.phone));
  const [services, setServices] = useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<PublicAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);

    try {
      const response = await getPublicServices();
      setServices(response);
      if (response.length > 0) {
        setServiceId((prev) => prev || response[0].id);
      }
    } catch (error) {
      if (isHttpError(error)) {
        setServicesError(mapErrorMessage(error.status));
      } else {
        setServicesError('No se pudo cargar servicios. Intenta nuevamente.');
      }
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const loadAvailability = useCallback(async () => {
    if (!serviceId) {
      setAvailabilitySlots([]);
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError(null);

    try {
      const weekStart = getWeekStart(selectedDate);
      const slots = await getPublicAvailability(serviceId, weekStart);
      setAvailabilitySlots(slots);

      const availableDates = Array.from(new Set(slots.map((slot) => getIsoDateKey(slot.slotStartAt)))).sort();

      if (availableDates.length === 0) {
        setSelectedDate(weekStart);
        setSelectedSlotStartAt('');
        return;
      }

      setSelectedDate((prev) => (availableDates.includes(prev) ? prev : availableDates[0]));
      setSelectedSlotStartAt('');
    } catch (error) {
      if (isHttpError(error)) {
        setAvailabilityError(mapErrorMessage(error.status));
      } else {
        setAvailabilityError('No se pudo cargar disponibilidad. Intenta nuevamente.');
      }
      setAvailabilitySlots([]);
      setSelectedSlotStartAt('');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [selectedDate, serviceId]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const days = useMemo(() => {
    return Array.from(
      new Set(availabilitySlots.map((slot) => getIsoDateKey(slot.slotStartAt)))
    ).sort();
  }, [availabilitySlots]);

  const slots = useMemo(() => {
    return availabilitySlots
      .filter((slot) => getIsoDateKey(slot.slotStartAt) === selectedDate)
      .sort((a, b) => new Date(a.slotStartAt).getTime() - new Date(b.slotStartAt).getTime());
  }, [availabilitySlots, selectedDate]);

  const submitDisabled =
    isSubmitting ||
    servicesLoading ||
    availabilityLoading ||
    !fullName.trim() ||
    !phone.trim() ||
    !serviceId ||
    !selectedSlotStartAt;

  const handleSubmit = async () => {
    if (submitDisabled) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await createPublicBookingRequest({
        fullName: fullName.trim(),
        phone: phone.trim(),
        serviceId,
        // slotStartAt from backend is the source of truth for timezone and exact slot boundaries.
        startAt: selectedSlotStartAt,
        notes: notes.trim() ? notes.trim() : undefined,
        token: token || undefined,
      });

      router.replace({
        pathname: '/miniapp/success',
        params: {
          appointmentId: response.appointment.id,
        },
      });
    } catch (error) {
      if (isHttpError(error)) {
        setErrorMsg(mapErrorMessage(error.status));
      } else {
        setErrorMsg('No se pudo conectar con el servidor. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Agendar cita</Text>
          <Text style={styles.subtitle}>Completa tus datos y envia tu solicitud</Text>
        </View>

        <View style={styles.card}>
          {servicesLoading ? <Text style={styles.infoText}>Cargando servicios...</Text> : null}
          {servicesError ? <Text style={styles.errorText}>{servicesError}</Text> : null}

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.gray500}
            style={styles.input}
          />

          <Text style={styles.label}>Celular</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+52..."
            keyboardType="phone-pad"
            placeholderTextColor={colors.gray500}
            style={styles.input}
          />

          <Text style={styles.label}>Servicio</Text>
          <View style={styles.optionsWrap}>
            {services.map((service) => {
              const active = service.id === serviceId;
              return (
                <TouchableOpacity
                  key={service.id}
                  onPress={() => {
                    setServiceId(service.id);
                    setSelectedSlotStartAt('');
                  }}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{service.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {availabilityLoading ? <Text style={styles.infoText}>Cargando disponibilidad...</Text> : null}
          {availabilityError ? <Text style={styles.errorText}>{availabilityError}</Text> : null}

          <Text style={styles.label}>Dia</Text>
          <View style={styles.optionsWrap}>
            {days.map((day) => {
              const active = day === selectedDate;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    setSelectedDate(day);
                    setSelectedSlotStartAt('');
                  }}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Horario</Text>
          <View style={styles.optionsWrap}>
            {slots.map((slot) => {
              const active = slot.slotStartAt === selectedSlotStartAt;
              return (
                <TouchableOpacity
                  key={slot.slotStartAt}
                  onPress={() => setSelectedSlotStartAt(slot.slotStartAt)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {formatHour(slot.slotStartAt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!availabilityLoading && !availabilityError && slots.length === 0 ? (
            <Text style={styles.infoText}>Sin horarios disponibles para el dia seleccionado.</Text>
          ) : null}

          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Detalles para tu cita"
            placeholderTextColor={colors.gray500}
            style={[styles.input, styles.textArea]}
            multiline
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={submitDisabled}
            style={[styles.submitBtn, submitDisabled && styles.submitBtnDisabled]}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.submitText}>Enviar solicitud</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helpText}>Te avisaremos por WhatsApp cuando sea aprobada.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { gap: spacing.xxs },
  title: { ...typography.h2, color: colors.white },
  subtitle: { ...typography.bodySmall, color: colors.gray400 },
  card: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: { ...typography.caption, color: colors.gray400, fontWeight: '700', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionBtn: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  optionBtnDisabled: { opacity: 0.35 },
  optionText: { ...typography.bodySmall, color: colors.white },
  optionTextActive: { color: colors.black, fontWeight: '700' },
  submitBtn: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { ...typography.button, color: colors.black },
  infoText: { ...typography.bodySmall, color: colors.gray400 },
  errorText: { ...typography.bodySmall, color: colors.error },
  helpText: { ...typography.caption, color: colors.gray500, textAlign: 'center' },
});
