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

export function useUpcomingAppointments() {
  const [data, setData] = useState<AppointmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchUpcomingAppointments();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
