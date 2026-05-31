export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}${timestamp}_${random}`;
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return value.toFixed(decimals);
}

export function formatDistance(value: number): string {
  return formatNumber(value, 3) + ' m';
}

export function formatSpeed(value: number): string {
  return formatNumber(value, 2) + ' m/s';
}

export function formatTime(value: number): string {
  return formatNumber(value, 3) + ' s';
}

export function formatLoad(value: number): string {
  return formatNumber(value, 0) + ' kg';
}

export function formatPercent(value: number): string {
  return formatNumber(value * 100, 1) + '%';
}

export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/g, '');
  return new Date(cleaned);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}

export function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const cleaned = String(value)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function isValidNumber(value: any): boolean {
  return parseNumber(value) !== null;
}

export function isEmptyRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  return row.every(cell => {
    if (cell === null || cell === undefined) return true;
    if (typeof cell === 'string') return cell.trim() === '';
    return false;
  });
}

export function isRemarkRow(row: any[], columnIndex: number = 0): boolean {
  if (!Array.isArray(row) || row.length === 0) return false;
  const firstCell = row[columnIndex];
  if (typeof firstCell !== 'string') return false;
  const trimmed = firstCell.trim();
  return (
    trimmed.startsWith('备注') ||
    trimmed.startsWith('说明') ||
    trimmed.startsWith('注：') ||
    trimmed.startsWith('注:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('//')
  );
}

export function parseSpeedCurve(data: string | any[]): Array<{ time: number; speed: number }> {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data
      .map(item => {
        if (Array.isArray(item) && item.length >= 2) {
          return { time: parseNumber(item[0]) ?? 0, speed: parseNumber(item[1]) ?? 0 };
        }
        if (typeof item === 'object' && 'time' in item && 'speed' in item) {
          return { time: parseNumber(item.time) ?? 0, speed: parseNumber(item.speed) ?? 0 };
        }
        return null;
      })
      .filter((p): p is { time: number; speed: number } => p !== null);
  }
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parseSpeedCurve(parsed);
    } catch {
      const pairs = data.split(/[;,]/).map(s => s.trim()).filter(Boolean);
      return pairs
        .map(pair => {
          const [timeStr, speedStr] = pair.split(/[:\s]+/);
          const time = parseNumber(timeStr);
          const speed = parseNumber(speedStr);
          if (time !== null && speed !== null) {
            return { time, speed };
          }
          return null;
        })
        .filter((p): p is { time: number; speed: number } => p !== null);
    }
  }
  
  return [];
}

export function calculateHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
