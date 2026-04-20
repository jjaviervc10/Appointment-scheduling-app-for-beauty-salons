/**
 * Mock data for development before Supabase integration is live.
 * Rich dataset spread across multiple days for calendar views.
 */

import type { Service, Client, TimeBlock, Incident } from '../types/database';
import type { AppointmentViewModel, DaySummary, TimeSlot, DayDetailViewModel } from '../types/models';
import type { AppointmentStatus } from '../types/enums';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const MOCK_CLIENTS = [
  { id: 'c1', name: 'Ana López', phone: '+52 1 555 1234', totalAppts: 12, lastVisit: fmt(addDays(today, -5)) },
  { id: 'c2', name: 'Carlos Méndez', phone: '+52 1 555 5678', totalAppts: 8, lastVisit: fmt(addDays(today, -2)) },
  { id: 'c3', name: 'Lucía Ramírez', phone: '+52 1 555 9012', totalAppts: 5, lastVisit: fmt(addDays(today, -7)) },
  { id: 'c4', name: 'Martha Ruiz', phone: '+52 1 555 3456', totalAppts: 15, lastVisit: fmt(addDays(today, -1)) },
  { id: 'c5', name: 'María García', phone: '+52 1 555 7890', totalAppts: 3, lastVisit: fmt(addDays(today, -14)) },
  { id: 'c6', name: 'Roberto Sánchez', phone: '+52 1 555 2345', totalAppts: 7, lastVisit: fmt(addDays(today, -3)) },
  { id: 'c7', name: 'Diana Torres', phone: '+52 1 555 6789', totalAppts: 10, lastVisit: fmt(today) },
  { id: 'c8', name: 'Fernando Ruiz', phone: '+52 1 555 4321', totalAppts: 2, lastVisit: fmt(addDays(today, -10)) },
];

export const MOCK_SERVICES: Service[] = [
  {
    id: 's1',
    owner_id: 'owner1',
    name: 'Corte de cabello',
    description: 'Corte profesional personalizado',
    duration_minutes: 45,
    buffer_after_minutes: 15,
    price: 250,
    is_active: true,
    created_at: today.toISOString(),
  },
  {
    id: 's2',
    owner_id: 'owner1',
    name: 'Peinado especial',
    description: 'Peinado para eventos',
    duration_minutes: 60,
    buffer_after_minutes: 10,
    price: 400,
    is_active: true,
    created_at: today.toISOString(),
  },
  {
    id: 's3',
    owner_id: 'owner1',
    name: 'Tinte para barba',
    description: 'Tinte profesional para barba',
    duration_minutes: 30,
    buffer_after_minutes: 10,
    price: 200,
    is_active: true,
    created_at: today.toISOString(),
  },
  {
    id: 's4',
    owner_id: 'owner1',
    name: 'Corte de barba',
    description: 'Perfilado y corte de barba profesional',
    duration_minutes: 30,
    buffer_after_minutes: 10,
    price: 150,
    is_active: true,
    created_at: today.toISOString(),
  },
];

