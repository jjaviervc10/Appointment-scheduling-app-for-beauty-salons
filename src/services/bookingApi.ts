import { apiRequest } from './apiClient';
import type {
  PublicAvailabilityResponse,
  PublicAvailabilitySlot,
  PublicBookingRequestInput,
  PublicBookingResponse,
  PublicCancelAppointmentInput,
  PublicCancelAppointmentResponse,
  PublicMiniAppTokenResponse,
  PublicRescheduleRequestInput,
  PublicRescheduleRequestResponse,
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

export async function getPublicMiniAppToken(
  token: string
): Promise<PublicMiniAppTokenResponse> {
  return apiRequest<PublicMiniAppTokenResponse>(
    `/api/public/miniapp-tokens/${encodeURIComponent(token)}`
  );
}

export async function createPublicRescheduleRequest(
  input: PublicRescheduleRequestInput
): Promise<PublicRescheduleRequestResponse> {
  return apiRequest<PublicRescheduleRequestResponse>('/api/public/appointments/reschedule-request', {
    method: 'POST',
    body: input,
  });
}

export async function cancelPublicAppointment(
  input: PublicCancelAppointmentInput
): Promise<PublicCancelAppointmentResponse> {
  return apiRequest<PublicCancelAppointmentResponse>('/api/public/appointments/cancel', {
    method: 'POST',
    body: input,
  });
}
