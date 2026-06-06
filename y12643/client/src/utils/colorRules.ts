import { RecordStatus, ExceptionType, RecordType } from '@/types';

export interface StatusColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
  hex: string;
  label: string;
}

export const STATUS_COLORS: Record<RecordStatus, StatusColor> = {
  [RecordStatus.NORMAL]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-500',
    dot: 'bg-green-500',
    hex: '#22c55e',
    label: '正常/通过'
  },
  [RecordStatus.PENDING]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-500',
    dot: 'bg-yellow-500',
    hex: '#eab308',
    label: '待确认'
  },
  [RecordStatus.ABNORMAL]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-500',
    dot: 'bg-red-500',
    hex: '#ef4444',
    label: '异常/驳回'
  },
  [RecordStatus.OFFLINE_MISSING]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-500',
    dot: 'bg-orange-500',
    hex: '#f97316',
    label: '离线缺失'
  },
  [RecordStatus.PROCESSING]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-500',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
    label: '处理中'
  }
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  [ExceptionType.SCALE_ERROR]: '比例尺错用',
  [ExceptionType.TRAJECTORY_ANOMALY]: '轨迹异常',
  [ExceptionType.DEVICE_LIST_ERROR]: '设备清单错误',
  [ExceptionType.OFFLINE_MISSING]: '离线素材缺失',
  [ExceptionType.DUPLICATE_IMPORT]: '重复导入',
  [ExceptionType.OTHER]: '其他异常'
};

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  [RecordType.TRAJECTORY]: '轨迹记录',
  [RecordType.DEVICE_LIST]: '设备清单',
  [RecordType.SCALE_ERROR]: '比例尺标注'
};

export const PROCESSING_ACTION_LABELS: Record<string, string> = {
  confirm: '确认通过',
  modify: '修改数据',
  reject: '驳回重提',
  supplement: '补充素材',
  review: '复核'
};

export function getStatusColor(status: RecordStatus): StatusColor {
  return STATUS_COLORS[status] || STATUS_COLORS[RecordStatus.PENDING];
}

export function getStatusHex(status: RecordStatus): string {
  return getStatusColor(status).hex;
}

export function getStatusLabel(status: RecordStatus): string {
  return getStatusColor(status).label;
}

export function getExceptionTypeLabel(type: ExceptionType): string {
  return EXCEPTION_TYPE_LABELS[type] || '未知异常';
}

export function getRecordTypeLabel(type: RecordType): string {
  return RECORD_TYPE_LABELS[type] || '未知类型';
}

export function getProcessingActionLabel(action: string): string {
  return PROCESSING_ACTION_LABELS[action] || action;
}
