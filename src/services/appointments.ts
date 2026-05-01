import type { AppointmentViewModel } from '../types/models';
import type { AppointmentStatus } from '../types/enums';
import { createPublicBookingRequest } from './bookingApi';
import {
  approveOwnerAppointment,
  cancelOwnerAppointment,
  completeOwnerAppointment,
  getOwnerPendingAppointments,
  getOwnerTodayAppointments,
  rejectOwnerAppointment,
} from './ownerApi';
import type { OwnerAppointmentRow } from '../types/api';
import { formatLocalDateKey } from '../utils/date';

function mapOwnerRowToViewModel(row: OwnerAppointmentRow): AppointmentViewModel {
  const startAt = new Date(row.requested_start_at);
  const endAt = new Date(row.requested_end_at);

  return {
    id: row.id,
    clientName: row.clients?.full_name ?? 'Cliente',
    clientPhone: row.clients?.phone ?? '',
    serviceName: row.services?.name ?? 'Servicio',
    durationMinutes:
      row.services?.duration_minutes ??
      Math.max(15, Math.round((endAt.getTime() - startAt.getTime()) / 60000)),
    status: row.status,
    startAt,
    endAt,
    notes: row.notes,
  };
}

export async function fetchAppointmentsByDate(date: string): Promise<AppointmentViewModel[]> {
  const today = formatLocalDateKey(new Date());

  if (date === today) {
    const remote = await getOwnerTodayAppointments();
    return remote.map(mapOwnerRowToViewModel);
  }

  throw new Error(`No backend endpoint connected for owner appointments by date: ${date}`);
}

export async function fetchPendingAppointments(): Promise<AppointmentViewModel[]> {
  const remote = await getOwnerPendingAppointments();
  return remote.map(mapOwnerRowToViewModel);
}

export async function fetchUpcomingAppointments(): Promise<AppointmentViewModel[]> {
  throw new Error('No backend endpoint connected for client upcoming appointments.');
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
