import type { AppointmentStatus, DayOfWeek } from './enums';

export type ApiErrorDetails = Record<string, string[]>;

export interface ApiErrorBody {
  ok?: false;
  error?: string;
  details?: ApiErrorDetails;
}

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data?: T;
  appointment?: OwnerAppointmentMutationResult;
}

export interface OwnerAppointmentRow {
  id: string;
  status: AppointmentStatus;
  requested_start_at: string;
  requested_end_at: string;
  notes: string | null;
  cancellation_reason: string | null;
  created_at?: string;
  clients?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
}

export interface OwnerListResponse {
  ok: true;
  data: OwnerAppointmentRow[];
}

export interface OwnerClientRow {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  last_seen_at: string | null;
  totalAppointments: number | null;
  lastAppointmentAt: string | null;
  lastServiceName: string | null;
  nextAppointmentAt: string | null;
}

export interface OwnerClientsResponse {
  ok: true;
  data: OwnerClientRow[];
  total: number;
}

export interface OwnerClientDetail extends OwnerClientRow {
  completedAppointments: number | null;
  cancelledAppointments: number | null;
  noShowAppointments: number | null;
}

export interface OwnerClientAppointmentRow {
  id: string;
  status: AppointmentStatus;
  requested_start_at: string;
  requested_end_at: string;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
}

export interface OwnerClientDetailResponse {
  ok: true;
  client: OwnerClientDetail;
  appointments: OwnerClientAppointmentRow[];
}

export interface OwnerServiceRow {
  id: string;
  name: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
}

export interface OwnerServicesResponse {
  ok: true;
  data: OwnerServiceRow[];
}

export interface OwnerTimeBlockRow {
  id: string;
  block_type: string;
  reason: string | null;
  is_recurring: boolean;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
}

export interface OwnerTimeBlocksResponse {
  ok: true;
  data: OwnerTimeBlockRow[];
}

export interface OwnerAppointmentMutationResult {
  id: string;
  status: AppointmentStatus;
  requested_start_at: string;
  requested_end_at: string;
}

export interface OwnerMutationResponse {
  ok: true;
  appointment: OwnerAppointmentMutationResult;
}

export interface OwnerWeeklyAvailabilityRow {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isOverride: boolean;
  overrideId: string | null;
}

export interface OwnerWeeklyAvailabilityResponse {
  ok: true;
  week_start_date?: string;
  hasOverrides?: boolean;
  availability: OwnerWeeklyAvailabilityRow[];
}

export interface OwnerWeeklyAvailabilityDeleteResponse {
  ok: true;
  deletedCount: number;
}

export interface OwnerWeeklyAvailabilityUpdateInput {
  availability: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
}

export interface PublicBookingRequestInput {
  fullName: string;
  phone: string;
  serviceId: string;
  startAt: string;
  notes?: string;
  token?: string;
}

export interface PublicBookingResponse {
  ok: true;
  appointment: {
    id: string;
    status: AppointmentStatus;
    requestedStartAt: string;
    requestedEndAt: string;
  };
  client: {
    fullName: string;
    phone: string;
  };
}

export interface PublicService {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes?: number;
  price?: number | null;
  sortOrder?: number;
}

export interface PublicAvailabilitySlot {
  slotStartAt: string;
  slotEndAt: string;
}

export interface PublicServicesResponse {
  ok: true;
  services: Array<{
    id: string;
    name: string;
    description?: string | null;
    durationMinutes?: number;
    price?: number | null;
    sortOrder?: number;
  }>;
}

export interface PublicAvailabilityResponse {
  ok: true;
  slots: PublicAvailabilitySlot[];
}

export class HttpError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(status: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
