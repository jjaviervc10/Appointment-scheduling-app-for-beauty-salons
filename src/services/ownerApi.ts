import { apiRequest } from './apiClient';
import type {
  OwnerAppointmentMutationResult,
  OwnerListResponse,
  OwnerMutationResponse,
  OwnerAppointmentRow,
  OwnerClientDetailResponse,
  OwnerClientRow,
  OwnerClientsResponse,
  OwnerWeeklyAvailabilityResponse,
  OwnerWeeklyAvailabilityRow,
  OwnerWeeklyAvailabilityUpdateInput,
} from '../types/api';
import type {
  OwnerMessagesParams,
  OwnerMessagesResponse,
  RetryOwnerMessageResponse,
} from '../types/messages';

export async function getOwnerAppointments(params: {
  startDate: string;
  endDate: string;
  status?: string;
}): Promise<OwnerAppointmentRow[]> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });

  if (params.status) {
    query.set('status', params.status);
  }

  const response = await apiRequest<OwnerListResponse>(`/api/owner/appointments?${query.toString()}`, {
    requiresOwnerAuth: true,
  });
  return response.data;
}

export async function getOwnerPendingAppointments(): Promise<OwnerAppointmentRow[]> {
  const response = await apiRequest<OwnerListResponse>('/api/owner/appointments/pending', {
    requiresOwnerAuth: true,
  });
  return response.data;
}

export async function getOwnerTodayAppointments(): Promise<OwnerAppointmentRow[]> {
  const response = await apiRequest<OwnerListResponse>('/api/owner/appointments/today', {
    requiresOwnerAuth: true,
  });
  return response.data;
}

export async function getOwnerClients(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: OwnerClientRow[]; total: number }> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.limit) {
    query.set('limit', String(params.limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await apiRequest<OwnerClientsResponse>(`/api/owner/clients${suffix}`, {
    requiresOwnerAuth: true,
  });

  return { data: response.data, total: response.total };
}

export async function getOwnerClientDetail(id: string): Promise<OwnerClientDetailResponse> {
  return apiRequest<OwnerClientDetailResponse>(`/api/owner/clients/${encodeURIComponent(id)}`, {
    requiresOwnerAuth: true,
  });
}

export async function getOwnerMessages(params: OwnerMessagesParams = {}): Promise<OwnerMessagesResponse> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set('status', params.status);
  }
  if (params.messageType) {
    query.set('messageType', params.messageType);
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.limit) {
    query.set('limit', String(params.limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<OwnerMessagesResponse>(`/api/owner/messages${suffix}`, {
    requiresOwnerAuth: true,
  });
}

export async function retryOwnerMessage(id: string): Promise<RetryOwnerMessageResponse['message']> {
  const response = await apiRequest<RetryOwnerMessageResponse>(
    `/api/owner/messages/${encodeURIComponent(id)}/retry`,
    {
      method: 'POST',
      body: {},
      requiresOwnerAuth: true,
    },
  );

  return response.message;
}

export async function getOwnerWeeklyAvailability(): Promise<OwnerWeeklyAvailabilityRow[]> {
  const response = await apiRequest<OwnerWeeklyAvailabilityResponse>('/api/owner/weekly-availability', {
    requiresOwnerAuth: true,
  });
  return response.availability;
}

export async function updateOwnerWeeklyAvailability(
  payload: OwnerWeeklyAvailabilityUpdateInput
): Promise<OwnerWeeklyAvailabilityRow[]> {
  const response = await apiRequest<OwnerWeeklyAvailabilityResponse>('/api/owner/weekly-availability', {
    method: 'PUT',
    body: payload,
    requiresOwnerAuth: true,
  });
  return response.availability;
}

export async function approveOwnerAppointment(id: string): Promise<OwnerAppointmentMutationResult> {
  const response = await apiRequest<OwnerMutationResponse>(`/api/owner/appointments/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: {},
    requiresOwnerAuth: true,
  });
  return response.appointment;
}

export async function rejectOwnerAppointment(
  id: string,
  reason?: string
): Promise<OwnerAppointmentMutationResult> {
  const response = await apiRequest<OwnerMutationResponse>(`/api/owner/appointments/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: { reason },
    requiresOwnerAuth: true,
  });
  return response.appointment;
}

export async function cancelOwnerAppointment(
  id: string,
  reason?: string
): Promise<OwnerAppointmentMutationResult> {
  const response = await apiRequest<OwnerMutationResponse>(`/api/owner/appointments/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { reason },
    requiresOwnerAuth: true,
  });
  return response.appointment;
}

export async function completeOwnerAppointment(id: string): Promise<OwnerAppointmentMutationResult> {
  const response = await apiRequest<OwnerMutationResponse>(`/api/owner/appointments/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: {},
    requiresOwnerAuth: true,
  });
  return response.appointment;
}

export async function rescheduleOwnerAppointment(
  id: string,
  payload: {
    /** ISO 8601 with offset — visible slot chosen by owner (no buffers). Backend applies buffers.
     *  Omit to use Scenario B: only marks the appointment as reschedule_required without new slot. */
    newStartAt?: string;
    /** Stored in cancellation_reason. Optional, max 500 chars. */
    reason?: string;
    /** Default true. Pass false to suppress notification_event creation. */
    notifyClient?: boolean;
  }
): Promise<OwnerAppointmentMutationResult> {
  const response = await apiRequest<OwnerMutationResponse>(
    `/api/owner/appointments/${encodeURIComponent(id)}/reschedule`,
    {
      method: 'POST',
      body: payload,
      requiresOwnerAuth: true,
    }
  );
  return response.appointment;
}
