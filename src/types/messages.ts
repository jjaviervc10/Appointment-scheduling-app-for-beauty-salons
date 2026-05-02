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
