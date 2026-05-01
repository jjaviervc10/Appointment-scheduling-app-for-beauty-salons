import { apiRequest } from './apiClient';
import type {
  PublicAvailabilityResponse,
  PublicAvailabilitySlot,
  PublicBookingRequestInput,
  PublicBookingResponse,
  PublicService,
  PublicServicesResponse,
} from '../types/api';

export async function createPublicBookingRequest(
  input: PublicBookingRequestInput
): Promise<PublicBookingResponse> {
  return apiRequest<PublicBookingResponse>('/api/public-booking/request', {
    method: 'POST',
    body: input,
  });
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export async function getPublicServices(): Promise<PublicService[]> {
  const response = await apiRequest<PublicServicesResponse | PublicServicesResponse['data']>('/api/public/services');
  const rows = asArray<PublicServicesResponse['data'][number]>(response);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    price: row.price,
  }));
}

export async function getPublicAvailability(
  serviceId: string,
  weekStart: string
): Promise<PublicAvailabilitySlot[]> {
  const query = `serviceId=${encodeURIComponent(serviceId)}&weekStart=${encodeURIComponent(weekStart)}`;
  const response = await apiRequest<PublicAvailabilityResponse | PublicAvailabilityResponse['data']>(
    `/api/public/availability?${query}`
  );
  const rows = asArray<PublicAvailabilityResponse['data'][number]>(response);

  return rows
    .map((row) => {
      const slotStartAt = row.slotStartAt ?? row.slot_start_at;
      const slotEndAt = row.slotEndAt ?? row.slot_end_at;

      if (!slotStartAt || !slotEndAt) return null;
      return { slotStartAt, slotEndAt };
    })
    .filter((slot): slot is PublicAvailabilitySlot => slot !== null);
}
