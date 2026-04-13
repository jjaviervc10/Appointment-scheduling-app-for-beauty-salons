/**
 * Appointment service layer.
 * TODO: Replace mock calls with real Supabase queries.
 */

import { supabase } from '../lib/supabase';
import { MOCK_APPOINTMENTS } from './mock-data';
import type { AppointmentViewModel } from '../types/models';
import type { AppointmentStatus } from '../types/enums';

export async function fetchAppointmentsByDate(date: string): Promise<AppointmentViewModel[]> {
  // TODO: Replace with Supabase query
  // const { data } = await supabase
  //   .from('appointments')
  //   .select('*, service:services(*), client:clients(*)')
  //   .gte('requested_start_at', `${date}T00:00:00`)
  //   .lt('requested_start_at', `${date}T23:59:59`)
  //   .order('requested_start_at');
  return MOCK_APPOINTMENTS.filter(
    (a) => a.startAt.toISOString().split('T')[0] === date
  );
}

export async function fetchPendingAppointments(): Promise<AppointmentViewModel[]> {
  // TODO: Supabase query with .eq('status', 'pending_owner_approval')
  return MOCK_APPOINTMENTS.filter((a) => a.status === 'pending_owner_approval');
}

export async function fetchUpcomingAppointments(): Promise<AppointmentViewModel[]> {
  // TODO: Supabase query with .gte('requested_start_at', now)
  const now = new Date();
  return MOCK_APPOINTMENTS.filter((a) => a.startAt >= now);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  reason?: string
): Promise<void> {
  // TODO: Replace with Supabase update + status history insert
  // await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId);
  // await supabase.from('appointment_status_history').insert({ ... });
  console.log(`[MOCK] Appointment ${appointmentId} → ${newStatus}`, reason);
}

export async function createAppointmentRequest(params: {
  clientId: string;
  serviceId: string;
  requestedStartAt: string;
  requestedEndAt: string;
}): Promise<{ id: string }> {
  // TODO: Supabase insert into appointments
  console.log('[MOCK] Creating appointment request', params);
  return { id: 'new-' + Date.now() };
}
