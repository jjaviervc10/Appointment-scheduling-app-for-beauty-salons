/**
 * BlockDetailPanel — Right-side detail panel (desktop) or bottom-sheet modal (mobile)
 * Also exports the shared DisplayEntry types used by BlocksPanel.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';

// ─── Shared display types ─────────────────────────────────────────────────────

export interface BlockEntry {
  kind: 'block';
  id: string;          // composite "uuid:YYYY-MM-DD"
  rawId: string;       // actual row uuid for DELETE
  date: string;        // YYYY-MM-DD (expanded date)
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  title: string;       // from block.label (stored reason)
  description: string | null;
  blockType: string;   // "personal" | "comida" | "descanso" | "mandado" | "viaje" | "escuela" | "otro"
  isRecurring: boolean;
  recurrenceDow: number | null; // 0=Dom … 6=Sáb (JS getDay())
  source: 'real';
}

export interface IncidentEntry {
  kind: 'incident';
  id: string;
  rawId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string | null;
  blockType: 'incident';
  isRecurring: false;
  recurrenceDow: null;
  severity: string;
  affectedCount: number;
  isResolved: boolean;
  source: 'real' | 'mock';
}

export type DisplayEntry = BlockEntry | IncidentEntry;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DOW_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const DOW_FULL_PLURAL_ES = [
  'Todos los domingos', 'Todos los lunes', 'Todos los martes', 'Todos los miércoles',
  'Todos los jueves', 'Todos los viernes', 'Todos los sábados',
];

export const BLOCK_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  personal:    { icon: 'person',              color: '#42A5F5', label: 'Personal' },
  comida:      { icon: 'restaurant',          color: '#FF9800', label: 'Comida' },
  descanso:    { icon: 'bed',                 color: '#66BB6A', label: 'Descanso' },
  mandado:     { icon: 'car',                 color: '#AB47BC', label: 'Mandado' },
  viaje:       { icon: 'airplane',            color: '#26C6DA', label: 'Viaje' },
  escuela:     { icon: 'school',              color: '#7E57C2', label: 'Escuela' },
  otro:        { icon: 'ellipsis-horizontal', color: colors.gray500, label: 'Otro' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  low:       { color: colors.info,         label: 'Baja' },
  medium:    { color: colors.statusPending, label: 'Media' },
  high:      { color: colors.error,        label: 'Alta' },
  emergency: { color: '#B71C1C',           label: 'Emergencia' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function format12h(time: string): string {
  const [hourStr = '0', minStr = '00'] = time.split(':');
  let h = parseInt(hourStr, 10);
  const m = minStr.padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

export function durationLabel(start: string, end: string): string {
  const [sh = '0', sm = '0'] = start.split(':');
  const [eh = '0', em = '0'] = end.split(':');
  const mins =
    (parseInt(eh, 10) * 60 + parseInt(em, 10)) -
    (parseInt(sh, 10) * 60 + parseInt(sm, 10));
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const min = mins % 60;
  if (h > 0 && min > 0) return `${h}h ${min}min`;
  if (h > 0) return `${h} hora${h > 1 ? 's' : ''}`;
  return `${min} min`;
}

function formatDateFull(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return `${DOW_FULL_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}, ${d.getFullYear()}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlockDetailPanelProps {
  entry: DisplayEntry | null;
  isMobile: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;
  isEditing?: boolean;
  isResolving?: boolean;
  onClose: () => void;
  onDelete: (entry: DisplayEntry) => void;
  onDuplicate: (entry: DisplayEntry) => void;
  onEdit?: (entry: DisplayEntry) => void;
  onResolve?: (entry: DisplayEntry) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BlockDetailPanel({
  entry,
  isMobile,
  isDeleting,
  isDuplicating,
  isEditing = false,
  isResolving = false,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onResolve,
}: BlockDetailPanelProps) {
  const [showGuide, setShowGuide] = useState(false);
  if (!entry) return null;

  const isBlock = entry.kind === 'block';
  const isRecurring = entry.isRecurring;
  const typeConfig = isBlock ? (BLOCK_TYPE_CONFIG[entry.blockType] ?? BLOCK_TYPE_CONFIG.otro) : BLOCK_TYPE_CONFIG.otro;

  // For blocks: display block type name as title, stored label as description if different
  const displayTitle = isBlock ? typeConfig.label : entry.title;
  const displayDescription = isBlock
    ? (entry.title !== typeConfig.label ? entry.title : null)
    : entry.description;

  const duration = durationLabel(entry.startTime, entry.endTime);
  const dateLabel = formatDateFull(entry.date);
  const recurrenceLabel =
    isRecurring && entry.recurrenceDow !== null
      ? (DOW_FULL_PLURAL_ES[entry.recurrenceDow] ?? 'Recurrente')
      : null;

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detalle del bloqueo</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title section */}
        <View style={styles.titleSection}>
          {/* Type badge */}
          <View style={styles.badgeRow}>
            {isBlock ? (
              isRecurring ? (
                <View style={[styles.badge, styles.badgeRecurring]}>
                  <Ionicons name="repeat-outline" size={11} color={colors.gold} />
                  <Text style={[styles.badgeText, { color: colors.gold }]}>Recurrente</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgePuntual]}>
                  <Text style={[styles.badgeText, { color: '#42A5F5' }]}>Puntual</Text>
                </View>
              )
            ) : (
              <View style={[styles.badge, styles.badgeIncident]}>
                <Ionicons name="warning-outline" size={11} color={colors.statusPending} />
                <Text style={[styles.badgeText, { color: colors.statusPending }]}>Incidencia</Text>
              </View>
            )}
          </View>

          {/* Icon */}
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: isBlock ? `${typeConfig.color}20` : `${colors.error}15` },
            ]}
          >
            <Ionicons
              name={isBlock ? typeConfig.icon : 'alert-circle'}
              size={28}
              color={isBlock ? typeConfig.color : colors.error}
            />
          </View>

          <Text style={styles.entryTitle}>{displayTitle}</Text>
          <Text style={styles.entryDate}>{dateLabel}</Text>
        </View>

        <View style={styles.divider} />

        {/* Info rows */}
        <View style={styles.infoSection}>
          <InfoRow
            icon="time-outline"
            label="Hora"
            value={`${format12h(entry.startTime)} - ${format12h(entry.endTime)}${duration ? `  (${duration})` : ''}`}
          />

          {isBlock ? (
            <InfoRow
              icon="pricetag-outline"
              label="Tipo de bloqueo"
              value={typeConfig.label}
            />
          ) : (
            <InfoRow
              icon="warning-outline"
              label="Severidad"
              value={(SEVERITY_CONFIG[(entry as IncidentEntry).severity] ?? SEVERITY_CONFIG.low).label}
            />
          )}

          {displayDescription ? (
            <InfoRow
              icon="document-text-outline"
              label="Descripción"
              value={displayDescription}
            />
          ) : null}

          {isRecurring && recurrenceLabel ? (
            <InfoRow icon="repeat-outline" label="Recurrencia" value={recurrenceLabel} />
          ) : null}

          <InfoRow
            icon="eye-outline"
            label="Visible para clientes"
            value={
              isBlock
                ? 'Sí, no estará disponible para reservas.'
                : 'El horario queda bloqueado para clientes.'
            }
          />

          <InfoRow
            icon="shield-outline"
            label="Afecta citas existentes"
            value={
              entry.kind === 'incident' && entry.affectedCount > 0
                ? `${entry.affectedCount} cita${entry.affectedCount > 1 ? 's' : ''} afectada${entry.affectedCount > 1 ? 's' : ''}`
                : 'No'
            }
            valueColor={
              entry.kind === 'incident' && entry.affectedCount > 0 ? colors.error : undefined
            }
          />
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsLabel}>Acciones</Text>

          {isBlock ? (
            <>
              {/* Editar — PUT /api/owner/time-blocks/:id */}
              <ActionButton
                icon="pencil-outline"
                label={isEditing ? 'Abriendo…' : 'Editar'}
                loading={isEditing}
                disabled={isEditing || isDeleting || isDuplicating}
                onPress={() => onEdit?.(entry)}
              />
              {/* Eliminar — real DELETE */}
              <ActionButton
                icon="trash-outline"
                label={isDeleting ? 'Eliminando…' : 'Eliminar'}
                variant="danger"
                loading={isDeleting}
                disabled={isDeleting || isDuplicating || isEditing}
                onPress={() => onDelete(entry)}
              />
              {/* Duplicar — uses POST with same data */}
              <ActionButton
                icon="copy-outline"
                label={isDuplicating ? 'Duplicando…' : 'Duplicar'}
                loading={isDuplicating}
                disabled={isDeleting || isDuplicating || isEditing}
                onPress={() => onDuplicate(entry)}
              />
            </>
          ) : entry.source === 'real' ? (
            /* Real incident — DELETE /api/owner/incidents/:id (soft-delete / resolve) */
            <ActionButton
              icon="checkmark-circle-outline"
              label={isResolving ? 'Resolviendo…' : 'Marcar como resuelta'}
              loading={isResolving}
              disabled={isResolving}
              onPress={() => onResolve?.(entry)}
            />
          ) : (
            /* Mock / legacy incident — no real endpoints */
            <View style={styles.mockNotice}>
              <Ionicons name="information-circle-outline" size={14} color={colors.gray500} />
              <Text style={styles.mockNoticeText}>
                Las incidencias no se pueden editar ni eliminar todavía.{'\n'}
                La gestión completa de incidencias estará disponible en una próxima versión.
              </Text>
            </View>
          )}
        </View>

        {/* Help */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.helpBody}>
            Consulta nuestra guía para entender cómo funcionan los bloqueos e incidencias.
          </Text>
          <TouchableOpacity style={styles.helpBtn} activeOpacity={0.7} onPress={() => setShowGuide(true)}>
            <Ionicons name="book-outline" size={14} color={colors.gold} />
            <Text style={styles.helpBtnText}>Ver guía rápida</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  if (isMobile) {
    return (
      <>
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
          <TouchableOpacity
            style={styles.mobileOverlay}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.mobileSheet}>{content}</View>
        </Modal>
        <QuickGuideModal visible={showGuide} onClose={() => setShowGuide(false)} />
      </>
    );
  }

  return (
    <>
      {content}
      <QuickGuideModal visible={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}

function InfoRow({ icon, label, value, valueColor }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.gray500} style={styles.infoIcon} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  disabledReason?: string;
  onPress?: () => void;
}

