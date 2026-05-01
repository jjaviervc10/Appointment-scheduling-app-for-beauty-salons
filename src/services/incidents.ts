import type { Incident } from '../types/database';

export async function fetchIncidents(): Promise<Incident[]> {
  throw new Error('No backend endpoint connected for incidents.');
}

export async function fetchActiveIncidents(): Promise<Incident[]> {
  throw new Error('No backend endpoint connected for active incidents.');
}

export async function createIncident(
  incident: Omit<Incident, 'id' | 'created_at' | 'resolved_at'>
): Promise<{ id: string }> {
  throw new Error(`No backend endpoint connected for creating incidents: ${incident.title}`);
}

export async function resolveIncident(incidentId: string): Promise<void> {
  throw new Error(`No backend endpoint connected for resolving incidents: ${incidentId}`);
}
