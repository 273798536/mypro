import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDateTime(timestamp: number): string {
  return format(timestamp, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

export function formatTime(timestamp: number): string {
  return format(timestamp, 'HH:mm:ss', { locale: zhCN });
}

export function formatDate(timestamp: number): string {
  return format(timestamp, 'yyyy-MM-dd', { locale: zhCN });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return formatDate(timestamp);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
