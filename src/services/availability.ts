import type { TimeSlot, DaySummary } from '../types/models';
import type { WeeklyAvailability, TimeBlock } from '../types/database';
import { getOwnerTimeBlocks, getOwnerWeeklyAvailability, updateOwnerWeeklyAvailability, deleteWeekOverride } from './ownerApi';
export { deleteWeekOverride };
import type { DayOfWeek } from '../types/enums';
import { formatLocalDateKey } from '../utils/date';

function normalizeClockTime(value: string): string {
  const [hour = '00', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function normalizeDateKey(value: string): string {
  return value.slice(0, 10);
}

function enumerateDateKeys(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatLocalDateKey(cursor));
  }
  return dates;
}

function blockReasonLabel(blockType: string, reason: string | null): string {
  if (reason?.trim()) return reason.trim();
  const labels: Record<string, string> = {
    personal: 'Personal',
    comida: 'Comida',
    escuela: 'Escuela',
    descanso: 'Descanso',
    mandado: 'Mandado',
    otro: 'Otro',
  };
  return labels[blockType] ?? blockType;
}

export async function fetchAvailableSlots(date: string, serviceId: string): Promise<TimeSlot[]> {
  throw new Error(`No backend endpoint connected for available slots: ${date}, service ${serviceId}`);
}

export async function fetchWeekSummary(weekStartDate: Date): Promise<DaySummary[]> {
  throw new Error(`No backend endpoint connected for week summary: ${weekStartDate.toISOString()}`);
}

export async function fetchTimeBlocks(startDate: string, endDate = startDate): Promise<TimeBlock[]> {
  const rows = await getOwnerTimeBlocks({ startDate, endDate });
  const rangeDates = enumerateDateKeys(startDate, endDate);
  const blocks: TimeBlock[] = [];

  rows.forEach((row) => {
    const dates = row.specific_date
      ? [normalizeDateKey(row.specific_date)]
      : row.is_recurring && row.day_of_week !== null
        ? rangeDates.filter((dateKey) => new Date(`${dateKey}T12:00:00`).getDay() === row.day_of_week)
        : [];

    dates.forEach((dateKey) => {
      blocks.push({
        id: `${row.id}:${dateKey}`,
        owner_id: '',
        block_type: row.block_type as TimeBlock['block_type'],
        label: blockReasonLabel(row.block_type, row.reason),
        date: dateKey,
        start_time: normalizeClockTime(row.start_time),
        end_time: normalizeClockTime(row.end_time),
        is_recurring: row.is_recurring,
        recurrence_day_of_week: row.day_of_week as DayOfWeek | null,
        notes: row.reason,
        created_at: '',
      });
    });
  });

  return blocks.sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

export async function createTimeBlock(block: Omit<TimeBlock, 'id' | 'created_at'>): Promise<{ id: string }> {
  throw new Error(`El contrato HTTP actual solo permite listar bloqueos. Falta POST /api/owner/time-blocks para persistir el bloqueo del ${block.date}.`);
}

export async function fetchWeeklyAvailability(
  weekStartDate?: string
): Promise<{ data: WeeklyAvailability[]; hasOverrides: boolean }> {
  const result = await getOwnerWeeklyAvailability(weekStartDate);

  const data = result.rows.map((row) => ({
    id: row.id,
    owner_id: '',
    day_of_week: row.dayOfWeek,
    start_time: normalizeClockTime(row.startTime),
    end_time: normalizeClockTime(row.endTime),
    is_active: row.isActive,
    is_override: row.isOverride,
    override_id: row.overrideId,
    created_at: '',
  }));

  return { data, hasOverrides: result.hasOverrides };
}

export async function updateWeeklyAvailability(
  availability: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>,
  weekStartDate?: string
): Promise<{ data: WeeklyAvailability[]; hasOverrides: boolean }> {
  const result = await updateOwnerWeeklyAvailability({ availability }, weekStartDate);

  const data = result.rows.map((row) => ({
    id: row.id,
    owner_id: '',
    day_of_week: row.dayOfWeek,
    start_time: normalizeClockTime(row.startTime),
    end_time: normalizeClockTime(row.endTime),
    is_active: row.isActive,
    is_override: row.isOverride,
    override_id: row.overrideId,
    created_at: '',
  }));

  return { data, hasOverrides: result.hasOverrides };
}
