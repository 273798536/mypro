import type { InspectionStatus, MeasurePointStatus, HistoryAction } from '@shared/types';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return Math.floor(n).toLocaleString('zh-CN');
}

const INSPECTION_STATUS_MAP: Record<InspectionStatus, string> = {
  pending: '待检查',
  checking: '检查中',
  reviewing: '待复核',
  completed: '已完成',
};

const POINT_STATUS_MAP: Record<MeasurePointStatus, string> = {
  normal: '正常',
  abnormal: '异常',
  revised: '已修正',
  confirmed: '已确认',
};

export function statusText(status: InspectionStatus | MeasurePointStatus): string {
  return (
    INSPECTION_STATUS_MAP[status as InspectionStatus] ||
    POINT_STATUS_MAP[status as MeasurePointStatus] ||
    status
  );
}

const ACTION_TEXT_MAP: Record<HistoryAction, string> = {
  param_update: '参数变更',
  point_add: '测点新增',
  point_delete: '测点删除',
  point_revise: '测点修正',
  conclusion_change: '结论变更',
  review_pass: '复核通过',
  review_reject: '复核驳回',
};

export function actionText(action: HistoryAction): string {
  return ACTION_TEXT_MAP[action] || action;
}
