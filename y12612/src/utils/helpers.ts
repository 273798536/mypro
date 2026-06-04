export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRunId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `RUN-${timestamp}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateForFileName(ts: number = Date.now()): string {
  return new Date(ts).toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

export function getDeviceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    crane: '塔吊',
    scaffold: '脚手架',
    fire_extinguisher: '灭火器',
    electrical: '电气设备',
  };
  return labels[type] || type;
}

export function getRiskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    safe: '安全',
    warning: '警示',
    danger: '危险',
  };
  return labels[level] || level;
}

export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    safe: '#2ecc71',
    warning: '#ff6b35',
    danger: '#e74c3c',
  };
  return colors[level] || '#999';
}

export function getAnnotationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    rectangle: '区域标注',
    text: '文字标注',
    arrow: '箭头指向',
    comment: '备注',
  };
  return labels[type] || type;
}
