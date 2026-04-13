export { colors, spacing, radii, shadows, typography } from './tokens';

import { colors } from './tokens';
import type { AppointmentStatus } from '../types/enums';

/** Maps appointment status to chip colors */
export const statusColors: Record<AppointmentStatus, { text: string; bg: string }> = {
  pending_owner_approval: { text: colors.statusPending, bg: colors.statusPendingBg },
  rejected_by_owner: { text: colors.statusRejected, bg: colors.statusRejectedBg },
  confirmed_by_owner: { text: colors.statusConfirmed, bg: colors.statusConfirmedBg },
  awaiting_client_confirmation: { text: colors.statusAwaitingClient, bg: colors.statusAwaitingClientBg },
  client_confirmed: { text: colors.statusConfirmed, bg: colors.statusConfirmedBg },
  client_cancelled: { text: colors.statusCancelled, bg: colors.statusCancelledBg },
  owner_cancelled: { text: colors.statusCancelled, bg: colors.statusCancelledBg },
  reschedule_required: { text: colors.statusReschedule, bg: colors.statusRescheduleBg },
  completed: { text: colors.statusCompleted, bg: colors.statusCompletedBg },
  no_show: { text: colors.statusNoShow, bg: colors.statusNoShowBg },
};

/** Human-readable labels for appointment status */
export const statusLabels: Record<AppointmentStatus, string> = {
  pending_owner_approval: 'Pendiente',
  rejected_by_owner: 'Rechazada',
  confirmed_by_owner: 'Confirmada',
  awaiting_client_confirmation: 'Esperando confirmación',
  client_confirmed: 'Confirmada',
  client_cancelled: 'Cancelada',
  owner_cancelled: 'Cancelada por dueño',
  reschedule_required: 'Reprogramar',
  completed: 'Completada',
  no_show: 'No asistió',
};
