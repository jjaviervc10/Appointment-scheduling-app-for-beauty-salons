/**
 * Mock data for development before Supabase integration is live.
 * All dates are relative to simulate real scenarios.
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

export const MOCK_APPOINTMENTS: AppointmentViewModel[] = [
  {
    id: 'a1',
    clientName: 'Ana López',
    clientPhone: '+52 1 555 1234',
    serviceName: 'Corte de cabello',
    durationMinutes: 45,
    status: 'pending_owner_approval',
    startAt: new Date(fmt(addDays(today, 1)) + 'T12:45:00'),
    endAt: new Date(fmt(addDays(today, 1)) + 'T13:30:00'),
    notes: null,
  },
  {
    id: 'a2',
    clientName: 'Carlos Méndez',
    clientPhone: '+52 1 555 5678',
    serviceName: 'Corte de cabello',
    durationMinutes: 45,
    status: 'client_confirmed',
    startAt: new Date(fmt(today) + 'T09:00:00'),
    endAt: new Date(fmt(today) + 'T09:45:00'),
    notes: null,
  },
  {
    id: 'a3',
    clientName: 'Lucía Ramírez',
    clientPhone: '+52 1 555 9012',
    serviceName: 'Tinte completo',
    durationMinutes: 120,
    status: 'confirmed_by_owner',
    startAt: new Date(fmt(today) + 'T10:30:00'),
    endAt: new Date(fmt(today) + 'T12:30:00'),
    notes: null,
  },
  {
    id: 'a4',
    clientName: 'Martha Ruiz',
    clientPhone: '+52 1 555 3456',
    serviceName: 'Peinado especial',
    durationMinutes: 60,
    status: 'client_confirmed',
    startAt: new Date(fmt(today) + 'T16:00:00'),
    endAt: new Date(fmt(today) + 'T17:00:00'),
    notes: null,
  },
];

export const MOCK_TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'tb1',
    owner_id: 'owner1',
    block_type: 'comida',
    label: 'Comida',
    date: fmt(today),
    start_time: '14:00',
    end_time: '15:00',
    is_recurring: true,
    recurrence_day_of_week: null,
    notes: null,
    created_at: today.toISOString(),
  },
  {
    id: 'tb2',
    owner_id: 'owner1',
    block_type: 'escuela',
    label: 'Escuela hijos',
    date: fmt(addDays(today, 2)),
    start_time: '08:00',
    end_time: '09:00',
    is_recurring: false,
    recurrence_day_of_week: null,
    notes: 'Junta de padres',
    created_at: today.toISOString(),
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc1',
    owner_id: 'owner1',
    title: 'Motivo: Imprevisto familiar',
    description: 'Se requiere bloquear horario de 12:00 pm a 5:00 pm por emergencia familiar.',
    severity: 'high',
    date: fmt(addDays(today, 3)),
    block_start_time: '12:00',
    block_end_time: '17:00',
    affected_appointment_ids: ['a1', 'a4'],
    is_resolved: false,
    created_at: today.toISOString(),
    resolved_at: null,
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

export function getMockWeekSummary(weekStartDate: Date): DaySummary[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    const dateStr = fmt(d);
    const dayOfWeek = d.getDay();
    const isSunday = dayOfWeek === 0;
    return {
      date: dateStr,
      totalAppointments: isSunday ? 0 : Math.floor(Math.random() * 5) + 1,
      confirmedCount: isSunday ? 0 : Math.floor(Math.random() * 3),
      pendingCount: isSunday ? 0 : Math.floor(Math.random() * 2),
      blocksCount: isSunday ? 0 : 1,
      hasIncident: i === 3,
      occupationPercent: isSunday ? 0 : Math.floor(Math.random() * 60) + 20,
    };
  });
}

export function getMockDayDetail(date: string): DayDetailViewModel {
  const dayAppts = MOCK_APPOINTMENTS.filter(
    (a) => a.startAt.toISOString().split('T')[0] === date
  );
  const dayBlocks = MOCK_TIME_BLOCKS.filter((b) => b.date === date);
  const dayIncidents = MOCK_INCIDENTS.filter((i) => i.date === date);

  return {
    date,
    appointments: dayAppts,
    timeBlocks: dayBlocks,
    incidents: dayIncidents,
    availableFrom: '09:00',
    availableTo: '18:00',
  };
}
