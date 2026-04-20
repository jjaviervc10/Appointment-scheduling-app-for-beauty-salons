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
import { MOCK_CLIENTS, MOCK_SERVICES } from '../../services/mock-data';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function clampHour(v: string): string {
  const n = parseInt(v, 10);
  if (isNaN(n)) return '';
  if (n < 1) return '1';
  if (n > 12) return '12';
  return String(n);
}
function clampMinute(v: string): string {
  const n = parseInt(v, 10);
  if (isNaN(n)) return '';
  if (n < 0) return '00';
  if (n > 59) return '59';
  return v.length === 1 ? v : String(n).padStart(2, '0');
}

export function NewAppointmentModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [hourText, setHourText] = useState('10');
  const [minuteText, setMinuteText] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const client = MOCK_CLIENTS.find(c => c.id === selectedClient);
  const service = MOCK_SERVICES.find(s => s.id === selectedService);

  const displayTime = `${hourText || '12'}:${minuteText || '00'} ${period}`;

  const handleCreate = () => {
    Alert.alert(
      '✅ Cita creada (simulación)',
      `Cliente: ${client?.name}\nServicio: ${service?.name}\nHora: ${displayTime}\nDuración: ${service?.duration_minutes} min\nPrecio: $${service?.price}`,
      [{ text: 'OK', onPress: onClose }],
    );
    resetForm();
  };

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedService(null);
    setHourText('10');
    setMinuteText('00');
    setPeriod('AM');
    setNotes('');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canAdvance = () => {
    if (step === 1) return !!selectedClient;
    if (step === 2) return !!selectedService;
    return true;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          {/* Header */}
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

          {/* Steps indicator */}
          <View style={styles.steps}>
            {[1, 2, 3].map(s => (
              <View key={s} style={styles.stepRow}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  {step > s ? (
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  ) : (
                    <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
                  {s === 1 ? 'Cliente' : s === 2 ? 'Servicio' : 'Horario'}
                </Text>
                {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {step === 1 && (
              <>
                <Text style={styles.sectionTitle}>Selecciona un cliente</Text>
                {MOCK_CLIENTS.map(c => {
                  const isSelected = selectedClient === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => setSelectedClient(c.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                        <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{c.name}</Text>
                        <Text style={styles.optionSub}>{c.phone} · {c.totalAppts} visitas</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.gold} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.sectionTitle}>Selecciona un servicio</Text>
                {MOCK_SERVICES.map(s => {
                  const isSelected = selectedService === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => setSelectedService(s.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.serviceIcon, isSelected && styles.serviceIconSelected]}>
                        <Ionicons name="cut" size={18} color={isSelected ? colors.white : colors.gold} />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{s.name}</Text>
                        <Text style={styles.optionSub}>{s.duration_minutes} min · ${s.price} MXN</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.gold} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.sectionTitle}>Horario y notas</Text>

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Cliente</Text>
                  <Text style={styles.summaryValue}>{client?.name}</Text>
                  <Text style={styles.summaryLabel}>Servicio</Text>
                  <Text style={styles.summaryValue}>{service?.name} · {service?.duration_minutes} min · ${service?.price}</Text>
                </View>

                {/* Time input */}
                <Text style={styles.fieldLabel}>Hora</Text>
                <View style={styles.manualTimeRow}>
                  <View style={styles.timeInputGroup}>
                    <TextInput
                      style={styles.timeInput}
                      value={hourText}
                      onChangeText={(v) => setHourText(clampHour(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="HH"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={minuteText}
                      onChangeText={(v) => setMinuteText(clampMinute(v.replace(/[^0-9]/g, '')))}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                      onPress={() => setPeriod('AM')}
                    >
                      <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                      onPress={() => setPeriod('PM')}
                    >
                      <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Notas (opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Cliente solicita corte corto..."
                  placeholderTextColor={colors.gray400}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity style={styles.btnBack} onPress={() => setStep((step - 1) as 1 | 2)}>
                <Ionicons name="arrow-back" size={18} color={colors.gray700} />
                <Text style={styles.btnBackText}>Atrás</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.btnNext, !canAdvance() && styles.btnDisabled]}
                onPress={() => canAdvance() && setStep((step + 1) as 2 | 3)}
                disabled={!canAdvance()}
                activeOpacity={0.8}
              >
                <Text style={styles.btnNextText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.black} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnCreate} onPress={handleCreate} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle" size={20} color={colors.black} />
                <Text style={styles.btnCreateText}>Crear cita</Text>
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
    maxWidth: 520,
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
    backgroundColor: `${colors.gold}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.gold,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray400,
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray400,
    marginRight: spacing.xs,
  },
  stepLabelActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.gray800,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.gold,
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
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    gap: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}08`,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: {
    backgroundColor: colors.gold,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray400,
  },
  avatarTextSelected: {
    color: colors.white,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.gold}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIconSelected: {
    backgroundColor: colors.gold,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.white,
  },
  optionNameSelected: {
    color: colors.gold,
    fontWeight: '600',
  },
  optionSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.body,
    fontWeight: '500',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray400,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  manualTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeInput: {
    width: 52,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray400,
  },
  periodToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  periodBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray900,
  },
  periodBtnActive: {
    backgroundColor: colors.gold,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
  },
  periodTextActive: {
    color: colors.black,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
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
  btnBackText: {
    ...typography.buttonSmall,
    color: colors.gray400,
  },
  btnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnNextText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
  },
  btnCreateText: {
    ...typography.button,
    color: colors.black,
  },
});
