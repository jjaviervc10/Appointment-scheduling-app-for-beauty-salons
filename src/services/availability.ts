import type { TimeSlot, DaySummary } from '../types/models';
import type { WeeklyAvailability, TimeBlock } from '../types/database';

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
  throw new Error('No backend endpoint connected for weekly availability.');
}

export async function updateWeeklyAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isActive: boolean
): Promise<void> {
  throw new Error(
    `No backend endpoint connected for updating weekly availability: ${dayOfWeek} ${startTime}-${endTime} active=${isActive}`
  );
}
