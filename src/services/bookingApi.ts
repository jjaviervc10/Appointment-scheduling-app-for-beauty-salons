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

export async function getPublicServices(): Promise<PublicService[]> {
  const response = await apiRequest<PublicServicesResponse>('/api/public/services');

  return response.services.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price: row.price,
    sortOrder: row.sortOrder,
  }));
}

export async function getPublicAvailability(
  serviceId: string,
  weekStart: string
): Promise<PublicAvailabilitySlot[]> {
  const query = `serviceId=${encodeURIComponent(serviceId)}&weekStart=${encodeURIComponent(weekStart)}`;
  const response = await apiRequest<PublicAvailabilityResponse>(
    `/api/public/availability?${query}`
  );
  return response.slots;
}
