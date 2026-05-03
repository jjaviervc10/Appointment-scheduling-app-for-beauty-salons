/**
 * Database row types aligned with booking.* schema in Supabase.
 * Each type represents a row in the corresponding table.
 */

import type {
  AppointmentStatus,
  UserRole,
  DayOfWeek,
  TimeBlockType,
  IncidentSeverity,
  MessageChannel,
  OutboundMessageStatus,
  InboundMessageIntent,
} from './enums';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  owner_id: string;
  business_name: string;
  timezone: string;
  default_slot_duration_minutes: number;
  buffer_minutes: number;
  max_advance_booking_days: number;
  auto_reject_after_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  profile_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_after_minutes: number;
  price: number | null;
  is_active: boolean;
  created_at: string;
}

export interface WeeklyAvailability {
  id: string;
  owner_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  is_active: boolean;
  is_override: boolean;   // true si este día usa un override semanal, no el template base
  override_id: string | null;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  owner_id: string;
  block_type: TimeBlockType;
  label: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  is_recurring: boolean;
  recurrence_day_of_week: DayOfWeek | null;
  notes: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  date: string;
  block_start_time: string;
  block_end_time: string;
  affected_appointment_ids: string[];
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface Appointment {
  id: string;
  client_id: string;
  owner_id: string;
  service_id: string;
  status: AppointmentStatus;
  requested_start_at: string; // ISO datetime
  requested_end_at: string;
  owner_response_at: string | null;
  client_response_at: string | null;
  cancellation_reason: string | null;
  rescheduled_from_appointment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

export interface OutboundMessage {
  id: string;
  appointment_id: string | null;
  recipient_phone: string;
  channel: MessageChannel;
  template_id: string | null;
  body: string;
  status: OutboundMessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface InboundMessage {
  id: string;
  sender_phone: string;
  channel: MessageChannel;
  raw_body: string;
  parsed_intent: InboundMessageIntent | null;
  matched_appointment_id: string | null;
  processed: boolean;
  received_at: string;
  created_at: string;
}

export interface NotificationEvent {
  id: string;
  appointment_id: string;
  event_type: string;
  scheduled_at: string;
  sent: boolean;
  outbound_message_id: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  owner_id: string;
  name: string;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}
