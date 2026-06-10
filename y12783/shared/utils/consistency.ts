import type { BatchStatus, ResultStatus } from '../types';

export interface StatusMapEntry {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const batchStatusMap: Record<BatchStatus, StatusMapEntry> = {
  pending: {
    label: '待处理',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  processing: {
    label: '处理中',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  completed: {
    label: '已完成',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  exception: {
    label: '异常',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export const resultStatusMap: Record<ResultStatus, StatusMapEntry> = {
  pass: {
    label: '通过',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  pending: {
    label: '待确认',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  fail: {
    label: '未通过',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export const algorithmLabelMap: Record<string, string> = {
  standard: '标准算法',
  degraded_cli: '降级算法(CLI)',
};

export const sourceLabelMap: Record<string, string> = {
  web: 'Web界面',
  cli: 'CLI命令行',
};

export function getBatchStatusLabel(status: BatchStatus): string {
  return batchStatusMap[status]?.label ?? status;
}

export function getResultStatusLabel(status: ResultStatus): string {
  return resultStatusMap[status]?.label ?? status;
}

export const exportStatusMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  exception: '异常',
  pass: '通过',
  fail: '未通过',
};

export function getExportStatus(value: string): string {
  return exportStatusMap[value] ?? value;
}
