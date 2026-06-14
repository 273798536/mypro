export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function formatNumber(num: number | null | undefined, decimals: number = 4): string {
  if (num === null || num === undefined) return '—';
  if (typeof num !== 'number') return String(num);
  if (isNaN(num)) return 'N/A';
  if (!isFinite(num)) return num > 0 ? '+∞' : '-∞';
  return Number(num.toFixed(decimals)).toString();
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isApproximatelyZero(value: number, epsilon: number = 1e-10): boolean {
  return Math.abs(value) < epsilon;
}

export function safeDivide(numerator: number, denominator: number): { result: number; isZeroDivision: boolean; reason?: string } {
  if (isApproximatelyZero(denominator)) {
    return {
      result: NaN,
      isZeroDivision: true,
      reason: `分母为 ${denominator}（接近零），无法计算`,
    };
  }
  return {
    result: numerator / denominator,
    isZeroDivision: false,
  };
}
