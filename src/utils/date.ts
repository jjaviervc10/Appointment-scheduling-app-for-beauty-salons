export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getIsoDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function formatLocalDateTimeWithOffset(dateKey: string, time: string): string {
  const [hour = '00', minute = '00', second = '00'] = time.split(':');
  const normalizedTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
  const date = new Date(`${dateKey}T${normalizedTime}`);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHour = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const offsetMinute = String(absOffset % 60).padStart(2, '0');

  return `${dateKey}T${normalizedTime}${sign}${offsetHour}:${offsetMinute}`;
}
