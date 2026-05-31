/**
 * BlocksPanel — Redesigned Agenda → Bloqueos screen.
 *
 * Architecture:
 * - Week-based navigation (Mon–Sun). Reload on week change.
 * - Blocks: real backend via fetchTimeBlocks / deleteTimeBlock / createTimeBlock / updateTimeBlock.
 * - Incidents: real backend via getOwnerIncidents / deleteOwnerIncident.
 * - Detail panel: right side on desktop (≥768px), bottom-sheet modal on mobile.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import type { TimeBlock, WeeklyAvailability } from '../../types/database';
import type { OwnerIncident } from '../../types/api';
import {
  fetchTimeBlocks,
  deleteTimeBlock,
  createTimeBlock,
  fetchWeeklyAvailability,
} from '../../services/availability';
import { getOwnerIncidents, deleteOwnerIncident } from '../../services/ownerApi';
import { formatLocalDateKey } from '../../utils/date';
import { BlockTimeModal } from '../modals/BlockTimeModal';
import {
  BlockDetailPanel,
  BLOCK_TYPE_CONFIG,
  DOW_FULL_PLURAL_ES,
  format12h,
  durationLabel,
} from './BlockDetailPanel';
import type { DisplayEntry, BlockEntry, IncidentEntry } from './BlockDetailPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTHS_SHORT_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOW_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DOW_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type ActiveFilter = 'all' | 'blocks' | 'incidents' | 'recurring';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getIsoMonday(weekOffset: number): string {
  const today = new Date();
  const daysToMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday + weekOffset * 7);
  return formatLocalDateKey(monday);
}

function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDateKey(d);
}

function isCurrentWeekCheck(isoMonday: string): boolean {
  const today = formatLocalDateKey(new Date());
  return today >= isoMonday && today <= addDaysToKey(isoMonday, 6);
}

function weekRangeLabel(isoMonday: string): string {
  const mon = new Date(`${isoMonday}T12:00:00`);
  const sun = new Date(`${isoMonday}T12:00:00`);
  sun.setDate(mon.getDate() + 6);
  return `${mon.getDate()} ${MONTHS_SHORT_ES[mon.getMonth()]} - ${sun.getDate()} ${MONTHS_SHORT_ES[sun.getMonth()]}, ${sun.getFullYear()}`;
}

function formatDateSection(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return `${DOW_FULL_ES[d.getDay()]!.toUpperCase()} ${d.getDate()} DE ${MONTHS_ES[d.getMonth()]!.toUpperCase()}, ${d.getFullYear()}`;
}

function formatDateSummary(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return `${DOW_FULL_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

// ─── BlocksPanel ──────────────────────────────────────────────────────────────

export function BlocksPanel() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // ── Navigation state ───────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset]         = useState(0);
  const [activeFilter, setActiveFilter]     = useState<ActiveFilter>('all');
  const [selectedDay, setSelectedDay]       = useState<string | null>(() => formatLocalDateKey(new Date()));
  const [selectedEntry, setSelectedEntry]   = useState<DisplayEntry | null>(null);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [blocks, setBlocks]       = useState<TimeBlock[]>([]);
  const [weekAvail, setWeekAvail] = useState<WeeklyAvailability[]>([]);
  const [incidents, setIncidents] = useState<OwnerIncident[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId]     = useState<string | null>(null);
  const [showNewBlock, setShowNewBlock]   = useState(false);
  const [editingBlock, setEditingBlock]   = useState<TimeBlock | null>(null);

  // ── Computed week values ───────────────────────────────────────────────────
  const isoMonday     = useMemo(() => getIsoMonday(weekOffset), [weekOffset]);
  const isoSunday     = useMemo(() => addDaysToKey(isoMonday, 6), [isoMonday]);
  const isCurrentWeek = useMemo(() => isCurrentWeekCheck(isoMonday), [isoMonday]);
  const weekLabel     = useMemo(() => weekRangeLabel(isoMonday), [isoMonday]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedBlocks, availResult, fetchedIncidents] = await Promise.all([
        fetchTimeBlocks(isoMonday, isoSunday),
        fetchWeeklyAvailability(isoMonday),
        getOwnerIncidents(isoMonday, isoSunday).catch(() => [] as OwnerIncident[]),
      ]);
      setBlocks(fetchedBlocks);
      setWeekAvail(availResult.data);
      setIncidents(fetchedIncidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los bloqueos.');
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [isoMonday, isoSunday]);

  useEffect(() => { void loadData(); }, [loadData]);

  // When week changes, reset selected day to today (if in current week) or Monday
  useEffect(() => {
    const today = formatLocalDateKey(new Date());
    setSelectedDay(isCurrentWeek ? today : isoMonday);
    setSelectedEntry(null);
  }, [isoMonday, isCurrentWeek]);

  // ── Unified display entries ────────────────────────────────────────────────
  const displayEntries = useMemo<DisplayEntry[]>(() => {
    const blockEntries: BlockEntry[] = blocks.map(b => ({
      kind: 'block' as const,
      id: b.id,
      rawId: b.id.split(':')[0]!,
      date: b.date,
      startTime: b.start_time,
      endTime: b.end_time,
      title: b.label,
      description: b.notes && b.notes !== b.label ? b.notes : null,
      blockType: b.block_type,
      isRecurring: b.is_recurring,
      recurrenceDow: b.recurrence_day_of_week as number | null,
      source: 'real' as const,
    }));

    const incidentEntries: IncidentEntry[] = incidents.map(inc => ({
      kind: 'incident' as const,
      id: inc.id,
      rawId: inc.id,
      date: inc.date,
      startTime: inc.block_start_time,
      endTime: inc.block_end_time,
      title: inc.title,
      description: inc.description,
      blockType: 'incident' as const,
      isRecurring: false as const,
      recurrenceDow: null,
      severity: inc.severity,
      affectedCount: inc.affected_appointment_ids.length,
      isResolved: inc.is_resolved,
      source: 'real' as const,
    }));

    return [...blockEntries, ...incidentEntries].sort(
      (a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
    );
  }, [blocks, incidents]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (activeFilter === 'blocks')    return displayEntries.filter(e => e.kind === 'block');
    if (activeFilter === 'incidents') return displayEntries.filter(e => e.kind === 'incident');
    if (activeFilter === 'recurring') return displayEntries.filter(e => e.isRecurring);
    return displayEntries;
  }, [displayEntries, activeFilter]);

  // ── Grouped by date ────────────────────────────────────────────────────────
  const groupedEntries = useMemo<[string, DisplayEntry[]][]>(() => {
    const groups: Record<string, DisplayEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!groups[entry.date]) groups[entry.date] = [];
      groups[entry.date]!.push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries]);

  // ── Day chips (Mon–Sun) ────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${isoMonday}T12:00:00`);
      d.setDate(d.getDate() + i);
      const dateKey = formatLocalDateKey(d);
      const blockCount    = displayEntries.filter(e => e.kind === 'block'    && e.date === dateKey).length;
      const incidentCount = displayEntries.filter(e => e.kind === 'incident' && e.date === dateKey).length;
      return {
        dateKey,
        shortName: DOW_SHORT_ES[d.getDay()]!,
        dayNum: d.getDate(),
        total: blockCount + incidentCount,
        blockCount,
        incidentCount,
      };
    });
  }, [isoMonday, displayEntries]);

  // ── Selected day availability ──────────────────────────────────────────────
  const selectedDayAvail = useMemo(() => {
    if (!selectedDay) return null;
    const dow = new Date(`${selectedDay}T12:00:00`).getDay();
    return weekAvail.find(wa => wa.day_of_week === dow && wa.is_active) ?? null;
  }, [selectedDay, weekAvail]);

  const selectedDaySummary = useMemo(() => {
    if (!selectedDay) return null;
    return {
      blockCount:    displayEntries.filter(e => e.kind === 'block'    && e.date === selectedDay).length,
      incidentCount: displayEntries.filter(e => e.kind === 'incident' && e.date === selectedDay).length,
    };
  }, [selectedDay, displayEntries]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback((entry: DisplayEntry) => {
    if (entry.kind !== 'block') return;
    const message = entry.isRecurring
      ? 'Esto eliminará TODOS los bloqueos recurrentes de esta serie. ¿Deseas continuar?'
      : '¿Eliminar este bloqueo de horario?';
    Alert.alert('Eliminar bloqueo', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(entry.id);
          try {
            await deleteTimeBlock(entry.rawId);
            setSelectedEntry(null);
            await loadData();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar el bloqueo.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, [loadData]);

  const handleDuplicate = useCallback(async (entry: DisplayEntry) => {
    if (entry.kind !== 'block') return;
    const original = blocks.find(b => b.id === entry.id);
    if (!original) return;
    setDuplicatingId(entry.id);
    try {
      await createTimeBlock({
        owner_id: '',
        block_type: original.block_type,
        label: original.label,
        date: original.date,
        start_time: original.start_time,
        end_time: original.end_time,
        is_recurring: original.is_recurring,
        recurrence_day_of_week: original.recurrence_day_of_week,
        notes: original.notes,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo duplicar el bloqueo.');
    } finally {
      setDuplicatingId(null);
    }
  }, [blocks, loadData]);

  const handleResolveIncident = useCallback((entry: DisplayEntry) => {
    if (entry.kind !== 'incident') return;
    Alert.alert(
      'Resolver incidencia',
      '¿Marcar esta incidencia como resuelta? Seguirá visible en el historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          onPress: async () => {
            setResolvingId(entry.id);
            try {
              await deleteOwnerIncident(entry.rawId);
              setSelectedEntry(null);
              await loadData();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo resolver la incidencia.');
            } finally {
              setResolvingId(null);
            }
          },
        },
      ]
    );
  }, [loadData]);

  const handleEditBlock = useCallback((entry: DisplayEntry) => {
    if (entry.kind !== 'block') return;
    const original = blocks.find(b => b.id === entry.id);
    if (!original) return;
    setEditingBlock(original);
    setShowNewBlock(true);
  }, [blocks]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Left / main list panel ── */}
      <View style={styles.listPanel}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Bloqueos e incidencias</Text>
            <Text style={styles.subtitle}>Administra excepciones dentro de tu disponibilidad.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewBlock(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={15} color={colors.black} />
            <Text style={styles.addBtnText}>Nuevo bloqueo</Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(
              [
                ['all',        'Todos',       'apps-outline'    ],
                ['blocks',     'Bloqueos',    'shield-outline'  ],
                ['incidents',  'Incidencias', 'warning-outline' ],
                ['recurring',  'Recurrentes', 'repeat-outline'  ],
              ] as const
            ).map(([key, label, icon]) => {
              const isActive = activeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon} size={13} color={isActive ? colors.gold : colors.gray500} />
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Week navigator */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekNavArrow}
            onPress={() => setWeekOffset(o => o - 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray400} />
          </TouchableOpacity>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavLabel}>{weekLabel}</Text>
            {isCurrentWeek ? (
              <View style={styles.currentWeekBadge}>
                <Text style={styles.currentWeekBadgeText}>Esta semana</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setWeekOffset(0)} activeOpacity={0.7}>
                <Text style={styles.goTodayText}>Ir a hoy</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.weekNavArrow}
            onPress={() => setWeekOffset(o => o + 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Day chips strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayChipsScroll}
          style={styles.dayChipsRow}
        >
          {weekDays.map(day => {
            const isSelected = selectedDay === day.dateKey;
            const hasItems   = day.total > 0;
            return (
              <TouchableOpacity
                key={day.dateKey}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  !isSelected && hasItems && styles.dayChipHasItems,
                ]}
                onPress={() => setSelectedDay(isSelected ? null : day.dateKey)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayChipShort, isSelected && styles.dayChipTextSelected]}>
                  {day.shortName}
                </Text>
                <Text style={[styles.dayChipNum, isSelected && styles.dayChipTextSelected]}>
                  {day.dayNum}
                </Text>
                {hasItems ? (
                  <View style={[styles.dayChipBadge, isSelected && styles.dayChipBadgeSelected]}>
                    <Text style={[styles.dayChipBadgeText, isSelected && styles.dayChipBadgeTextSelected]}>
                      {day.total}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayChipBadgePlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Error banner */}
        {error ? (
          <TouchableOpacity style={styles.errorBanner} onPress={() => void loadData()} activeOpacity={0.7}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        ) : null}

        {/* Scrollable content area */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Selected day summary */}
          {selectedDay && selectedDaySummary ? (
            <View style={styles.daySummary}>
              <View style={styles.daySummaryLeft}>
                <Ionicons name="calendar" size={18} color={colors.gold} />
                <View style={styles.daySummaryInfo}>
                  <Text style={styles.daySummaryTitle}>{formatDateSummary(selectedDay)}</Text>
                  <Text style={styles.daySummaryMeta}>
                    {selectedDaySummary.blockCount} bloqueo{selectedDaySummary.blockCount !== 1 ? 's' : ''}{' '}
                    · {selectedDaySummary.incidentCount} incidencia{selectedDaySummary.incidentCount !== 1 ? 's' : ''}
                  </Text>
                  {selectedDayAvail ? (
                    <Text style={styles.daySummaryAvail}>
                      Disponible del día: {format12h(selectedDayAvail.start_time)} – {format12h(selectedDayAvail.end_time)}
                    </Text>
                  ) : (
                    <Text style={styles.daySummaryUnavail}>Día no disponible</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.daySummaryBtn}
                onPress={() => setShowNewBlock(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={colors.gold} />
                <Text style={styles.daySummaryBtnText}>Bloquear tiempo</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Microcopy */}
          <View style={styles.microCopy}>
            <Ionicons name="information-circle-outline" size={12} color={colors.gray700} />
            <Text style={styles.microCopyText}>
              Los bloqueos se descuentan automáticamente de los horarios que ven tus clientes.
            </Text>
          </View>

          {/* Loading */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.gold} />
              <Text style={styles.loadingText}>Cargando bloqueos...</Text>
            </View>
          ) : groupedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color={colors.gray700} />
              <Text style={styles.emptyTitle}>Sin bloqueos esta semana</Text>
              <Text style={styles.emptyBody}>
                {activeFilter !== 'all'
                  ? 'No hay elementos para este filtro.'
                  : 'Tu agenda está libre. Crea un bloqueo cuando lo necesites.'}
              </Text>
            </View>
          ) : (
            groupedEntries.map(([dateKey, entries]) => (
              <View key={dateKey} style={styles.dateGroup}>
                <Text style={styles.dateGroupHeader}>{formatDateSection(dateKey)}</Text>
                {entries.map(entry => (
                  <BlockEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    isDeleting={deletingId === entry.id}
                    onPress={() => setSelectedEntry(entry.id === selectedEntry?.id ? null : entry)}
                  />
                ))}
              </View>
            ))
          )}
          <View style={{ height: spacing.huge }} />
        </ScrollView>
      </View>

      {/* ── Right detail panel (desktop) ── */}
      {isDesktop ? (
        <View style={styles.detailPanel}>
          {selectedEntry ? (
            <BlockDetailPanel
              entry={selectedEntry}
              isMobile={false}
              isDeleting={deletingId === selectedEntry.id}
              isDuplicating={duplicatingId === selectedEntry.id}
              isResolving={resolvingId === selectedEntry.id}
              onClose={() => setSelectedEntry(null)}
              onDelete={handleDelete}
              onDuplicate={entry => { void handleDuplicate(entry); }}
              onEdit={handleEditBlock}
              onResolve={handleResolveIncident}
            />
          ) : (
            <View style={styles.detailEmpty}>
              <Ionicons name="layers-outline" size={32} color={colors.gray700} />
              <Text style={styles.detailEmptyText}>
                Selecciona un bloqueo o incidencia para ver los detalles
              </Text>
            </View>
          )}
        </View>
      ) : selectedEntry ? (
        /* Mobile: bottom-sheet modal */
        <BlockDetailPanel
          entry={selectedEntry}
          isMobile
          isDeleting={deletingId === selectedEntry.id}
          isDuplicating={duplicatingId === selectedEntry.id}
          isResolving={resolvingId === selectedEntry.id}
          onClose={() => setSelectedEntry(null)}
          onDelete={handleDelete}
          onDuplicate={entry => { void handleDuplicate(entry); }}
          onEdit={handleEditBlock}
          onResolve={handleResolveIncident}
        />
      ) : null}

      <BlockTimeModal
        visible={showNewBlock}
        editBlock={editingBlock}
        onClose={() => {
          setShowNewBlock(false);
          setEditingBlock(null);
          void loadData();
        }}
      />
    </View>
  );
}

// ─── BlockEntryCard ───────────────────────────────────────────────────────────

interface BlockEntryCardProps {
  entry: DisplayEntry;
  isSelected: boolean;
  isDeleting: boolean;
  onPress: () => void;
}

function BlockEntryCard({ entry, isSelected, isDeleting, onPress }: BlockEntryCardProps) {
  const isBlock    = entry.kind === 'block';
  const isRecurring = entry.isRecurring;
  const typeConfig  = isBlock ? (BLOCK_TYPE_CONFIG[entry.blockType] ?? BLOCK_TYPE_CONFIG.otro!) : BLOCK_TYPE_CONFIG.otro!;

  // Title = block type name; description = stored reason (if different from type name)
  const displayTitle = isBlock ? typeConfig.label : entry.title;
  const displayDescription = isBlock
    ? (entry.title !== typeConfig.label ? entry.title : null)
    : entry.description;

  const iconColor   = entry.kind === 'incident' ? colors.error : typeConfig.color;
  const iconName    = entry.kind === 'incident' ? ('warning' as const) : typeConfig.icon;
  const borderColor = entry.kind === 'incident' ? colors.error : isRecurring ? colors.gold : typeConfig.color;
  const affectedCount = entry.kind === 'incident' ? entry.affectedCount : 0;

  const recurrenceDow: number | null = isBlock ? entry.recurrenceDow : null;
  const timeStr = `${format12h(entry.startTime)} – ${format12h(entry.endTime)}`;
  const dur = durationLabel(entry.startTime, entry.endTime);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor }, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icon */}
      <View style={[styles.cardIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>

      <View style={styles.cardBody}>
        {/* Row 1: time + badges */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTime}>{timeStr}{dur ? `  · ${dur}` : ''}</Text>
          <View style={styles.cardBadges}>
            {entry.kind === 'incident' ? (
              <View style={[styles.cardBadge, styles.badgeIncident]}>
                <Text style={[styles.cardBadgeText, { color: colors.statusPending }]}>Incidencia</Text>
              </View>
            ) : isRecurring ? (
              <View style={[styles.cardBadge, styles.badgeRecurring]}>
                <Ionicons name="repeat-outline" size={10} color={colors.gold} />
                <Text style={[styles.cardBadgeText, { color: colors.gold }]}>Recurrente</Text>
              </View>
            ) : (
              <View style={[styles.cardBadge, styles.badgePuntual]}>
                <Text style={[styles.cardBadgeText, { color: '#42A5F5' }]}>Puntual</Text>
              </View>
            )}
            {affectedCount > 0 ? (
              <View style={[styles.cardBadge, styles.badgeAffected]}>
                <Text style={[styles.cardBadgeText, { color: colors.error }]}>
                  {affectedCount} cita{affectedCount > 1 ? 's' : ''} afectada{affectedCount > 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Row 2: title */}
        <Text style={styles.cardTitle} numberOfLines={1}>
          {isDeleting ? 'Eliminando…' : displayTitle}
        </Text>

        {/* Row 3: description */}
        {displayDescription ? (
          <Text style={styles.cardDescription} numberOfLines={1}>{displayDescription}</Text>
        ) : null}

        {/* Row 4: recurrence or visibility info */}
        {isRecurring && recurrenceDow !== null ? (
          <View style={styles.cardMeta}>
            <Ionicons name="repeat-outline" size={11} color={colors.gray600} />
            <Text style={styles.cardMetaText}>{DOW_FULL_PLURAL_ES[recurrenceDow]}</Text>
          </View>
        ) : entry.kind === 'block' ? (
          <View style={styles.cardMeta}>
            <Ionicons name="eye-outline" size={11} color={colors.gray600} />
            <Text style={styles.cardMetaText}>No afecta citas</Text>
          </View>
        ) : affectedCount > 0 ? (
          <View style={styles.cardMeta}>
            <View style={styles.cardMetaDot} />
            <Text style={[styles.cardMetaText, { color: colors.error }]}>
              {affectedCount} cita{affectedCount > 1 ? 's' : ''} afectada{affectedCount > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {isDeleting ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={isSelected ? colors.gold : colors.gray700} />
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Root layout
  root: { flex: 1, flexDirection: 'row' },
  listPanel: { flex: 1, backgroundColor: colors.black },

  // Right detail panel (desktop)
  detailPanel: {
    width: 300,
    backgroundColor: colors.gray900,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray800,
  },
  detailEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  detailEmptyText: { ...typography.bodySmall, color: colors.gray600, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  title:    { ...typography.h3, color: colors.white },
  subtitle: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.md,
    flexShrink: 0,
  },
  addBtnText: { ...typography.caption, color: colors.black, fontWeight: '700' },

  // Filter bar
  filterBar: { borderBottomWidth: 1, borderBottomColor: colors.gray800 },
  filterScroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  filterTabActive: { backgroundColor: colors.gold + '18', borderColor: colors.gold + '60' },
  filterTabText:       { ...typography.caption, color: colors.gray500 },
  filterTabTextActive: { color: colors.gold, fontWeight: '600' },

  // Week navigator
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  weekNavArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  weekNavCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekNavLabel: { ...typography.bodySmall, color: colors.white, fontWeight: '500' },
  currentWeekBadge: {
    backgroundColor: colors.gold + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  currentWeekBadgeText: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  goTodayText: { ...typography.caption, color: colors.gold },

  // Day chips
  dayChipsRow: { borderBottomWidth: 1, borderBottomColor: colors.gray800 },
  dayChipsScroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayChip: {
    width: 44,
    alignItems: 'center',
    gap: spacing.xxs + 1,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayChipSelected:  { backgroundColor: colors.gold + '15', borderColor: colors.gold },
  dayChipHasItems:  { borderColor: colors.gray800 },
  dayChipShort:     { ...typography.caption, color: colors.gray500, fontSize: 10 },
  dayChipNum:       { ...typography.subtitle, color: colors.gray300, fontSize: 15 },
  dayChipTextSelected: { color: colors.gold },
  dayChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  dayChipBadgeSelected:     { backgroundColor: colors.gold },
  dayChipBadgeText:         { ...typography.caption, color: colors.gray300, fontSize: 10, fontWeight: '700' },
  dayChipBadgeTextSelected: { color: colors.black },
  dayChipBadgePlaceholder:  { width: 18, height: 18 },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.error + '14',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorText:  { ...typography.caption, color: colors.error, flex: 1 },
  retryText:  { ...typography.caption, color: colors.gold, fontWeight: '700' },

  // Scrollable list area
  listScroll:  { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  // Day summary card
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    gap: spacing.md,
  },
  daySummaryLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flex: 1 },
  daySummaryInfo: { flex: 1, gap: spacing.xxs },
  daySummaryTitle:   { ...typography.subtitle, color: colors.white, fontSize: 14 },
  daySummaryMeta:    { ...typography.caption, color: colors.gray500 },
  daySummaryAvail:   { ...typography.caption, color: colors.gold },
  daySummaryUnavail: { ...typography.caption, color: colors.gray600 },
  daySummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gold + '50',
    backgroundColor: colors.gold + '10',
    flexShrink: 0,
  },
  daySummaryBtnText: { ...typography.caption, color: colors.gold, fontWeight: '600' },

  // Microcopy
  microCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  microCopyText: { ...typography.caption, color: colors.gray700, fontSize: 11, flex: 1 },

  // Loading / empty
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: { ...typography.bodySmall, color: colors.gray500 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.subtitle, color: colors.gray500 },
  emptyBody:  { ...typography.bodySmall, color: colors.gray600, textAlign: 'center', maxWidth: 260 },

  // Date groups
  dateGroup: { marginBottom: spacing.xl },
  dateGroupHeader: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },

  // Entry cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderLeftWidth: 3,
  },
  cardSelected: { borderColor: colors.gold + '60', backgroundColor: colors.gold + '08' },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody:    { flex: 1, gap: spacing.xxs + 1 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  cardTime:    { ...typography.caption, color: colors.gray400, fontSize: 12, fontWeight: '500' },
  cardBadges:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgePuntual:  { backgroundColor: '#42A5F515', borderWidth: 1, borderColor: '#42A5F530' },
  badgeRecurring:{ backgroundColor: colors.gold + '15', borderWidth: 1, borderColor: colors.gold + '30' },
  badgeIncident: { backgroundColor: colors.statusPending + '15', borderWidth: 1, borderColor: colors.statusPending + '30' },
  badgeAffected: { backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error + '30' },
  cardBadgeText: { ...typography.caption, fontSize: 10, fontWeight: '600' },
  cardTitle:       { ...typography.bodySmall, color: colors.white, fontWeight: '500' },
  cardDescription: { ...typography.caption, color: colors.gray500 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardMetaText: { ...typography.caption, color: colors.gray600 },
  cardMetaDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error },
});
