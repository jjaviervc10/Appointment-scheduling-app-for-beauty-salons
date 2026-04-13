import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { IncidentCard } from '../incidents/IncidentCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { fetchActiveIncidents } from '../../services/incidents';
import type { Incident } from '../../types/database';

export function IncidentsInlineView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('17:00');

  useEffect(() => {
    fetchActiveIncidents().then(data => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  const handleCreateIncident = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Ingresa un motivo para la incidencia.');
      return;
    }
    Alert.alert('Incidencia registrada', 'Se bloqueará el horario y se notificará a los clientes afectados.', [
      { text: 'OK', onPress: () => setShowForm(false) },
    ]);
  };

  const affectedClients = [
    { name: 'Ana López', time: '12:45 pm', service: 'Corte de cabello' },
    { name: 'Martha Ruiz', time: '4:00 pm', service: 'Peinado especial' },
  ];

  return (
    <View style={styles.container}>
      {/* Active Incidents */}
      {incidents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incidencias activas</Text>
          {incidents.map(inc => (
            <IncidentCard key={inc.id} incident={inc} showActions />
          ))}
        </View>
      )}

      {/* New Incident Form */}
      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Nueva incidencia</Text>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Motivo</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Imprevisto familiar"
              placeholderTextColor={colors.gray400}
              value={title}
              onChangeText={setTitle}
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Detalles adicionales..."
              placeholderTextColor={colors.gray400}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Bloquear desde</Text>
              <TextInput
                style={styles.textInput}
                placeholder="HH:mm"
                placeholderTextColor={colors.gray400}
                value={blockStart}
                onChangeText={setBlockStart}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Hasta</Text>
              <TextInput
                style={styles.textInput}
                placeholder="HH:mm"
                placeholderTextColor={colors.gray400}
                value={blockEnd}
                onChangeText={setBlockEnd}
              />
            </View>
          </View>
          <View style={styles.affectedSection}>
            <Text style={styles.affectedTitle}>Clientes afectados ({affectedClients.length})</Text>
            {affectedClients.map((client, idx) => (
              <View key={idx} style={styles.affectedRow}>
                <View style={styles.affectedInfo}>
                  <Text style={styles.affectedName}>{client.name}</Text>
                  <Text style={styles.affectedMeta}>{client.time} · {client.service}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.formActions}>
            <PrimaryButton label="Avisar" onPress={handleCreateIncident} icon="notifications-outline" />
            <SecondaryButton label="Reprogramar" onPress={() => Alert.alert('TODO', 'Reprogramación masiva')} />
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.newIncidentButton} onPress={() => setShowForm(true)} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={24} color={colors.error} />
          <View style={styles.newIncidentInfo}>
            <Text style={styles.newIncidentTitle}>Registrar nueva incidencia</Text>
            <Text style={styles.newIncidentSubtitle}>Bloquear horario y notificar clientes afectados</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>
      )}

      {/* Info */}
      <View style={styles.infoBar}>
        <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
        <Text style={styles.infoText}>
          Al registrar una incidencia se bloquea automáticamente el horario afectado y se preparan notificaciones para los clientes con citas en ese rango.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.gray900 },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },
  formTitle: { ...typography.h3, color: colors.gray900 },
  formField: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray900,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1, gap: spacing.xs },
  affectedSection: {
    backgroundColor: colors.error + '08',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  affectedTitle: { ...typography.subtitle, color: colors.error },
  affectedRow: { flexDirection: 'row', alignItems: 'center' },
  affectedInfo: { flex: 1 },
  affectedName: { ...typography.body, color: colors.gray900 },
  affectedMeta: { ...typography.caption, color: colors.gray600 },
  formActions: { flexDirection: 'row', gap: spacing.md },
  newIncidentButton: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  newIncidentInfo: { flex: 1 },
  newIncidentTitle: { ...typography.subtitle, color: colors.gray900 },
  newIncidentSubtitle: { ...typography.caption, color: colors.gray600, marginTop: spacing.xxs },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoText: { ...typography.caption, color: colors.gray500, flex: 1 },
});
