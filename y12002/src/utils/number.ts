export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(num: number): string {
  return '¥' + formatNumber(num, 2);
}

export function formatMiles(num: number): string {
  return formatNumber(num, 0);
}

export function parseNumber(str: string): number {
  const cleaned = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}
