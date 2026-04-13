/**
 * Incidents service layer.
 * TODO: Replace mock calls with real Supabase queries.
 */

import { MOCK_INCIDENTS } from './mock-data';
import type { Incident } from '../types/database';

export async function fetchIncidents(): Promise<Incident[]> {
  // TODO: Supabase query from booking.incidents
  return MOCK_INCIDENTS;
}

export async function fetchActiveIncidents(): Promise<Incident[]> {
  // TODO: .eq('is_resolved', false)
  return MOCK_INCIDENTS.filter((i) => !i.is_resolved);
}

export async function createIncident(
  incident: Omit<Incident, 'id' | 'created_at' | 'resolved_at'>
): Promise<{ id: string }> {
  // TODO: Supabase insert into booking.incidents
  console.log('[MOCK] Creating incident', incident);
  return { id: 'inc-' + Date.now() };
}

export async function resolveIncident(incidentId: string): Promise<void> {
  // TODO: Supabase update set is_resolved = true, resolved_at = now()
  console.log('[MOCK] Resolving incident', incidentId);
}
