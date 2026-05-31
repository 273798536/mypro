import { format as formatDate, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyWithSign(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  return amount >= 0 ? formatted : `-${formatted}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDateStr(dateStr: string, pattern: string = 'yyyy-MM-dd'): string {
  try {
    const date = parseISO(dateStr);
    return formatDate(date, pattern, { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDateStr(dateStr, 'yyyy-MM-dd HH:mm');
}

export function formatDateFull(dateStr: string): string {
  return formatDateStr(dateStr, 'yyyy年MM月dd日');
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: '剧集名称',
    episodes: '集数',
    productionCost: '制作成本',
    authorization: '授权方',
    status: '状态',
    channel: '渠道',
    costDate: '消耗日期',
    amount: '金额',
    isDelayed: '是否延迟',
    remark: '备注',
    flowDate: '流水日期',
    userSource: '用户来源',
    orderNo: '订单号',
    paymentDate: '回款日期',
    isSplit: '是否拆分',
    splitFrom: '拆分来源',
  };
  return labels[fieldName] || fieldName;
}

export function formatValue(fieldName: string, value: string): string {
  if (fieldName === 'productionCost' || fieldName === 'amount') {
    return formatCurrency(Number(value));
  }
  if (fieldName === 'status') {
    const statusLabels: Record<string, string> = {
      active: '投放中',
      completed: '已完结',
      pending: '待投放',
    };
    return statusLabels[value] || value;
  }
  if (fieldName === 'isDelayed' || fieldName === 'isSplit') {
    return value === 'true' ? '是' : '否';
  }
  return value;
}
