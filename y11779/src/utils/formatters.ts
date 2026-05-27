export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatCurrency(value: number): string {
  return `¥${formatNumber(value)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDate(dateStr);
}

export function getCoverageStatusColor(coverage: number, target: number): string {
  const ratio = coverage / target;
  if (ratio >= 1) return '#10b981';
  if (ratio >= 0.9) return '#f59e0b';
  return '#ef4444';
}

export function getCoverageStatusBgColor(coverage: number, target: number): string {
  const ratio = coverage / target;
  if (ratio >= 1) return 'bg-emerald-500';
  if (ratio >= 0.9) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getCoverageStatusLabel(coverage: number, target: number): string {
  const ratio = coverage / target;
  if (ratio >= 1) return '达标';
  if (ratio >= 0.9) return '接近达标';
  return '未达标';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getSeverityColor(severity: 'warning' | 'error'): string {
  return severity === 'error' ? '#ef4444' : '#f59e0b';
}

export function getSeverityLabel(severity: 'warning' | 'error'): string {
  return severity === 'error' ? '严重' : '警告';
}
