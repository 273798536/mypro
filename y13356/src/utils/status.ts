import type { SnapshotStatus, ChangeType, JudgmentResult } from '@/types';

export const statusMap: Record<SnapshotStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: '待审核',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  approved: {
    label: '已放行',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  need_supplement: {
    label: '需补充',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  gray_error: {
    label: '灰度错误',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
};

export const getStatusLabel = (status: SnapshotStatus): string => {
  return statusMap[status]?.label || status;
};

export const changeTypeMap: Record<ChangeType, { label: string; color: string; icon: string }> = {
  none: {
    label: '无变化',
    color: 'text-slate-500',
    icon: 'minus',
  },
  added: {
    label: '新增',
    color: 'text-emerald-600',
    icon: 'plus',
  },
  removed: {
    label: '移除',
    color: 'text-red-600',
    icon: 'x',
  },
  modified: {
    label: '修改',
    color: 'text-blue-600',
    icon: 'edit',
  },
};

export const getChangeTypeLabel = (type: ChangeType): string => {
  return changeTypeMap[type]?.label || type;
};

export const judgmentResultMap: Record<JudgmentResult, { label: string; color: string; bgColor: string }> = {
  pass: {
    label: '放行',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  need_supplement: {
    label: '需补充',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
};

export const getJudgmentResultLabel = (result: JudgmentResult): string => {
  return judgmentResultMap[result]?.label || result;
};

export const formatBoolean = (value: boolean): string => {
  return value ? '是' : '否';
};
