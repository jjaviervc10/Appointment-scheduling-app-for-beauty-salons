import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { PasskeySection } from '../../src/components/auth/PasskeySection';
import { getOwnerSettings, updateOwnerSettings } from '../../src/services/ownerApi';
import { isHttpError } from '../../src/types/api';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [slotDuration, setSlotDuration] = useState('');
  const [buffer, setBuffer] = useState('');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOwnerSettings()
      .then((settings) => {
        if (cancelled) return;
        setBusinessName(settings.businessName);
        setSlotDuration(String(settings.slotDurationMinutes));
        setBuffer(String(settings.bufferMinutes));
        setMaxAdvanceDays(String(settings.maxAdvanceDays));
        setTimezone(settings.timezone);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          isHttpError(err) ? err.message : 'No se pudo cargar la configuración del negocio.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    const slotDurationMinutes = parseInt(slotDuration, 10);
    const bufferMinutes = parseInt(buffer, 10);
    const maxAdvanceDaysNum = parseInt(maxAdvanceDays, 10);

    if (!businessName.trim() || businessName.trim().length < 2) {
      setSaveError('El nombre del negocio debe tener al menos 2 caracteres.');
      return;
    }
    if (isNaN(slotDurationMinutes) || slotDurationMinutes < 15 || slotDurationMinutes > 240) {
      setSaveError('La duración por defecto debe estar entre 15 y 240 minutos.');
      return;
    }
    if (isNaN(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
      setSaveError('El buffer debe estar entre 0 y 120 minutos.');
      return;
    }
    if (isNaN(maxAdvanceDaysNum) || maxAdvanceDaysNum < 1 || maxAdvanceDaysNum > 365) {
      setSaveError('El máximo de anticipación debe estar entre 1 y 365 días.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateOwnerSettings({
        businessName: businessName.trim(),
        slotDurationMinutes,
        bufferMinutes,
        maxAdvanceDays: maxAdvanceDaysNum,
      });
      setBusinessName(updated.businessName);
      setSlotDuration(String(updated.slotDurationMinutes));
      setBuffer(String(updated.bufferMinutes));
      setMaxAdvanceDays(String(updated.maxAdvanceDays));
      setTimezone(updated.timezone);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(
        isHttpError(err) ? err.message : 'No se pudo guardar la configuración.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="Configuración"
        subtitle="Ajustes del negocio"
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Business Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información del negocio</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre del negocio</Text>
            <TextInput
              style={styles.textInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Zona horaria</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{timezone}</Text>
              <Ionicons name="globe-outline" size={16} color={colors.gray500} />
            </View>
          </View>
        </View>

        {/* Scheduling Config */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Configuración de citas</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Duración por defecto (min)</Text>
              <TextInput
                style={styles.textInput}
                value={slotDuration}
                onChangeText={setSlotDuration}
                keyboardType="numeric"
                placeholderTextColor={colors.gray400}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Buffer entre citas (min)</Text>
              <TextInput
                style={styles.textInput}
                value={buffer}
                onChangeText={setBuffer}
                keyboardType="numeric"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Días máximo de anticipación</Text>
            <TextInput
              style={styles.textInput}
              value={maxAdvanceDays}
              onChangeText={setMaxAdvanceDays}
              keyboardType="numeric"
              placeholderTextColor={colors.gray400}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Confirmación automática por WhatsApp</Text>
              <Text style={styles.optionDesc}>Enviar mensaje al cliente cuando aceptes su cita</Text>
            </View>
            <View style={[styles.toggleOn]}>
              <Text style={styles.toggleText}>Activo</Text>
            </View>
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Recordatorio 24h antes</Text>
              <Text style={styles.optionDesc}>Enviar recordatorio al cliente el día anterior</Text>
            </View>
            <View style={[styles.toggleOn]}>
              <Text style={styles.toggleText}>Activo</Text>
            </View>
          </View>
        </View>

        {/* Feedback */}
        {saveError ? (
          <View style={styles.feedbackError}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.feedbackErrorText}>{saveError}</Text>
          </View>
        ) : null}
        {saveSuccess ? (
          <View style={styles.feedbackSuccess}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={styles.feedbackSuccessText}>Configuración guardada correctamente.</Text>
          </View>
        ) : null}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          activeOpacity={0.8}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
          <Text style={styles.infoText}>
            Los cambios se aplican inmediatamente. La configuración de notificaciones requiere que el servicio de WhatsApp esté activo.
          </Text>
        </View>

        {/* Passkey / biometric access */}
        <View style={styles.sectionCard}>
          <PasskeySection />
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.gray400 },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorText: { ...typography.body, color: colors.error, textAlign: 'center' },
  scrollView: {
    flex: 1,
  },
  scrollContent: { padding: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.xl },
  sectionCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  sectionTitle: { ...typography.h3, color: colors.white },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.gray800,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.white,
  },
  readonlyField: {
    backgroundColor: colors.gray800,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readonlyText: { ...typography.body, color: colors.gray400 },
  row: { flexDirection: 'row', gap: spacing.md },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  optionInfo: { flex: 1, marginRight: spacing.md },
  optionLabel: { ...typography.subtitle, color: colors.white, fontSize: 14 },
  optionDesc: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  toggleOn: {
    backgroundColor: colors.statusConfirmedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  toggleText: { ...typography.caption, color: colors.statusConfirmed, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: { ...typography.button, color: colors.black },
  feedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  feedbackErrorText: { ...typography.bodySmall, color: colors.error, flex: 1 },
  feedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  feedbackSuccessText: { ...typography.bodySmall, color: colors.success, flex: 1 },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  infoText: { ...typography.bodySmall, color: colors.gray400, flex: 1 },
});
