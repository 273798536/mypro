export const statusLabels: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  contaminated: '污染',
  manually_confirmed: '人工确认',
  pending: '待处理',
  completed: '已完成',
  running: '运行中',
  needs_review: '待复核',
};

export const statusColors: Record<string, string> = {
  normal: 'bg-teal-600 text-teal-50',
  warning: 'bg-amber-500 text-amber-50',
  contaminated: 'bg-red-600 text-red-50',
  manually_confirmed: 'bg-indigo-600 text-indigo-50',
  pending: 'bg-gray-500 text-gray-50',
  completed: 'bg-teal-600 text-teal-50',
  running: 'bg-blue-500 text-blue-50',
  needs_review: 'bg-amber-500 text-amber-50',
};

export const contaminationTypeLabels: Record<string, string> = {
  mycoplasma: '支原体污染',
  cross_sample: '交叉样本污染',
  reagent: '试剂污染',
  unknown: '未知污染',
};

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
