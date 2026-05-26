export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-trade-up';
  if (pnl < 0) return 'text-trade-down';
  return 'text-gray-400';
}

export function getPnLBgColor(pnl: number): string {
  if (pnl > 0) return 'bg-trade-up/10';
  if (pnl < 0) return 'bg-trade-down/10';
  return 'bg-gray-500/10';
}
