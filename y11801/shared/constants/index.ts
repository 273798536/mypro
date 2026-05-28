import type { ImportDataType, ResultStatus, PendingType } from '../types/index.js';

export const DATA_TYPE_LABELS: Record<ImportDataType, string> = {
  vehicle: '车辆档案',
  contract: '贷款合同',
  residual: '残值表',
};

export const RESULT_STATUS_CONFIG: Record<ResultStatus, { label: string; color: string; bgColor: string }> = {
  ready: {
    label: '可直接用',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  need_confirm: {
    label: '需确认',
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  cannot_calculate: {
    label: '暂不能算',
    color: '#ef4444',
    bgColor: '#fef2f2',
  },
};

export const PENDING_TYPE_CONFIG: Record<PendingType, { label: string; level: 'high' | 'medium' | 'low'; icon: string }> = {
  residual_expired: {
    label: '残值过期',
    level: 'high',
    icon: 'alert-triangle',
  },
  contract_replaced: {
    label: '合同换车',
    level: 'medium',
    icon: 'refresh-cw',
  },
  subsidy_clawback: {
    label: '补贴追回',
    level: 'high',
    icon: 'dollar-sign',
  },
};

export const SUBSIDY_TYPE_LABELS: Record<string, string> = {
  national: '国家补贴',
  local: '地方补贴',
  dealer: '经销商补贴',
};

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
};

export const PENDING_STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  ignored: '已忽略',
};

export const EXPORT_STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

export const EXPORT_TYPE_LABELS: Record<string, string> = {
  excel: 'Excel',
  pdf: 'PDF',
};
