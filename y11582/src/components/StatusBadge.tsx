
import type { TaskStatus } from '../../shared/types';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: '排队中', className: 'bg-gray-100 text-gray-700' },
  processing: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
  waiting_retry: { label: '等重试', className: 'bg-amber-100 text-amber-700' },
  waiting_manual: { label: '等人工', className: 'bg-orange-100 text-orange-700' },
  permanent_failed: { label: '永久失败', className: 'bg-red-100 text-red-700' },
  success: { label: '成功', className: 'bg-green-100 text-green-700' },
  closed: { label: '已关闭', className: 'bg-slate-100 text-slate-700' },
};

const sourceTypeLabels: Record<string, string> = {
  recharge: '充值流水',
  refund: '退款申请',
  store_transfer: '门店交接表',
  supplier_statement: '供应商对账单',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export function SourceTypeBadge({ type }: { type: string }) {
  const label = sourceTypeLabels[type] || type;
  return (
    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
      {label}
    </span>
  );
}
