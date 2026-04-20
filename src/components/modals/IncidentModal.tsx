import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SEVERITY_LEVELS = [
  { key: 'low', label: 'Baja', icon: 'information-circle' as const, color: '#42A5F5', description: 'Algo menor, no afecta citas' },
  { key: 'medium', label: 'Media', icon: 'alert-circle' as const, color: '#FFA726', description: 'Puede requerir reprogramar' },
  { key: 'high', label: 'Alta', icon: 'warning' as const, color: '#EF5350', description: 'Cancelación de varias citas' },
  { key: 'emergency', label: 'Emergencia', icon: 'flame' as const, color: '#B71C1C', description: 'Cierre temporal completo' },
];

const QUICK_REASONS = [
  'Falla de luz',
  'Problema de agua',
  'Equipo descompuesto',
  'Emergencia personal',
  'Enfermedad',
  'Clima severo',
  'Insumos agotados',
  'Otro',
];

export function IncidentModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [severity, setSeverity] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [cancelCitas, setCancelCitas] = useState(false);
  const [notifyClients, setNotifyClients] = useState(true);

  const severityConfig = SEVERITY_LEVELS.find(s => s.key === severity);

  const toggleReason = (r: string) => {
    setSelectedReasons(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  const handleCreate = () => {
    const affectedCount = severity === 'emergency' ? 'todas las citas del día' :
      severity === 'high' ? '3 citas afectadas' :
      severity === 'medium' ? '1 cita afectada' : 'ninguna cita afectada';

    Alert.alert(
      '⚠️ Incidencia registrada (simulación)',
      `Severidad: ${severityConfig?.label}\nMotivo: ${selectedReasons.join(', ') || 'No especificado'}\nDescripción: ${description || '—'}\nImpacto: ${affectedCount}\n${cancelCitas ? '❌ Citas canceladas' : '✅ Citas intactas'}\n${notifyClients ? '📱 Clientes notificados' : '🔇 Sin notificación'}`,
      [{ text: 'OK', onPress: onClose }],
    );
    resetForm();
  };

  const resetForm = () => {
    setSeverity(null);
    setSelectedReasons([]);
    setDescription('');
    setCancelCitas(false);
    setNotifyClients(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Header */}
          <View style={[styles.header, severityConfig && { borderBottomColor: `${severityConfig.color}30` }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, severityConfig && { backgroundColor: `${severityConfig.color}15` }]}>
                <Ionicons name="warning" size={20} color={severityConfig?.color || colors.error} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Reportar incidencia</Text>
                {severityConfig && (
                  <Text style={[styles.headerSub, { color: severityConfig.color }]}>
                    Severidad: {severityConfig.label}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Severity */}
            <Text style={styles.sectionTitle}>Nivel de severidad</Text>
            <View style={styles.severityGrid}>
              {SEVERITY_LEVELS.map(s => {
                const isSelected = severity === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.severityCard,
                      isSelected && { borderColor: s.color, backgroundColor: `${s.color}08` },
                    ]}
                    onPress={() => setSeverity(s.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.severityIconWrap, { backgroundColor: `${s.color}15` }]}>
                      <Ionicons name={s.icon} size={24} color={s.color} />
                    </View>
                    <Text style={[styles.severityLabel, isSelected && { color: s.color, fontWeight: '700' }]}>
                      {s.label}
                    </Text>
                    <Text style={styles.severityDesc}>{s.description}</Text>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: s.color }]}>
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick reasons */}
            <Text style={styles.sectionTitle}>Motivo</Text>
            <View style={styles.reasonGrid}>
              {QUICK_REASONS.map(r => {
                const isSelected = selectedReasons.includes(r);
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                    onPress={() => toggleReason(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe la incidencia con más detalle..."
              placeholderTextColor={colors.gray400}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Impact preview */}
            {severity && (
              <View style={[styles.impactCard, { borderLeftColor: severityConfig?.color }]}>
                <Text style={styles.impactTitle}>
                  <Ionicons name="pulse" size={14} color={severityConfig?.color} /> Impacto estimado
                </Text>
                {severity === 'emergency' && (
                  <Text style={styles.impactText}>
                    Se cancelarán <Text style={styles.impactBold}>todas las citas de hoy</Text> (4 citas). Los clientes serán notificados automáticamente.
                  </Text>
                )}
                {severity === 'high' && (
                  <Text style={styles.impactText}>
                    Se cancelarán <Text style={styles.impactBold}>3 citas</Text> de las próximas 4 horas. Los clientes serán notificados.
                  </Text>
                )}
                {severity === 'medium' && (
                  <Text style={styles.impactText}>
                    Podría requerir <Text style={styles.impactBold}>reprogramar 1 cita</Text>. Se enviará aviso al cliente afectado.
                  </Text>
                )}
                {severity === 'low' && (
                  <Text style={styles.impactText}>
                    <Text style={styles.impactBold}>Sin impacto en citas.</Text> Se registra para seguimiento interno.
                  </Text>
                )}
              </View>
            )}

            {/* Toggle options */}
            <View style={styles.toggleSection}>
              <TouchableOpacity
                style={[styles.toggleRow, cancelCitas && styles.toggleRowActive]}
                onPress={() => setCancelCitas(!cancelCitas)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cancelCitas ? 'close-circle' : 'close-circle-outline'}
                  size={22}
                  color={cancelCitas ? colors.error : colors.gray500}
                />
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleLabel, cancelCitas && { color: colors.error }]}>
                    Cancelar citas afectadas
                  </Text>
                  <Text style={styles.toggleSub}>Las citas serán marcadas como canceladas</Text>
                </View>
                <View style={[styles.toggleTrack, cancelCitas && styles.toggleTrackOn]}>
                  <View style={[styles.toggleThumb, cancelCitas && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleRow, notifyClients && styles.toggleRowActiveGold]}
                onPress={() => setNotifyClients(!notifyClients)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={notifyClients ? 'notifications' : 'notifications-outline'}
                  size={22}
                  color={notifyClients ? colors.gold : colors.gray500}
                />
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleLabel, notifyClients && { color: colors.gold }]}>
                    Notificar clientes
                  </Text>
                  <Text style={styles.toggleSub}>Los clientes recibirán un mensaje automático</Text>
                </View>
                <View style={[styles.toggleTrack, notifyClients && styles.toggleTrackGold]}>
                  <View style={[styles.toggleThumb, notifyClients && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCreate, !severity && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!severity}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={18} color={colors.white} />
              <Text style={styles.btnCreateText}>Registrar incidencia</Text>
            </TouchableOpacity>
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
    maxHeight: '85%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  headerSub: {
    ...typography.caption,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  severityCard: {
    width: '47%',
    minWidth: 140,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    alignItems: 'center',
    gap: spacing.xs,
  },
  severityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray400,
  },
  severityDesc: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  reasonChipSelected: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray400,
  },
  reasonTextSelected: {
    color: colors.error,
    fontWeight: '600',
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  impactCard: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    marginTop: spacing.sm,
  },
  impactTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
    marginBottom: spacing.xs,
  },
  impactText: {
    ...typography.bodySmall,
    color: colors.gray400,
    lineHeight: 19,
  },
  impactBold: {
    fontWeight: '700',
    color: colors.white,
  },
  toggleSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.md,
  },
  toggleRowActive: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}05`,
  },
  toggleRowActiveGold: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}08`,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.gray400,
  },
  toggleSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: colors.error,
  },
  toggleTrackGold: {
    backgroundColor: colors.gold,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray400,
    ...shadows.card,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray800,
    gap: spacing.md,
  },
  btnCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  btnCancelText: {
    ...typography.buttonSmall,
    color: colors.gray400,
  },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnCreateText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
