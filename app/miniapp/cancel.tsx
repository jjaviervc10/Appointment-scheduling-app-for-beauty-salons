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
import { cancelPublicAppointment, getPublicMiniAppToken } from '../../src/services/bookingApi';
import type { PublicMiniAppTokenAppointment, PublicMiniAppTokenResponse } from '../../src/types/api';
import { isHttpError } from '../../src/types/api';
import { returnToWhatsApp, useMiniAppExitGuard } from '../../src/hooks/useMiniAppExitGuard';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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

function mapErrorMessage(status: number): string {
  if (status === 400) return 'Revisa los datos enviados.';
  if (status === 404) return 'El enlace ya no es valido o la cita no existe.';
  if (status === 409) return 'La cita cambio de estado. Vuelve a abrir el enlace desde WhatsApp.';
  if (status === 422) return 'Esta cita no se puede cancelar desde este enlace.';
  if (status === 429) return 'Demasiados intentos. Intenta mas tarde.';
  return 'No se pudo completar. Intenta otra vez.';
}

export default function MiniAppCancelScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
    returnUrl?: string | string[];
    waReturnUrl?: string | string[];
  }>();

  const token = firstParam(params.token).trim();
  const whatsappReturnUrl = firstParam(params.returnUrl).trim() || firstParam(params.waReturnUrl).trim();

  const [tokenData, setTokenData] = useState<PublicMiniAppTokenResponse | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReturnToWhatsApp = useCallback(() => {
    void returnToWhatsApp(whatsappReturnUrl);
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

      if (response.purpose !== 'cancel') {
        setTokenData(null);
        setTokenError('Este enlace no corresponde a cancelacion.');
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

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const handleSubmit = async () => {
    if (!selectedAppointment || !confirmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await cancelPublicAppointment({
        token,
        appointmentId: selectedAppointment.id,
        reason: reason.trim() || null,
      });

      setSuccess(true);
    } catch (error) {
      setSubmitError(isHttpError(error) ? mapErrorMessage(error.status) : 'No se pudo cancelar la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.appShell}>
          <BrandHeader onExit={handleReturnToWhatsApp} />

          {tokenLoading ? (
            <StateCard icon="time-outline" title="Validando enlace" message="Estamos buscando tu cita." loading />
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
              title="Cita cancelada"
              message="Cancelamos tu cita y te enviaremos la confirmacion por WhatsApp."
              actionLabel="Volver al chat de WhatsApp"
              onAction={handleReturnToWhatsApp}
              success
            />
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>Opcion 4</Text>
                <Text style={styles.cardTitle}>Cancelar cita</Text>
                <Text style={styles.cardHelper}>Confirma cuidadosamente antes de cancelar.</Text>
              </View>

              {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

              {appointments.length > 1 ? (
                <>
                  <Text style={styles.label}>Cita a cancelar</Text>
                  <View style={styles.optionStack}>
                    {appointments.map((appointment) => {
                      const active = appointment.id === selectedAppointmentId;
                      return (
                        <TouchableOpacity
                          key={appointment.id}
                          style={[styles.appointmentCard, active && styles.selectedCard]}
                          onPress={() => {
                            setSelectedAppointmentId(appointment.id);
                            setConfirmed(false);
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
                  <Text style={styles.summaryLabel}>Cita seleccionada</Text>
                  <Text style={styles.summaryTitle}>{selectedAppointment.serviceName ?? 'Servicio'}</Text>
                  <Text style={styles.summaryMeta}>{formatDateTime(selectedAppointment.startAt)}</Text>
                </View>
              ) : (
                <EmptyMessage text="No encontramos citas activas para cancelar." />
              )}

              {selectedAppointment ? (
                <>
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={18} color={colors.error} />
                    <Text style={styles.warningText}>
                      Esta accion cancelara tu cita. Si solo necesitas cambiar el horario, vuelve al chat y elige la opcion 3.
                    </Text>
                  </View>

                  <Text style={styles.label}>Motivo opcional</Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Ej. Se me complico asistir"
                    placeholderTextColor={colors.gray500}
                    style={[styles.input, styles.notesInput]}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.confirmRow, confirmed && styles.confirmRowActive]}
                    onPress={() => setConfirmed((value) => !value)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.checkbox, confirmed && styles.checkboxActive]}>
                      {confirmed ? <Ionicons name="checkmark" size={14} color={colors.black} /> : null}
                    </View>
                    <Text style={[styles.confirmText, confirmed && styles.confirmTextActive]}>
                      Confirmo que quiero cancelar esta cita.
                    </Text>
                  </TouchableOpacity>

                  <PrimaryAction
                    label="Cancelar cita"
                    onPress={() => void handleSubmit()}
                    disabled={!confirmed || isSubmitting}
                    loading={isSubmitting}
                    danger
                  />
                </>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BrandHeader({ onExit }: { onExit: () => void }) {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/LogoJL.png')} style={styles.logo} resizeMode="contain" />
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

function EmptyMessage({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function PrimaryAction({
  label,
  onPress,
  disabled,
  loading = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, danger && styles.dangerButton, disabled && styles.disabledButton]}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    padding: spacing.md,
  },
  warningText: { ...typography.bodySmall, color: colors.error, flex: 1 },
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
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
    padding: spacing.md,
  },
  confirmRowActive: {
    borderColor: colors.goldDark,
    backgroundColor: colors.gold + '20',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxActive: {
    backgroundColor: colors.gold,
    borderColor: colors.goldDark,
  },
  confirmText: { ...typography.bodySmall, color: colors.gray700, flex: 1 },
  confirmTextActive: { color: colors.black, fontWeight: '700' },
  primaryButton: {
    minHeight: 60,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    alignSelf: 'stretch',
  },
  dangerButton: { backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error },
  disabledButton: { opacity: 0.45 },
  primaryText: { ...typography.button, color: colors.black },
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
