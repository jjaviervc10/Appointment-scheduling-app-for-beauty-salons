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
  custom_duration_minutes?: number | null;
  duration_minutes: number;
  notes: string | null;
  cancellation_reason: string | null;
  client_response_at?: string | null;
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
  custom_duration_minutes?: number | null;
  duration_minutes?: number | null;
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
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OwnerServicesResponse {
  ok: true;
  data: OwnerServiceRow[];
}

/** Shape returned by POST /api/owner/services and PATCH /api/owner/services/:id (camelCase) */
export interface OwnerServiceMutationResult {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerServiceMutationResponse {
  ok: true;
  service: OwnerServiceMutationResult;
}

export interface OwnerServiceCreateInput {
  name: string;
  description?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface OwnerServiceUpdateInput {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  sortOrder?: number;
  isActive?: boolean;
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

export interface OwnerTimeBlockCreateInput {
  blockType: string;
  reason?: string | null;
  isRecurring: boolean;
  specificDate?: string | null;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
}

export interface OwnerTimeBlockCreateResponse {
  ok: true;
  timeBlock: OwnerTimeBlockRow;
}

export interface OwnerTimeBlockDeleteResponse {
  ok: true;
  timeBlock: { id: string; is_active: false };
}

export interface OwnerAppointmentMutationResult {
  id: string;
  status: AppointmentStatus;
  requested_start_at: string;
  requested_end_at: string;
  custom_duration_minutes?: number | null;
  duration_minutes?: number | null;
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

export type PublicAvailabilityResponse =
  | { ok: true; slots: PublicAvailabilitySlot[]; weekAvailable: false; message: string }
  | { ok: true; slots: PublicAvailabilitySlot[]; weekAvailable: true };

export interface PublicMiniAppTokenAppointment {
  id: string;
  serviceId: string;
  serviceName: string | null;
  startAt: string;
  status: AppointmentStatus;
}

export interface PublicMiniAppTokenResponse {
  ok: true;
  purpose: 'booking' | 'availability' | 'reschedule' | 'cancel' | 'human_help';
  phone: string;
  fullName: string;
  expiresAt: string;
  appointment: PublicMiniAppTokenAppointment | null;
  appointments: PublicMiniAppTokenAppointment[];
}

export interface PublicRescheduleRequestInput {
  token: string;
  appointmentId: string;
  newStartAt: string;
  notes?: string | null;
}

export interface PublicRescheduleRequestResponse {
  ok: true;
  appointment: {
    id: string;
    status: AppointmentStatus;
    requestedStartAt: string;
  };
}

export interface PublicCancelAppointmentInput {
  token: string;
  appointmentId: string;
  reason?: string | null;
}

export interface PublicCancelAppointmentResponse {
  ok: true;
  appointment: {
    id: string;
    status: AppointmentStatus;
    cancelledAt: string;
  };
}

export type OwnerShareAvailabilityRange = 'today' | 'tomorrow' | 'week' | 'date';

export interface OwnerShareAvailabilitySlot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface OwnerShareAvailabilityDay {
  date: string;
  label: string;
  slots: OwnerShareAvailabilitySlot[];
}

export interface OwnerShareAvailabilityResponse {
  ok: true;
  business: {
    name: string;
    timezone: string;
  };
  range: {
    type: OwnerShareAvailabilityRange;
    startDate: string;
    endDate: string;
    label: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  } | null;
  days: OwnerShareAvailabilityDay[];
  summary: {
    totalSlots: number;
    hasAvailability: boolean;
    excludedExpiredSlots: boolean;
    updatedAt: string;
  };
  share: {
    title: string;
    bodyText: string;
    bookingUrl: string;
    qrUrl: string | null;
  };
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

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface OwnerSettings {
  businessName: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxAdvanceDays: number;
  timezone: string;
}

export interface OwnerSettingsResponse {
  ok: true;
  settings: OwnerSettings;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface CreateIncidentInput {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  /** Min 1, max 10. Each reason max 100 chars. */
  reasons: string[];
  description?: string | null;
  cancelAppointments: boolean;
  notifyClients: boolean;
}

export interface CreateIncidentResponse {
  ok: true;
  incident: {
    id: string;
    severity: string;
    description: string | null;
    created_at: string;
    affectedAppointmentsCount: number;
  };
}

export interface OwnerIncident {
  id: string;
  /** YYYY-MM-DD (local business timezone) */
  date: string;
  /** HH:mm */
  block_start_time: string;
  /** HH:mm */
  block_end_time: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'emergency';
  /** Always [] per contract */
  affected_appointment_ids: string[];
  is_resolved: boolean;
  /** ISO 8601 UTC */
  created_at: string;
}

export interface OwnerIncidentsResponse {
  ok: true;
  data: OwnerIncident[];
}

export interface OwnerTimeBlockUpdateInput {
  blockType?: string;
  reason?: string | null;
  isRecurring?: boolean;
  specificDate?: string | null;
  dayOfWeek?: number | null;
  startTime?: string;
  endTime?: string;
}

export interface OwnerTimeBlockUpdateResponse {
  ok: true;
  timeBlock: OwnerTimeBlockRow;
}

// ─── Messages diagnostics & send-now ─────────────────────────────────────────

export interface OwnerMessagesDiagnosticsResponse {
  ok: true;
  whatsapp: {
    dryRun: boolean;
    mode: 'test' | 'production' | string;
    workerEnabled: boolean;
    workerIntervalMs: number;
    workerBatchSize: number;
    phoneNumberIdConfigured: boolean;
    accessTokenConfigured: boolean;
    verifyTokenConfigured: boolean;
    allowedTestPhonesCount: number;
    miniAppBaseUrl: string;
    brandImageConfigured: boolean;
    sendBrandImage: boolean;
    emergencyCallPhoneConfigured: boolean;
  };
  queue: {
    pending: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface SendOwnerMessageNowResponse {
  ok: true;
  message: {
    id: string;
    status: string;
    providerMessageId: string | null;
  };
}
