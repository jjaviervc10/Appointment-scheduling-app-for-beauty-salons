import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { createPublicBookingRequest, getPublicAvailability } from '../../services/bookingApi';
import { getOwnerClients, getOwnerServices } from '../../services/ownerApi';
import type { OwnerClientRow, OwnerServiceRow, PublicAvailabilitySlot } from '../../types/api';
import { isHttpError } from '../../types/api';
import { formatLocalDateKey, getIsoDateKey } from '../../utils/date';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type Step = 1 | 2 | 3;

const PAGE_SIZE = 50;

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date: Date): string {
  return formatLocalDateKey(date);
}

function formatHour(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function mapError(error: unknown): string {
  if (isHttpError(error)) {
    if (error.status === 400) return error.message || 'Revisa los datos de la cita.';
    if (error.status === 401) return 'No autorizado. Verifica el token owner.';
    if (error.status === 404) return 'Cliente, servicio o horario no encontrado.';
    if (error.status === 409) return 'Ese horario ya no esta disponible. Elige otro.';
    if (error.status === 422) return error.message || 'La cita no cumple una regla de negocio.';
    if (error.status === 429) return 'Demasiados intentos. Intenta mas tarde.';
    return error.message || 'No se pudo completar la accion.';
  }
  return error instanceof Error ? error.message : 'Error desconocido al conectar con backend.';
}

export function NewAppointmentModal({ visible, onClose, onCreated }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [step, setStep] = useState<Step>(1);
  const [clients, setClients] = useState<OwnerClientRow[]>([]);
  const [services, setServices] = useState<OwnerServiceRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<PublicAvailabilitySlot[]>([]);
  const [notes, setNotes] = useState('');

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const weekStartKey = useMemo(() => fmt(weekStart), [weekStart]);

  const availableDates = useMemo(
    () => Array.from(new Set(availabilitySlots.map((slot) => getIsoDateKey(slot.slotStartAt)))).sort(),
    [availabilitySlots]
  );

  const visibleSlots = useMemo(
    () => availabilitySlots
      .filter((slot) => getIsoDateKey(slot.slotStartAt) === selectedDate)
      .sort((a, b) => new Date(a.slotStartAt).getTime() - new Date(b.slotStartAt).getTime()),
    [availabilitySlots, selectedDate]
  );

  const resetForm = useCallback(() => {
    setStep(1);
    setQuery('');
    setSelectedClientId(null);
    setSelectedServiceId(null);
    setWeekStart(getMonday(new Date()));
    setSelectedDate('');
    setSelectedSlotStartAt('');
    setAvailabilitySlots([]);
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, []);

  const loadClients = useCallback(async (search = '') => {
    setClientsLoading(true);
    setError(null);
    try {
      const result = await getOwnerClients({ search: search.trim() || undefined, page: 1, limit: PAGE_SIZE });
      setClients(result.data);
    } catch (loadError) {
      setClients([]);
      setError(mapError(loadError));
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setError(null);
    try {
      const result = await getOwnerServices({ active: true });
      setServices(result);
      setSelectedServiceId((prev) => prev ?? result[0]?.id ?? null);
    } catch (loadError) {
      setServices([]);
      setError(mapError(loadError));
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadClients();
    void loadServices();
  }, [loadClients, loadServices, visible]);

  useEffect(() => {
    if (!visible || !selectedServiceId) {
      setAvailabilitySlots([]);
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setError(null);

    getPublicAvailability(selectedServiceId, weekStartKey)
      .then((slots) => {
        if (cancelled) return;
        setAvailabilitySlots(slots);
        const dates = Array.from(new Set(slots.map((slot) => getIsoDateKey(slot.slotStartAt)))).sort();
        setSelectedDate((prev) => (prev && dates.includes(prev) ? prev : dates[0] ?? ''));
        setSelectedSlotStartAt('');
      })
      .catch((availabilityError) => {
        if (cancelled) return;
        setAvailabilitySlots([]);
        setSelectedDate('');
        setSelectedSlotStartAt('');
        setError(mapError(availabilityError));
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedServiceId, visible, weekStartKey]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    void loadClients(value);
  }, [loadClients]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!selectedClient || !selectedServiceId || !selectedSlotStartAt || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await createPublicBookingRequest({
        fullName: selectedClient.full_name,
        phone: selectedClient.phone,
        serviceId: selectedServiceId,
        startAt: selectedSlotStartAt,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Solicitud creada',
        `La cita quedo registrada como ${response.appointment.status}. Puedes aprobarla desde pendientes.`,
        [{ text: 'OK' }]
      );
      onCreated?.();
      handleClose();
    } catch (submitError) {
      setError(mapError(submitError));
    } finally {
      setSubmitting(false);
    }
  }, [handleClose, notes, onCreated, selectedClient, selectedServiceId, selectedSlotStartAt, submitting]);

  const canAdvance = step === 1 ? !!selectedClient : step === 2 ? !!selectedServiceId : !!selectedSlotStartAt;
  const bodyLoading = (step === 1 && clientsLoading) || (step === 2 && servicesLoading);
  const weekEnd = addDays(weekStart, 6);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={20} color={colors.gold} />
              </View>
              <Text style={styles.headerTitle}>Nueva cita</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <View style={styles.steps}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.stepRow}>
                <View style={[styles.stepDot, step >= item && styles.stepDotActive]}>
                  {step > item ? (
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  ) : (
                    <Text style={[styles.stepNum, step >= item && styles.stepNumActive]}>{item}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, step >= item && styles.stepLabelActive]}>
                  {item === 1 ? 'Cliente' : item === 2 ? 'Servicio' : 'Horario'}
                </Text>
                {item < 3 ? <View style={[styles.stepLine, step > item && styles.stepLineActive]} /> : null}
              </View>
            ))}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {error ? (
              <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)} activeOpacity={0.8}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </TouchableOpacity>
            ) : null}

            {bodyLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={styles.loadingText}>Sincronizando con backend...</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={styles.sectionTitle}>Selecciona un cliente</Text>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={handleSearch}
                  placeholder="Buscar por nombre o celular"
                  placeholderTextColor={colors.gray400}
                />
                {clients.length === 0 && !clientsLoading ? (
                  <Text style={styles.emptyText}>No hay clientes para mostrar.</Text>
                ) : null}
                {clients.map((client) => {
                  const isSelected = selectedClientId === client.id;
                  return (
                    <TouchableOpacity
                      key={client.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => setSelectedClientId(client.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                        <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                          {client.full_name.split(' ').map((word) => word[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{client.full_name}</Text>
                        <Text style={styles.optionSub}>{client.phone}</Text>
                      </View>
                      {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.gold} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.sectionTitle}>Selecciona un servicio</Text>
                {services.length === 0 && !servicesLoading ? (
                  <Text style={styles.emptyText}>No hay servicios activos configurados.</Text>
                ) : null}
                {services.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => {
                        setSelectedServiceId(service.id);
                        setSelectedSlotStartAt('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.serviceIcon, isSelected && styles.serviceIconSelected]}>
                        <Ionicons name="cut" size={18} color={isSelected ? colors.white : colors.gold} />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{service.name}</Text>
                        <Text style={styles.optionSub}>
                          {service.duration_minutes} min
                        </Text>
                      </View>
                      {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.gold} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.sectionTitle}>Fecha y horario</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Cliente</Text>
                  <Text style={styles.summaryValue}>{selectedClient?.full_name}</Text>
                  <Text style={styles.summaryLabel}>Servicio</Text>
                  <Text style={styles.summaryValue}>
                    {selectedService?.name} - {selectedService?.duration_minutes} min
                  </Text>
                </View>

                <View style={styles.weekNav}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart((prev) => addDays(prev, -7))}>
                    <Ionicons name="chevron-back" size={18} color={colors.gray400} />
                  </TouchableOpacity>
                  <Text style={styles.weekLabel}>
                    {weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </Text>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart((prev) => addDays(prev, 7))}>
                    <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                  </TouchableOpacity>
                </View>

                {availabilityLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.gold} />
                    <Text style={styles.loadingText}>Cargando disponibilidad real...</Text>
                  </View>
                ) : null}

                <View style={styles.chipWrap}>
                  {availableDates.map((dateKey) => {
                    const active = selectedDate === dateKey;
                    const date = new Date(`${dateKey}T12:00:00`);
                    return (
                      <TouchableOpacity
                        key={dateKey}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                        onPress={() => {
                          setSelectedDate(dateKey);
                          setSelectedSlotStartAt('');
                        }}
                      >
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                          {date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!availabilityLoading && availableDates.length === 0 ? (
                  <Text style={styles.emptyText}>Sin disponibilidad para esta semana.</Text>
                ) : null}

                <View style={styles.slotGrid}>
                  {visibleSlots.map((slot) => {
                    const active = selectedSlotStartAt === slot.slotStartAt;
                    return (
                      <TouchableOpacity
                        key={slot.slotStartAt}
                        style={[styles.slotBtn, active && styles.slotBtnActive]}
                        onPress={() => setSelectedSlotStartAt(slot.slotStartAt)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.slotText, active && styles.slotTextActive]}>
                          {formatHour(slot.slotStartAt)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Notas (opcional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Detalles para la cita"
                  placeholderTextColor={colors.gray400}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {step > 1 ? (
              <TouchableOpacity style={styles.btnBack} onPress={() => setStep((step - 1) as Step)} disabled={submitting}>
                <Ionicons name="arrow-back" size={18} color={colors.gray700} />
                <Text style={styles.btnBackText}>Atras</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.btnNext, !canAdvance && styles.btnDisabled]}
                onPress={() => canAdvance && setStep((step + 1) as Step)}
                disabled={!canAdvance}
                activeOpacity={0.8}
              >
                <Text style={styles.btnNextText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.black} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnCreate, (!canAdvance || submitting) && styles.btnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={!canAdvance || submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color={colors.black} />
                )}
                <Text style={styles.btnCreateText}>{submitting ? 'Creando...' : 'Crear solicitud'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 560,
    maxHeight: '88%',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  cardMobile: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.gold}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.white },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.gold },
  stepNum: { fontSize: 11, fontWeight: '600', color: colors.gray400 },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: 12, fontWeight: '500', color: colors.gray400, marginRight: spacing.xs },
  stepLabelActive: { color: colors.gold, fontWeight: '600' },
  stepLine: { width: 24, height: 2, backgroundColor: colors.gray800, marginHorizontal: spacing.xs },
  stepLineActive: { backgroundColor: colors.gold },
  body: { flex: 1 },
  bodyContent: { padding: spacing.xl, gap: spacing.md },
  sectionTitle: { ...typography.subtitle, color: colors.white, marginBottom: spacing.xs },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
  },
  loadingText: { ...typography.bodySmall, color: colors.gray400 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '14',
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySmall, flex: 1, color: colors.error },
  emptyText: { ...typography.bodySmall, color: colors.gray500, paddingVertical: spacing.sm },
  searchInput: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.md,
  },
  optionCardSelected: { borderColor: colors.gold, backgroundColor: `${colors.gold}08` },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: { backgroundColor: colors.gold },
  avatarText: { fontSize: 14, fontWeight: '600', color: colors.gray400 },
  avatarTextSelected: { color: colors.white },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.gold}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIconSelected: { backgroundColor: colors.gold },
  optionInfo: { flex: 1 },
  optionName: { ...typography.body, fontWeight: '500', color: colors.white },
  optionNameSelected: { color: colors.gold, fontWeight: '600' },
  optionSub: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  summaryLabel: { ...typography.caption, color: colors.gray500, textTransform: 'uppercase' },
  summaryValue: { ...typography.body, fontWeight: '500', color: colors.white, marginBottom: spacing.xs },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabel: { ...typography.bodySmall, flex: 1, color: colors.white, textAlign: 'center', fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dateChip: {
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray800,
  },
  dateChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dateChipText: { ...typography.bodySmall, color: colors.white },
  dateChipTextActive: { color: colors.black, fontWeight: '700' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  slotBtn: {
    minWidth: 82,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray800,
  },
  slotBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  slotText: { ...typography.bodySmall, color: colors.white, fontWeight: '600' },
  slotTextActive: { color: colors.black },
  fieldLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.gray400, marginTop: spacing.sm },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  btnBackText: { ...typography.buttonSmall, color: colors.gray400 },
  btnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnNextText: { ...typography.buttonSmall, color: colors.black },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnCreateText: { ...typography.button, color: colors.black },
  btnDisabled: { opacity: 0.4 },
});
