import type { EmployeeStatus, VestingStatus, ExerciseStatus } from '../../shared/types';

export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusText = (status: EmployeeStatus): string => {
  const map: Record<EmployeeStatus, string> = {
    active: '在职',
    terminated: '已离职',
    pending: '待入职',
  };
  return map[status] || status;
};

export const getVestingStatusText = (status: VestingStatus): string => {
  const map: Record<VestingStatus, string> = {
    vested: '已归属',
    pending: '待归属',
    accelerated: '加速归属',
    forfeited: '已作废',
    expired: '已过期',
  };
  return map[status] || status;
};

export const getExerciseStatusText = (status: ExerciseStatus): string => {
  const map: Record<ExerciseStatus, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已驳回',
    completed: '已完成',
  };
  return map[status] || status;
};

export const getStatusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    terminated: 'bg-slate-100 text-slate-600',
    pending: 'bg-warning-100 text-warning-700',
    vested: 'bg-success-100 text-success-700',
    accelerated: 'bg-warning-100 text-warning-700',
    forfeited: 'bg-slate-100 text-slate-600',
    expired: 'bg-danger-100 text-danger-700',
    approved: 'bg-success-100 text-success-700',
    rejected: 'bg-danger-100 text-danger-700',
    completed: 'bg-primary-100 text-primary-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

export const getExceptionTypeText = (type: string): string => {
  const map: Record<string, string> = {
    acceleration: '离职加速',
    expired: '窗口过期',
    correction: '授予修正',
    forfeiture: '离职作废',
  };
  return map[type] || type;
};

export const getExceptionBadgeClass = (type: string): string => {
  const map: Record<string, string> = {
    acceleration: 'bg-warning-500 text-white',
    expired: 'bg-danger-500 text-white',
    correction: 'bg-primary-500 text-white',
    forfeiture: 'bg-slate-500 text-white',
  };
  return map[type] || 'bg-slate-500 text-white';
};
