import type { RecordStatus, DataQuality } from '@/types';

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNumber(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return '—';
  return Number(n).toFixed(digits);
}

export function formatNumberInt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as number)) return '—';
  return Math.round(Number(n)).toLocaleString('zh-CN');
}

export function statusLabel(status: RecordStatus): string {
  return {
    ready: '可直接使用',
    needs_review: '需安全员复核',
    invalid: '无效/坏数据',
  }[status];
}

export function statusBadgeClass(status: RecordStatus): string {
  return {
    ready: 'badge-success',
    needs_review: 'badge-warning',
    invalid: 'badge-danger',
  }[status];
}

export function dataQualityLabel(q: DataQuality): string {
  return {
    normal: '正常',
    null: '空值',
    duplicate: '重复',
    note_inline: '备注混写',
    outlier: '异常值',
  }[q];
}

export function dataQualityClass(q: DataQuality): string {
  return {
    normal: '',
    null: 'bg-warning-50 text-warning-700',
    duplicate: 'bg-danger-50 text-danger-700',
    note_inline: 'bg-zinc-100 text-zinc-600 italic',
    outlier: 'bg-danger-50 text-danger-700',
  }[q];
}

export function actionTypeLabel(t: string): string {
  return {
    create: '创建记录',
    edit: '编辑字段',
    update_status: '更新状态',
    import: '导入数据',
    recalculate: '重新计算',
    export: '导出报告',
  }[t] || t;
}