function ActionButton({
  icon,
  label,
  variant = 'default',
  disabled,
  loading,
  disabledReason,
  onPress,
}: ActionButtonProps) {
  const isDanger = variant === 'danger';
  const isDisabled = disabled || !onPress;
  const textColor = isDisabled
    ? colors.gray600
    : isDanger
    ? colors.error
    : colors.white;

  return (
    <TouchableOpacity
      style={[styles.actionBtn, isDisabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Ionicons name={icon} size={16} color={textColor} />
      )}
      <Text style={[styles.actionBtnText, { color: textColor }]}>{label}</Text>
      {disabledReason ? (
        <Text style={styles.disabledReason}>{disabledReason}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray900,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray800,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  headerTitle: { ...typography.subtitle, color: colors.white, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.lg },

  // Title section
  titleSection: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs },
  badgeRow: { flexDirection: 'row', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgePuntual:   { backgroundColor: '#42A5F518', borderWidth: 1, borderColor: '#42A5F540' },
  badgeRecurring: { backgroundColor: colors.gold + '18', borderWidth: 1, borderColor: colors.gold + '40' },
  badgeIncident:  { backgroundColor: colors.statusPending + '18', borderWidth: 1, borderColor: colors.statusPending + '40' },
  badgeText: { ...typography.caption, fontWeight: '600', fontSize: 11 },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  entryTitle: { ...typography.h3, color: colors.white, textAlign: 'center' },
  entryDate:  { ...typography.bodySmall, color: colors.gray400, textAlign: 'center' },

  divider: { height: 1, backgroundColor: colors.gray800 },

  // Info rows
  infoSection: { gap: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoIcon: { marginTop: 2 },
  infoText: { flex: 1, gap: spacing.xxs },
  infoLabel: { ...typography.caption, color: colors.gray500 },
  infoValue: { ...typography.bodySmall, color: colors.white },

  // Actions
  actionsSection: { gap: spacing.sm },
  actionsLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xxs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { ...typography.bodySmall, fontWeight: '500', flex: 1 },
  disabledReason: { ...typography.caption, color: colors.gray600, fontSize: 10 },

  // Mock notice
  mockNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  mockNoticeText: { ...typography.caption, color: colors.gray500, flex: 1, lineHeight: 18 },

  // Help
  helpSection: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  helpTitle: { ...typography.subtitle, color: colors.white, fontSize: 13 },
  helpBody:  { ...typography.caption, color: colors.gray400, lineHeight: 18 },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray700,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  helpBtnText: { ...typography.caption, color: colors.gold, fontWeight: '600' },

  // Mobile modal
  mobileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  mobileSheet: {
    height: '78%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray900,
  },
});

// ─── QuickGuideModal ──────────────────────────────────────────────────────────

interface GuideSection {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  items: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    icon: 'shield-outline',
    color: '#42A5F5',
    title: '¿Qué es un bloqueo?',
    items: [
      'Reserva un intervalo de tu agenda. Durante ese tiempo los clientes no pueden reservar citas.',
      'Úsalo para comidas, descansos, viajes, mandados o cualquier tiempo personal.',
    ],
  },
  {
    icon: 'repeat-outline',
    color: colors.gold,
    title: 'Puntual vs Recurrente',
    items: [
      'Puntual — afecta solo una fecha específica.',
      'Recurrente — se repite cada semana el mismo día (p. ej. todos los lunes a las 2 PM).',
      'Al eliminar un recurrente se borra toda la serie.',
    ],
  },
  {
    icon: 'pencil-outline',
    color: '#66BB6A',
    title: 'Editar un bloqueo',
    items: [
      'Pulsa Editar para cambiar el tipo, horario o recurrencia.',
      'Si es recurrente, el cambio afecta SOLO esa serie completa.',
    ],
  },
  {
    icon: 'warning-outline',
    color: colors.statusPending,
    title: '¿Qué es una incidencia?',
    items: [
      'Registra un evento inesperado (cierre temporal, emergencia) que impide atender clientes.',
      'A diferencia del bloqueo planificado, se crea de forma reactiva.',
      'Cuando la situación se resuelve, márcala como resuelta — quedará en el historial.',
    ],
  },
  {
    icon: 'bulb-outline',
    color: '#AB47BC',
    title: 'Consejos rápidos',
    items: [
      'Crea bloqueos recurrentes para rutinas fijas (comida diaria, clases semanales).',
      'Usa incidencias para eventos imprevistos ya ocurridos.',
      'Los bloqueos aparecen como "no disponible" para tus clientes.',
    ],
  },
];

function QuickGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={guideStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={guideStyles.sheet}>
        {/* Header */}
        <View style={guideStyles.header}>
          <View style={guideStyles.headerLeft}>
            <View style={guideStyles.headerIcon}>
              <Ionicons name="book-outline" size={18} color={colors.gold} />
            </View>
            <Text style={guideStyles.headerTitle}>Guía rápida</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={guideStyles.scroll}
          contentContainerStyle={guideStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {GUIDE_SECTIONS.map((section) => (
            <View key={section.title} style={guideStyles.section}>
              <View style={guideStyles.sectionHeader}>
                <View style={[guideStyles.sectionIcon, { backgroundColor: `${section.color}20` }]}>
                  <Ionicons name={section.icon} size={16} color={section.color} />
                </View>
                <Text style={guideStyles.sectionTitle}>{section.title}</Text>
              </View>
              {section.items.map((item, idx) => (
                <View key={idx} style={guideStyles.item}>
                  <View style={[guideStyles.itemDot, { backgroundColor: section.color }]} />
                  <Text style={guideStyles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const guideStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    backgroundColor: colors.gray900,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: colors.gray700,
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
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.gold + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.subtitle, color: colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.lg },
  section: {
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray700,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.bodySmall, color: colors.white, fontWeight: '600' },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    marginTop: 6,
    flexShrink: 0,
  },
  itemText: { ...typography.caption, color: colors.gray400, lineHeight: 19, flex: 1 },
});
