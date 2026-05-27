export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 4): string {
  return value.toFixed(decimals);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(value);
}

export function getAxisLabel(axis: 'return' | 'volatility' | 'drawdown'): string {
  const labels = {
    return: '预期收益',
    volatility: '波动率',
    drawdown: '最大回撤'
  };
  return labels[axis];
}

export function getAxisUnit(axis: 'return' | 'volatility' | 'drawdown'): string {
  return '%';
}

export function getStatusColor(status: 'normal' | 'warning' | 'error'): string {
  const colors = {
    normal: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };
  return colors[status];
}

export function getStatusLabel(status: 'normal' | 'warning' | 'error'): string {
  const labels = {
    normal: '正常',
    warning: '警告',
    error: '错误'
  };
  return labels[status];
}

export function getAnomalyTypeLabel(type: 'weight_sum' | 'risk_overlap' | 'constraint_inactive'): string {
  const labels = {
    weight_sum: '权重异常',
    risk_overlap: '风险重叠',
    constraint_inactive: '约束未生效'
  };
  return labels[type];
}

export function getImportModeLabel(mode: 'ignore' | 'overwrite' | 'append'): string {
  const labels = {
    ignore: '忽略重复',
    overwrite: '覆盖更新',
    append: '追加导入'
  };
  return labels[mode];
}

export function getSharpeRating(sharpe: number): { label: string; color: string } {
  if (sharpe >= 2) return { label: '优秀', color: '#10b981' };
  if (sharpe >= 1) return { label: '良好', color: '#3b82f6' };
  if (sharpe >= 0.5) return { label: '一般', color: '#f59e0b' };
  return { label: '较差', color: '#ef4444' };
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function generateColorGradient(
  value: number,
  min: number,
  max: number,
  colors: string[] = ['#10b981', '#f59e0b', '#ef4444']
): string {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  if (normalized <= 0.5) {
    const t = normalized * 2;
    return interpolateColor(colors[0], colors[1], t);
  } else {
    const t = (normalized - 0.5) * 2;
    return interpolateColor(colors[1], colors[2], t);
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function calculateStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  return { min, max, mean, median, std };
}
