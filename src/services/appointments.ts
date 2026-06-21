import type { AppointmentViewModel } from '../types/models';
import type { AppointmentStatus } from '../types/enums';
import { createPublicBookingRequest } from './bookingApi';
import { apiRequest } from './apiClient';
import {
  approveOwnerAppointment,
  cancelOwnerAppointment,
  completeOwnerAppointment,
  getOwnerAppointments,
  getOwnerAwaitingAppointments,
  getOwnerPendingAppointments,
  getOwnerTodayAppointments,
  rejectOwnerAppointment,
} from './ownerApi';
import type { OwnerAppointmentRow } from '../types/api';
import { formatLocalDateKey } from '../utils/date';

interface ClientAppointmentRow {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  serviceName: string;
  staffName: string;
  businessName: string;
}

interface ClientAppointmentsResponse {
  ok: true;
  appointments: ClientAppointmentRow[];
}

function mapOwnerRowToViewModel(row: OwnerAppointmentRow): AppointmentViewModel {
  const startAt = new Date(row.requested_start_at);
  const endAt = new Date(row.requested_end_at);
  const fallbackDurationMinutes = Math.max(15, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
  const effectiveDurationMinutes = row.duration_minutes ?? fallbackDurationMinutes;

  return {
    id: row.id,
    clientId: row.clients?.id,
    clientName: row.clients?.full_name ?? 'Cliente',
    clientPhone: row.clients?.phone ?? '',
    serviceId: row.services?.id,
    serviceName: row.services?.name ?? 'Servicio',
    serviceDurationMinutes: row.services?.duration_minutes ?? effectiveDurationMinutes,
    customDurationMinutes: row.custom_duration_minutes ?? null,
    durationMinutes: effectiveDurationMinutes,
    status: row.status,
    startAt,
    endAt,
    notes: row.notes,
    clientResponseAt: row.client_response_at ?? null,
  };
}

export async function fetchAppointmentsByDate(date: string): Promise<AppointmentViewModel[]> {
  const today = formatLocalDateKey(new Date());

  if (date === today) {
    const remote = await getOwnerTodayAppointments();
    return remote.map(mapOwnerRowToViewModel);
  }

  const remote = await getOwnerAppointments({ startDate: date, endDate: date });
  return remote.map(mapOwnerRowToViewModel);
}

export async function fetchAppointmentsByRange(
  startDate: string,
  endDate: string
): Promise<AppointmentViewModel[]> {
  const remote = await getOwnerAppointments({ startDate, endDate });
  return remote.map(mapOwnerRowToViewModel);
}

export async function fetchPendingAppointments(): Promise<AppointmentViewModel[]> {
  const remote = await getOwnerPendingAppointments();
  return remote.map(mapOwnerRowToViewModel);
}

export async function fetchAwaitingAppointments(): Promise<AppointmentViewModel[]> {
  const remote = await getOwnerAwaitingAppointments();
  return remote.map(mapOwnerRowToViewModel);
}

export async function fetchUpcomingAppointments(): Promise<AppointmentViewModel[]> {
  const response = await apiRequest<ClientAppointmentsResponse>(
    '/api/auth/client/my-appointments',
    { auth: 'client' },
  );

  return response.appointments.map(mapClientAppointmentToViewModel);
}

function mapClientAppointmentToViewModel(row: ClientAppointmentRow): AppointmentViewModel {
  const startAt = new Date(row.startAt);
  const endAt = new Date(row.endAt);
  const durationMs = endAt.getTime() - startAt.getTime();
  const durationMinutes = Number.isFinite(durationMs)
    ? Math.max(15, Math.round(durationMs / 60000))
    : 15;

  return {
    id: row.id,
    clientName: '',
    clientPhone: '',
    serviceName: row.serviceName,
    durationMinutes,
    status: row.status,
    startAt,
    endAt,
    notes: null,
  };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  reason?: string
): Promise<void> {
  switch (newStatus) {
    case 'confirmed_by_owner':
      await approveOwnerAppointment(appointmentId);
      return;
    case 'rejected_by_owner':
      await rejectOwnerAppointment(appointmentId, reason);
      return;
    case 'owner_cancelled':
      await cancelOwnerAppointment(appointmentId, reason);
      return;
    case 'completed':
      await completeOwnerAppointment(appointmentId);
      return;
    default:
      throw new Error(`No backend mutation connected for appointment status: ${newStatus}`);
  }
}

export async function createAppointmentRequest(params: {
  clientId: string;
  serviceId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  fullName?: string;
  phone?: string;
  notes?: string;
}): Promise<{ id: string }> {
  if (!params.fullName || !params.phone) {
    throw new Error('fullName and phone are required to create a public booking request.');
  }

  const response = await createPublicBookingRequest({
    fullName: params.fullName,
    phone: params.phone,
    serviceId: params.serviceId,
    startAt: params.requestedStartAt,
    notes: params.notes,
    token: undefined,
  });

  return { id: response.appointment.id };
}
