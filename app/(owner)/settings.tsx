import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('Jaquelina López Barber Studio');
  const [slotDuration, setSlotDuration] = useState('45');
  const [buffer, setBuffer] = useState('15');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [timezone, setTimezone] = useState('America/Mexico_City');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Configuración</Text>
          <Text style={styles.headerSubtitle}>Ajustes del negocio</Text>
        </View>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs },
  headerContent: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSubtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xl },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },
  sectionTitle: { ...typography.h3, color: colors.gray900 },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray900,
  },
  readonlyField: {
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readonlyText: { ...typography.body, color: colors.gray600 },
  row: { flexDirection: 'row', gap: spacing.md },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  optionInfo: { flex: 1, marginRight: spacing.md },
  optionLabel: { ...typography.subtitle, color: colors.gray900, fontSize: 14 },
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
    backgroundColor: colors.infoLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  infoText: { ...typography.bodySmall, color: colors.info, flex: 1 },
});