// Rich appointment dataset spread across multiple days
export const MOCK_APPOINTMENTS: AppointmentViewModel[] = [
  // Today
  {
    id: 'a1', clientName: 'Carlos Méndez', clientPhone: '+52 1 555 5678',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'client_confirmed',
    startAt: new Date(fmt(today) + 'T09:00:00'), endAt: new Date(fmt(today) + 'T09:45:00'), notes: null,
  },
  {
    id: 'a2', clientName: 'Lucía Ramírez', clientPhone: '+52 1 555 9012',
    serviceName: 'Tinte para barba', durationMinutes: 30, status: 'confirmed_by_owner',
    startAt: new Date(fmt(today) + 'T10:30:00'), endAt: new Date(fmt(today) + 'T11:00:00'), notes: null,
  },
  {
    id: 'a3', clientName: 'Diana Torres', clientPhone: '+52 1 555 6789',
    serviceName: 'Peinado especial', durationMinutes: 60, status: 'client_confirmed',
    startAt: new Date(fmt(today) + 'T11:30:00'), endAt: new Date(fmt(today) + 'T12:30:00'), notes: null,
  },
  {
    id: 'a4', clientName: 'Martha Ruiz', clientPhone: '+52 1 555 3456',
    serviceName: 'Peinado especial', durationMinutes: 60, status: 'client_confirmed',
    startAt: new Date(fmt(today) + 'T16:00:00'), endAt: new Date(fmt(today) + 'T17:00:00'), notes: null,
  },
  // Tomorrow
  {
    id: 'a5', clientName: 'Ana López', clientPhone: '+52 1 555 1234',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'pending_owner_approval',
    startAt: new Date(fmt(addDays(today, 1)) + 'T09:30:00'), endAt: new Date(fmt(addDays(today, 1)) + 'T10:15:00'), notes: null,
  },
  {
    id: 'a6', clientName: 'Roberto Sánchez', clientPhone: '+52 1 555 2345',
    serviceName: 'Corte de barba', durationMinutes: 30, status: 'confirmed_by_owner',
    startAt: new Date(fmt(addDays(today, 1)) + 'T11:00:00'), endAt: new Date(fmt(addDays(today, 1)) + 'T11:30:00'), notes: null,
  },
  {
    id: 'a7', clientName: 'María García', clientPhone: '+52 1 555 7890',
    serviceName: 'Peinado especial', durationMinutes: 60, status: 'pending_owner_approval',
    startAt: new Date(fmt(addDays(today, 1)) + 'T14:00:00'), endAt: new Date(fmt(addDays(today, 1)) + 'T15:00:00'), notes: 'Primera visita',
  },
  // Day +2
  {
    id: 'a8', clientName: 'Fernando Ruiz', clientPhone: '+52 1 555 4321',
    serviceName: 'Tinte para barba', durationMinutes: 30, status: 'client_confirmed',
    startAt: new Date(fmt(addDays(today, 2)) + 'T10:00:00'), endAt: new Date(fmt(addDays(today, 2)) + 'T10:30:00'), notes: null,
  },
  {
    id: 'a9', clientName: 'Carlos Méndez', clientPhone: '+52 1 555 5678',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'confirmed_by_owner',
    startAt: new Date(fmt(addDays(today, 2)) + 'T12:00:00'), endAt: new Date(fmt(addDays(today, 2)) + 'T12:45:00'), notes: null,
  },
  {
    id: 'a10', clientName: 'Diana Torres', clientPhone: '+52 1 555 6789',
    serviceName: 'Corte de barba', durationMinutes: 30, status: 'client_confirmed',
    startAt: new Date(fmt(addDays(today, 2)) + 'T15:00:00'), endAt: new Date(fmt(addDays(today, 2)) + 'T15:30:00'), notes: null,
  },
  // Day +3
  {
    id: 'a11', clientName: 'Ana López', clientPhone: '+52 1 555 1234',
    serviceName: 'Peinado especial', durationMinutes: 60, status: 'confirmed_by_owner',
    startAt: new Date(fmt(addDays(today, 3)) + 'T09:00:00'), endAt: new Date(fmt(addDays(today, 3)) + 'T10:00:00'), notes: null,
  },
  {
    id: 'a12', clientName: 'Martha Ruiz', clientPhone: '+52 1 555 3456',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'pending_owner_approval',
    startAt: new Date(fmt(addDays(today, 3)) + 'T13:00:00'), endAt: new Date(fmt(addDays(today, 3)) + 'T13:45:00'), notes: null,
  },
  // Day +4
  {
    id: 'a13', clientName: 'Lucía Ramírez', clientPhone: '+52 1 555 9012',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'client_confirmed',
    startAt: new Date(fmt(addDays(today, 4)) + 'T10:00:00'), endAt: new Date(fmt(addDays(today, 4)) + 'T10:45:00'), notes: null,
  },
  {
    id: 'a14', clientName: 'Roberto Sánchez', clientPhone: '+52 1 555 2345',
    serviceName: 'Tinte para barba', durationMinutes: 30, status: 'confirmed_by_owner',
    startAt: new Date(fmt(addDays(today, 4)) + 'T11:30:00'), endAt: new Date(fmt(addDays(today, 4)) + 'T12:00:00'), notes: null,
  },
  {
    id: 'a15', clientName: 'María García', clientPhone: '+52 1 555 7890',
    serviceName: 'Corte de barba', durationMinutes: 30, status: 'client_confirmed',
    startAt: new Date(fmt(addDays(today, 4)) + 'T14:00:00'), endAt: new Date(fmt(addDays(today, 4)) + 'T14:30:00'), notes: null,
  },
  // Day +5
  {
    id: 'a16', clientName: 'Fernando Ruiz', clientPhone: '+52 1 555 4321',
    serviceName: 'Peinado especial', durationMinutes: 60, status: 'pending_owner_approval',
    startAt: new Date(fmt(addDays(today, 5)) + 'T09:00:00'), endAt: new Date(fmt(addDays(today, 5)) + 'T10:00:00'), notes: null,
  },
  {
    id: 'a17', clientName: 'Diana Torres', clientPhone: '+52 1 555 6789',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'confirmed_by_owner',
    startAt: new Date(fmt(addDays(today, 5)) + 'T12:00:00'), endAt: new Date(fmt(addDays(today, 5)) + 'T12:45:00'), notes: null,
  },
  // Day -1 (yesterday - completed)
  {
    id: 'a18', clientName: 'Ana López', clientPhone: '+52 1 555 1234',
    serviceName: 'Corte de cabello', durationMinutes: 45, status: 'completed',
    startAt: new Date(fmt(addDays(today, -1)) + 'T09:00:00'), endAt: new Date(fmt(addDays(today, -1)) + 'T09:45:00'), notes: null,
  },
  {
    id: 'a19', clientName: 'Carlos Méndez', clientPhone: '+52 1 555 5678',
    serviceName: 'Corte de barba', durationMinutes: 30, status: 'completed',
    startAt: new Date(fmt(addDays(today, -1)) + 'T11:00:00'), endAt: new Date(fmt(addDays(today, -1)) + 'T11:30:00'), notes: null,
  },
  {
    id: 'a20', clientName: 'Martha Ruiz', clientPhone: '+52 1 555 3456',
    serviceName: 'Tinte para barba', durationMinutes: 30, status: 'no_show',
    startAt: new Date(fmt(addDays(today, -1)) + 'T15:00:00'), endAt: new Date(fmt(addDays(today, -1)) + 'T15:30:00'), notes: null,
  },
];

