import { useState, useEffect, useCallback } from 'react';
import { fetchAppointmentsByDate, fetchPendingAppointments, fetchUpcomingAppointments } from '../services/appointments';
import type { AppointmentViewModel } from '../types/models';

export function useAppointmentsByDate(date: string) {
  const [data, setData] = useState<AppointmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchAppointmentsByDate(date);
    setData(result);
    setLoading(false);
  }, [date]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function usePendingAppointments() {
  const [data, setData] = useState<AppointmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchPendingAppointments();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useUpcomingAppointments(enabled = true) {
  const [data, setData] = useState<AppointmentViewModel[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await fetchUpcomingAppointments();
      setData(result);
    } catch (err) {
      setData([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
