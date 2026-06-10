export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDateStr: string): {
  label: string;
  className: string;
  days: number;
} {
  const days = getDaysUntilExpiry(expiryDateStr);
  
  if (days < 0) {
    return { label: `已过期 ${Math.abs(days)} 天`, className: 'text-rose-600', days };
  } else if (days === 0) {
    return { label: '今日到期', className: 'text-rose-500', days };
  } else if (days <= 7) {
    return { label: `还剩 ${days} 天`, className: 'text-amber-600', days };
  } else if (days <= 30) {
    return { label: `还剩 ${days} 天`, className: 'text-blue-600', days };
  } else {
    return { label: `还剩 ${days} 天`, className: 'text-slate-500', days };
  }
}