export const MOCK_TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'tb1', owner_id: 'owner1', block_type: 'comida', label: 'Comida',
    date: fmt(today), start_time: '14:00', end_time: '15:00',
    is_recurring: true, recurrence_day_of_week: null, notes: null, created_at: today.toISOString(),
  },
  {
    id: 'tb2', owner_id: 'owner1', block_type: 'escuela', label: 'Escuela hijos',
    date: fmt(addDays(today, 2)), start_time: '08:00', end_time: '09:00',
    is_recurring: false, recurrence_day_of_week: null, notes: 'Junta de padres', created_at: today.toISOString(),
  },
  {
    id: 'tb3', owner_id: 'owner1', block_type: 'comida', label: 'Comida',
    date: fmt(addDays(today, 1)), start_time: '13:00', end_time: '14:00',
    is_recurring: true, recurrence_day_of_week: null, notes: null, created_at: today.toISOString(),
  },
  {
    id: 'tb4', owner_id: 'owner1', block_type: 'mandado', label: 'Mandado',
    date: fmt(addDays(today, 3)), start_time: '15:00', end_time: '16:00',
    is_recurring: false, recurrence_day_of_week: null, notes: 'Recoger suministros', created_at: today.toISOString(),
  },
  {
    id: 'tb5', owner_id: 'owner1', block_type: 'descanso', label: 'Descanso',
    date: fmt(addDays(today, 4)), start_time: '13:00', end_time: '14:00',
    is_recurring: true, recurrence_day_of_week: null, notes: null, created_at: today.toISOString(),
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc1', owner_id: 'owner1', title: 'Imprevisto familiar',
    description: 'Emergencia familiar, se requiere bloquear horario de la tarde.',
    severity: 'high', date: fmt(addDays(today, 3)),
    block_start_time: '12:00', block_end_time: '17:00',
    affected_appointment_ids: ['a12'],
    is_resolved: false, created_at: today.toISOString(), resolved_at: null,
  },
];

export const MOCK_TIME_SLOTS: TimeSlot[] = [
  { startTime: '09:00', endTime: '09:45', isAvailable: true },
  { startTime: '09:45', endTime: '10:30', isAvailable: true },
  { startTime: '10:30', endTime: '11:15', isAvailable: false },
  { startTime: '12:00', endTime: '12:45', isAvailable: true },
  { startTime: '12:45', endTime: '13:30', isAvailable: true },
  { startTime: '16:00', endTime: '16:45', isAvailable: true },
  { startTime: '16:45', endTime: '17:30', isAvailable: true },
];

