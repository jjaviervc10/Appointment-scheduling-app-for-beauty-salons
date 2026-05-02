import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, statusColors, statusLabels, typography } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getOwnerClientDetail, getOwnerClients } from '../../src/services/ownerApi';
import type {
  OwnerClientAppointmentRow,
  OwnerClientDetail,
  OwnerClientRow,
} from '../../src/types/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildClientMeta(client: OwnerClientRow): string {
  const total = client.totalAppointments ?? 0;
  const last = client.lastAppointmentAt ? formatDateTime(client.lastAppointmentAt) : 'sin visitas';
  const service = client.lastServiceName ? ` - ${client.lastServiceName}` : '';
  return `${total} citas - Ultima: ${last}${service}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
}

export default function ClientsScreen() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clients, setClients] = useState<OwnerClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<OwnerClientDetail | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<OwnerClientAppointmentRow[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchClients = useCallback(
    async (nextPage: number) => {
      const requestId = ++requestSeq.current;
      const isCurrentRequest = () => requestId === requestSeq.current;

      try {
        setLoading(true);
        setError(null);

        const response = await getOwnerClients({
          search: debouncedSearch || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        });

        if (!isCurrentRequest()) return;

        setClients(response.data);
        setTotal(response.total);
        setPage(nextPage);
      } catch (err) {
        if (!isCurrentRequest()) return;

        setError(getErrorMessage(err));
        setClients([]);
        setTotal(0);
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    void fetchClients(1);
  }, [fetchClients]);

  const subtitle = useMemo(() => {
    if (loading) return 'Cargando clientes';
    const suffix = debouncedSearch ? ' encontrados' : ' registrados';
    return `${total} clientes${suffix}`;
  }, [debouncedSearch, loading, total]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoPrev = page > 1 && !loading;
  const canGoNext = page < totalPages && !loading;

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page || loading) return;
    void fetchClients(nextPage);
  };

  const pagerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          return horizontal > 40 && horizontal > vertical * 1.4;
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -70 && canGoNext) {
            goToPage(page + 1);
          }
          if (gesture.dx > 70 && canGoPrev) {
            goToPage(page - 1);
          }
        },
      }),
    [canGoNext, canGoPrev, page, totalPages, loading],
  );

  const openClientDetail = async (clientId: string) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedClient(null);
    setSelectedAppointments([]);

    try {
      const response = await getOwnerClientDetail(clientId);
      setSelectedClient(response.client);
      setSelectedAppointments(response.appointments);
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setSelectedClient(null);
    setSelectedAppointments([]);
    setDetailError(null);
  };

  return (
    <View style={styles.container}>
      <TopHeader title="Clientes" subtitle={subtitle} />

      <View style={styles.content}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor={colors.gray400}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="warning-outline" size={42} color={colors.error} />
            <Text style={styles.stateTitle}>No se pudieron cargar los clientes</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchClients(page)} activeOpacity={0.7}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : clients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Sin clientes"
            message={debouncedSearch ? 'No hay resultados para esta busqueda.' : 'Aun no hay clientes registrados.'}
          />
        ) : (
          <View style={styles.listPager} {...pagerPanResponder.panHandlers}>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPrev={() => goToPage(page - 1)}
              onNext={() => goToPage(page + 1)}
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.clientCard}
                  activeOpacity={0.7}
                  onPress={() => openClientDetail(client.id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(client.full_name)}</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName} numberOfLines={1}>{client.full_name}</Text>
                    <Text style={styles.clientPhone} numberOfLines={1}>{client.phone}</Text>
                    <Text style={styles.clientMeta} numberOfLines={2}>{buildClientMeta(client)}</Text>
                    {client.nextAppointmentAt ? (
                      <Text style={styles.nextAppointment} numberOfLines={1}>
                        Proxima: {formatDateTime(client.nextAppointmentAt)}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ClientDetailModal
        visible={detailVisible}
        loading={detailLoading}
        error={detailError}
        client={selectedClient}
        appointments={selectedAppointments}
        onClose={closeDetail}
      />
    </View>
  );
}

function PaginationControls({
  page,
  totalPages,
  total,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <View style={styles.paginationBar}>
      <TouchableOpacity
        style={[styles.pageButton, !canGoPrev && styles.pageButtonDisabled]}
        onPress={onPrev}
        disabled={!canGoPrev}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.gold : colors.gray600} />
      </TouchableOpacity>

      <View style={styles.pageSummary}>
        <Text style={styles.pageTitle}>Pagina {page} de {totalPages}</Text>
        <Text style={styles.pageMeta}>{start}-{end} de {total}</Text>
      </View>

      <TouchableOpacity
        style={[styles.pageButton, !canGoNext && styles.pageButtonDisabled]}
        onPress={onNext}
        disabled={!canGoNext}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.gold : colors.gray600} />
      </TouchableOpacity>
    </View>
  );
}

function ClientDetailModal({
  visible,
  loading,
  error,
  client,
  appointments,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  error: string | null;
  client: OwnerClientDetail | null;
  appointments: OwnerClientAppointmentRow[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIcon}>
                <Ionicons name="person" size={18} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Perfil del cliente</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.stateMessage}>Cargando perfil...</Text>
            </View>
          ) : error ? (
            <View style={styles.modalLoading}>
              <Ionicons name="warning-outline" size={38} color={colors.error} />
              <Text style={styles.stateTitle}>No se pudo cargar el perfil</Text>
              <Text style={styles.stateMessage}>{error}</Text>
            </View>
          ) : client ? (
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
              <View style={styles.profileHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>{getInitials(client.full_name)}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{client.full_name}</Text>
                  <Text style={styles.profilePhone}>{client.phone}</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <StatCard label="Total" value={client.totalAppointments ?? 0} />
                <StatCard label="Completadas" value={client.completedAppointments ?? 0} />
                <StatCard label="Canceladas" value={client.cancelledAppointments ?? 0} />
                <StatCard label="No asistio" value={client.noShowAppointments ?? 0} />
              </View>

              <View style={styles.detailSection}>
                <InfoRow label="Ultima cita" value={formatDateTime(client.lastAppointmentAt)} />
                <InfoRow label="Proxima cita" value={formatDateTime(client.nextAppointmentAt)} />
                <InfoRow label="Ultimo contacto" value={formatDateTime(client.last_seen_at)} />
              </View>

              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Historial</Text>
                <Text style={styles.historyCount}>{appointments.length}</Text>
              </View>

              {appointments.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Ionicons name="calendar-outline" size={34} color={colors.gray500} />
                  <Text style={styles.stateMessage}>Sin citas registradas</Text>
                </View>
              ) : (
                appointments.map((appointment) => (
                  <AppointmentHistoryRow key={appointment.id} appointment={appointment} />
                ))
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function AppointmentHistoryRow({ appointment }: { appointment: OwnerClientAppointmentRow }) {
  const status = statusColors[appointment.status];

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyMain}>
        <Text style={styles.historyService} numberOfLines={1}>
          {appointment.services?.name ?? 'Servicio no disponible'}
        </Text>
        <Text style={styles.historyDate}>
          {formatDateTime(appointment.requested_start_at)} - {appointment.services?.duration_minutes ?? 0} min
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.text }]}>{statusLabels[appointment.status]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  content: { flex: 1, padding: spacing.xxl, paddingBottom: 0 },
  listPager: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.huge, gap: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  searchInput: { ...typography.body, color: colors.white, flex: 1, padding: 0 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.buttonSmall, color: colors.gold, fontSize: 14 },
  clientInfo: { flex: 1, minWidth: 0 },
  clientName: { ...typography.subtitle, color: colors.white },
  clientPhone: { ...typography.bodySmall, color: colors.gray400, marginTop: spacing.xxs },
  clientMeta: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  nextAppointment: { ...typography.caption, color: colors.gold, marginTop: spacing.xxs },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.huge,
  },
  stateTitle: { ...typography.h3, color: colors.white, marginTop: spacing.md, textAlign: 'center' },
  stateMessage: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.sm, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { ...typography.buttonSmall, color: colors.black },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  pageButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  pageSummary: { flex: 1, alignItems: 'center', gap: 2 },
  pageTitle: { ...typography.buttonSmall, color: colors.white },
  pageMeta: { ...typography.caption, color: colors.gray500 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '88%',
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  modalIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { ...typography.h2, color: colors.white, fontSize: 20 },
  modalLoading: { padding: spacing.huge, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalContent: { padding: spacing.xl, gap: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarText: { ...typography.h3, color: colors.gold },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { ...typography.h2, color: colors.white, fontSize: 22 },
  profilePhone: { ...typography.body, color: colors.gray400, marginTop: spacing.xxs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexGrow: 1,
    flexBasis: 130,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  statValue: { ...typography.h2, color: colors.gold, textAlign: 'center' },
  statLabel: { ...typography.caption, color: colors.gray400, textAlign: 'center', marginTop: spacing.xxs },
  detailSection: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { ...typography.bodySmall, color: colors.gray500 },
  infoValue: { ...typography.bodySmall, color: colors.white, textAlign: 'right', flex: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyTitle: { ...typography.h3, color: colors.white },
  historyCount: {
    ...typography.caption,
    color: colors.white,
    backgroundColor: colors.gray700,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  historyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  historyMain: { flex: 1, minWidth: 0 },
  historyService: { ...typography.subtitle, color: colors.white },
  historyDate: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  statusChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusText: { ...typography.caption },
});
