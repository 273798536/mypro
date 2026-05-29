function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

export function formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const seconds = padZero(d.getSeconds());

  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
}

export function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return {
    startDate: formatDate(start, 'YYYY-MM-DD'),
    endDate: formatDate(end, 'YYYY-MM-DD'),
  };
}

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split(/[-/\s:]/);
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hours = parts[3] ? parseInt(parts[3], 10) : 0;
    const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
    const seconds = parts[5] ? parseInt(parts[5], 10) : 0;

    return new Date(year, month, day, hours, minutes, seconds);
  }
  return new Date(dateStr);
}
