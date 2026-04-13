/**
 * Availability & time blocks service layer.
 * TODO: Replace mock calls with real Supabase queries.
 */

import { MOCK_TIME_SLOTS, MOCK_TIME_BLOCKS, getMockWeekSummary } from './mock-data';
import type { TimeSlot, DaySummary } from '../types/models';
import type { WeeklyAvailability, TimeBlock } from '../types/database';

export async function fetchAvailableSlots(date: string, serviceId: string): Promise<TimeSlot[]> {
  // TODO: Compute from weekly_availability, time_blocks, and existing appointments
  return MOCK_TIME_SLOTS;
}

export async function fetchWeekSummary(weekStartDate: Date): Promise<DaySummary[]> {
  // TODO: Aggregate from appointments, time_blocks, incidents
  return getMockWeekSummary(weekStartDate);
}

export async function fetchTimeBlocks(date: string): Promise<TimeBlock[]> {
  // TODO: Supabase query from booking.time_blocks
  return MOCK_TIME_BLOCKS.filter((b) => b.date === date);
}

export async function createTimeBlock(block: Omit<TimeBlock, 'id' | 'created_at'>): Promise<{ id: string }> {
  // TODO: Supabase insert
  console.log('[MOCK] Creating time block', block);
  return { id: 'tb-' + Date.now() };
}

export async function fetchWeeklyAvailability(): Promise<WeeklyAvailability[]> {
  // TODO: Supabase query from booking.weekly_availability
  return [
    { id: 'wa1', owner_id: 'owner1', day_of_week: 1, start_time: '09:00', end_time: '18:00', is_active: true, created_at: '' },
    { id: 'wa2', owner_id: 'owner1', day_of_week: 2, start_time: '09:00', end_time: '18:00', is_active: true, created_at: '' },
    { id: 'wa3', owner_id: 'owner1', day_of_week: 3, start_time: '09:00', end_time: '18:00', is_active: true, created_at: '' },
    { id: 'wa4', owner_id: 'owner1', day_of_week: 4, start_time: '09:00', end_time: '18:00', is_active: true, created_at: '' },
    { id: 'wa5', owner_id: 'owner1', day_of_week: 5, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: 'wa6', owner_id: 'owner1', day_of_week: 6, start_time: '10:00', end_time: '14:00', is_active: true, created_at: '' },
  ];
}

export async function updateWeeklyAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isActive: boolean
): Promise<void> {
  // TODO: Supabase upsert
  console.log('[MOCK] Updating availability', { dayOfWeek, startTime, endTime, isActive });
}
