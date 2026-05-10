// ─── Outbound messages ───────────────────────────────────────────────────────

export type OwnerMessageStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type OwnerMessageType =
  | 'confirmation'
  | 'reminder'
  | 'reconfirmation'
  | 'cancellation'
  | 'reschedule'
  | 'incident'
  | 'owner_approval_result'
  | 'general';

export interface OwnerMessage {
  id: string;
  channel: 'whatsapp' | string;
  messageType: OwnerMessageType;
  status: OwnerMessageStatus;
  client: {
    id: string;
    fullName: string;
    phone: string;
  };
  appointment: {
    id: string;
    requestedStartAt: string;
    serviceName: string;
  } | null;
  body: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface OwnerMessagesSummary {
  total: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface OwnerMessagesResponse {
  ok: true;
  data: OwnerMessage[];
  total: number;
  summary: OwnerMessagesSummary;
}

export interface OwnerMessagesParams {
  status?: OwnerMessageStatus;
  messageType?: OwnerMessageType;
  /** UUID — filter by specific client */
  clientId?: string;
  /** YYYY-MM-DD — must be sent with endDate */
  startDate?: string;
  /** YYYY-MM-DD — must be sent with startDate, max 45-day range */
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RetryOwnerMessageResponse {
  ok: true;
  message: {
    id: string;
    status: OwnerMessageStatus;
  };
}

// ─── Inbound messages ────────────────────────────────────────────────────────

export type InboundMessageIntent =
  | 'booking'
  | 'availability'
  | 'confirm'
  | 'cancel'
  | 'reschedule'
  | 'late'
  | 'location'
  | 'price'
  | 'hours'
  | 'human_help'
  | 'greeting'
  | 'thanks'
  | 'unknown';

export interface OwnerInboundMessage {
  id: string;
  channel: 'whatsapp' | string;
  fromPhone: string;
  body: string;
  intent: InboundMessageIntent;
  confidence: number;
  needs_human_review: boolean;
  normalized_body: string | null;
  /** true → el bot respondió automáticamente. false → no respondió (posible acción requerida). */
  botReplied: boolean;
  /** ISO timestamp de cuándo el bot envió la respuesta automática. null si no respondió. */
  botRepliedAt: string | null;
  /** UUID del outbound_message generado como respuesta automática. null si no hay respuesta. */
  outboundMessageId: string | null;
  /** Optional backend metadata for specialized actions, e.g. emergency_call. */
  metadata?: {
    action?: string;
    urgency?: string;
    channel?: string;
    [key: string]: unknown;
  } | null;
  client: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  appointment: {
    id: string;
    requestedStartAt: string;
    serviceName: string | null;
  } | null;
  receivedAt: string;
  readAt: string | null;
}

export interface OwnerInboundMessagesSummary {
  total: number;
  needsHumanReview: number;
  unread: number;
  byIntent: Record<InboundMessageIntent, number>;
}

export interface OwnerInboundMessagesResponse {
  ok: true;
  data: OwnerInboundMessage[];
  total: number;
  summary: OwnerInboundMessagesSummary;
}

export interface OwnerInboundMessagesParams {
  intent?: InboundMessageIntent;
  needs_human_review?: boolean;
  read?: boolean;
  page?: number;
  limit?: number;
}

export interface MarkInboundReadResponse {
  ok: true;
  message: {
    id: string;
    readAt: string;
  };
}

export interface LinkInboundAppointmentResponse {
  ok: true;
  message: {
    id: string;
    appointmentId: string;
  };
}
