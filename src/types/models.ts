/**
 * View models for UI. These extend or reshape database types
 * to include joined data needed by screens.
 */

import type { Appointment, Service, Client, TimeBlock, Incident } from './database';
import type { AppointmentStatus } from './enums';

/** Appointment card with service and client info resolved */
export interface AppointmentViewModel {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId?: string;
  serviceName: string;
  durationMinutes: number;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  notes: string | null;
}

/** Day summary for calendar view */
export interface DaySummary {
  date: string; // YYYY-MM-DD
  totalAppointments: number;
  confirmedCount: number;
  pendingCount: number;
  blocksCount: number;
  hasIncident: boolean;
  occupationPercent: number;
}

/** Available time slot for client booking */
export interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

/** Day detail for owner's operational view */
export interface DayDetailViewModel {
  date: string;
  appointments: AppointmentViewModel[];
  timeBlocks: TimeBlock[];
  incidents: Incident[];
  availableFrom: string | null;
  availableTo: string | null;
}

export type { Appointment, Service, Client, TimeBlock, Incident };
