export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function formatDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatNumber(num: number, precision: number = 4): string {
  if (Math.abs(num) < 0.0001 && num !== 0) {
    return num.toExponential(precision);
  }
  return num.toFixed(precision);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getWarningColor(severity: 'info' | 'warning' | 'error'): string {
  switch (severity) {
    case 'info': return 'text-blue-400';
    case 'warning': return 'text-orange-400';
    case 'error': return 'text-red-400';
  }
}

export function getWarningBgColor(severity: 'info' | 'warning' | 'error'): string {
  switch (severity) {
    case 'info': return 'bg-blue-500/10 border-blue-500/30';
    case 'warning': return 'bg-orange-500/10 border-orange-500/30';
    case 'error': return 'bg-red-500/10 border-red-500/30';
  }
}

export function getStatusColor(status: 'normal' | 'warning' | 'error' | 'needs_review'): string {
  switch (status) {
    case 'normal': return 'text-green-400';
    case 'warning': return 'text-orange-400';
    case 'error': return 'text-red-400';
    case 'needs_review': return 'text-yellow-400';
  }
}

export function getStatusLabel(status: 'normal' | 'warning' | 'error' | 'needs_review'): string {
  switch (status) {
    case 'normal': return '正常';
    case 'warning': return '警告';
    case 'error': return '错误';
    case 'needs_review': return '需人工确认';
  }
}

export function getStudentStatusLabel(status: 'raw' | 'processed' | 'corrected' | 'needs_review'): string {
  switch (status) {
    case 'raw': return '未处理';
    case 'processed': return '已处理';
    case 'corrected': return '已修正';
    case 'needs_review': return '需人工确认';
  }
}

export function getStudentStatusColor(status: 'raw' | 'processed' | 'corrected' | 'needs_review'): string {
  switch (status) {
    case 'raw': return 'text-gray-400';
    case 'processed': return 'text-blue-400';
    case 'corrected': return 'text-green-400';
    case 'needs_review': return 'text-yellow-400';
  }
}
