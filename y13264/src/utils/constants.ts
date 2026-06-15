import { ComplaintStatus } from './types';

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  for_publication: '待公示',
  publicized: '已公示',
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  for_publication: 'bg-purple-100 text-purple-800 border-purple-200',
  publicized: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export const STATUS_ICONS: Record<ComplaintStatus, string> = {
  pending: 'clock',
  processing: 'loader',
  for_publication: 'eye',
  publicized: 'check-circle',
};

export const MERGE_STATUS_LABELS = {
  none: '正常',
  merged: '已归并',
  duplicate: '重复记录',
  same_street: '同街口多单',
};

export const STORAGE_KEY = 'rainwater_drain_complaints_v1';
export const DUPLICATE_TIME_WINDOW_HOURS = 24;
export const SIMILARITY_THRESHOLD = 0.85;

export const DEFAULT_OPERATOR = '阿宁';
