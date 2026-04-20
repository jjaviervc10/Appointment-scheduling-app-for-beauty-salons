import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';

export default function SettingsScreen() {
  const [businessName, setBusinessName] = useState('Jaquelina López Barber Studio');
  const [slotDuration, setSlotDuration] = useState('45');
  const [buffer, setBuffer] = useState('15');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [timezone, setTimezone] = useState('America/Mexico_City');

  return (
    <View style={styles.container}>
      <TopHeader
        title="Configuración"
        subtitle="Ajustes del negocio"
      />

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

        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
          <Text style={styles.infoText}>
            Los cambios se aplican inmediatamente. La configuración de notificaciones requiere que el servicio de WhatsApp esté activo.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
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
  saveButtonText: { ...typography.button, color: colors.black },
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