export const MOCK_MESSAGES = [
  {
    id: 'm1', clientName: 'Ana López', type: 'Confirmación de cita', channel: 'WhatsApp',
    status: 'delivered' as const, sentAt: fmt(addDays(today, -1)) + ' 10:30',
    body: 'Hola Ana, tu cita para Corte de cabello ha sido confirmada.',
  },
  {
    id: 'm2', clientName: 'Martha Ruiz', type: 'Recordatorio', channel: 'WhatsApp',
    status: 'read' as const, sentAt: fmt(addDays(today, -1)) + ' 18:00',
    body: 'Recordatorio: tienes cita mañana a las 16:00.',
  },
  {
    id: 'm3', clientName: 'Carlos Méndez', type: 'Confirmación de cita', channel: 'WhatsApp',
    status: 'sent' as const, sentAt: fmt(today) + ' 09:15',
    body: 'Hola Carlos, tu cita ha sido aceptada para hoy a las 09:00.',
  },
  {
    id: 'm4', clientName: 'Lucía Ramírez', type: 'Reprogramación', channel: 'WhatsApp',
    status: 'failed' as const, sentAt: fmt(addDays(today, -3)) + ' 14:00',
    body: 'Hola Lucía, tu cita necesita reprogramarse por una emergencia.',
  },
];

/** Get all appointments for a specific date */
export function getAppointmentsForDate(date: string): AppointmentViewModel[] {
  return MOCK_APPOINTMENTS.filter(
    (a) => fmt(a.startAt) === date
  );
}

/** Get appointments for a date range */
export function getAppointmentsForRange(start: Date, end: Date): AppointmentViewModel[] {
  return MOCK_APPOINTMENTS.filter(
    (a) => a.startAt >= start && a.startAt <= end
  );
}

/** Get month summary: appointments count per day */
export function getMonthSummary(year: number, month: number): Record<string, { total: number; confirmed: number; pending: number; occupation: number }> {
  const result: Record<string, { total: number; confirmed: number; pending: number; occupation: number }> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAppts = MOCK_APPOINTMENTS.filter(a => fmt(a.startAt) === dateStr);
    const confirmed = dayAppts.filter(a => 
      a.status === 'client_confirmed' || a.status === 'confirmed_by_owner' || a.status === 'completed'
    ).length;
    const pending = dayAppts.filter(a => a.status === 'pending_owner_approval').length;
    const totalMinutes = dayAppts.reduce((sum, a) => sum + a.durationMinutes, 0);
    const workdayMinutes = 9 * 60; // 09:00-18:00
    
    result[dateStr] = {
      total: dayAppts.length,
      confirmed,
      pending,
      occupation: Math.min(100, Math.round((totalMinutes / workdayMinutes) * 100)),
    };
  }
  return result;
}

export function getMockWeekSummary(weekStartDate: Date): DaySummary[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    const dateStr = fmt(d);
    const dayAppts = MOCK_APPOINTMENTS.filter(a => fmt(a.startAt) === dateStr);
    const dayOfWeek = d.getDay();
    const isSunday = dayOfWeek === 0;
    const confirmed = dayAppts.filter(a => 
      a.status === 'client_confirmed' || a.status === 'confirmed_by_owner'
    ).length;
    const pending = dayAppts.filter(a => a.status === 'pending_owner_approval').length;
    const blocks = MOCK_TIME_BLOCKS.filter(b => b.date === dateStr).length;
    const hasInc = MOCK_INCIDENTS.some(inc => inc.date === dateStr && !inc.is_resolved);
    
    return {
      date: dateStr,
      totalAppointments: dayAppts.length,
      confirmedCount: confirmed,
      pendingCount: pending,
      blocksCount: blocks,
      hasIncident: hasInc,
      occupationPercent: isSunday ? 0 : Math.min(100, Math.round((dayAppts.reduce((s, a) => s + a.durationMinutes, 0) / (9 * 60)) * 100)),
    };
  });
}

export function getMockDayDetail(date: string): DayDetailViewModel {
  const dayAppts = MOCK_APPOINTMENTS.filter(a => fmt(a.startAt) === date);
  const dayBlocks = MOCK_TIME_BLOCKS.filter(b => b.date === date);
  const dayIncidents = MOCK_INCIDENTS.filter(i => i.date === date);

  return {
    date,
    appointments: dayAppts,
    timeBlocks: dayBlocks,
    incidents: dayIncidents,
    availableFrom: '09:00',
    availableTo: '18:00',
  };
}
