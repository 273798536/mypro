export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}

export function degreeToRadian(deg: number): number {
  return deg * (Math.PI / 180);
}

export function radianToDegree(rad: number): number {
  return rad * (180 / Math.PI);
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    reviewing: '复核中',
    confirmed: '已确认',
  };
  return map[status] || status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-space-600 text-space-200 border-space-500',
    reviewing: 'bg-amber-900/40 text-amber-300 border-amber-600/50',
    confirmed: 'bg-emerald-900/40 text-emerald-300 border-emerald-600/50',
  };
  return map[status] || 'bg-space-600 text-space-200';
}

export function getUnitText(unit: string): string {
  return unit === 'degree' ? '度 (°)' : '弧度 (rad)';
}

export function convertInclination(value: number, fromUnit: 'degree' | 'radian', toUnit: 'degree' | 'radian'): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'degree' && toUnit === 'radian') {
    return degreeToRadian(value);
  }
  return radianToDegree(value);
}
