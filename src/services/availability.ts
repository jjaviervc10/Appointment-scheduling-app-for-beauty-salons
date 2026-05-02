import type { TimeSlot, DaySummary } from '../types/models';
import type { WeeklyAvailability, TimeBlock } from '../types/database';
import { getOwnerWeeklyAvailability, updateOwnerWeeklyAvailability } from './ownerApi';
import type { DayOfWeek } from '../types/enums';

function normalizeClockTime(value: string): string {
  const [hour = '00', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export async function fetchAvailableSlots(date: string, serviceId: string): Promise<TimeSlot[]> {
  throw new Error(`No backend endpoint connected for available slots: ${date}, service ${serviceId}`);
}

export async function fetchWeekSummary(weekStartDate: Date): Promise<DaySummary[]> {
  throw new Error(`No backend endpoint connected for week summary: ${weekStartDate.toISOString()}`);
}

export async function fetchTimeBlocks(date: string): Promise<TimeBlock[]> {
  throw new Error(`No backend endpoint connected for time blocks: ${date}`);
}

export async function createTimeBlock(block: Omit<TimeBlock, 'id' | 'created_at'>): Promise<{ id: string }> {
  throw new Error(`No backend endpoint connected for creating time blocks: ${block.date}`);
}

export async function fetchWeeklyAvailability(): Promise<WeeklyAvailability[]> {
  const rows = await getOwnerWeeklyAvailability();

  return rows.map((row) => ({
    id: row.id,
    owner_id: '',
    day_of_week: row.dayOfWeek,
    start_time: normalizeClockTime(row.startTime),
    end_time: normalizeClockTime(row.endTime),
    is_active: row.isActive,
    created_at: '',
  }));
}

export async function updateWeeklyAvailability(
  availability: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>
): Promise<WeeklyAvailability[]> {
  const rows = await updateOwnerWeeklyAvailability({ availability });

  return rows.map((row) => ({
    id: row.id,
    owner_id: '',
    day_of_week: row.dayOfWeek,
    start_time: normalizeClockTime(row.startTime),
    end_time: normalizeClockTime(row.endTime),
    is_active: row.isActive,
    created_at: '',
  }));
}
