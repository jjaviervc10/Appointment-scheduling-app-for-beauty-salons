export type AppointmentStatus =
  | 'pending_owner_approval'
  | 'rejected_by_owner'
  | 'confirmed_by_owner'
  | 'awaiting_client_confirmation'
  | 'client_confirmed'
  | 'client_cancelled'
  | 'owner_cancelled'
  | 'reschedule_required'
  | 'completed'
  | 'no_show';

export type UserRole = 'owner' | 'client';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TimeBlockType =
  | 'personal'
  | 'comida'
  | 'escuela'
  | 'descanso'
  | 'mandado'
  | 'otro';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'emergency';

export type MessageChannel = 'whatsapp' | 'sms' | 'push';

export type MessageDirection = 'outbound' | 'inbound';

export type OutboundMessageStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type InboundMessageIntent =
  | 'confirm'
  | 'cancel'
  | 'reschedule'
  | 'unknown';
