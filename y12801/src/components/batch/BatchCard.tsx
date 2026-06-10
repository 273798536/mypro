import { Calendar } from 'lucide-react';
import type { Batch } from '@/types';

const statusConfig: Record<Batch['status'], { label: string; className: string }> = {
  pending: { label: '待复核', className: 'bg-slate-100 text-slate-600' },
  passed: { label: '已通过', className: 'bg-teal-50 text-teal-700' },
  anomaly: { label: '异常', className: 'bg-amber-50 text-amber-700' },
};

const actionConfig: Record<Batch['status'], { label: string; className: string }> = {
  pending: { label: '进入复核', className: 'bg-teal-600 text-white hover:bg-teal-700' },
  passed: { label: '查看详情', className: 'bg-slate-600 text-white hover:bg-slate-700' },
  anomaly: { label: '异常复核', className: 'bg-amber-600 text-white hover:bg-amber-700' },
};

interface BatchCardProps {
  batch: Batch;
  onClick: (batch: Batch) => void;
  onMergeClick?: (batch: Batch) => void;
}

export default function BatchCard({ batch, onClick, onMergeClick }: BatchCardProps) {
  const status = statusConfig[batch.status];
  const action = actionConfig[batch.status];

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-slate-800">{batch.name}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">平台:</span>
          {batch.platform}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">样本数:</span>
          {batch.sampleCount}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          {batch.createdAt}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onClick(batch)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${action.className}`}
        >
          {action.label}
        </button>
        {onMergeClick && (
          <button
            onClick={() => onMergeClick(batch)}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            数据合并
          </button>
        )}
      </div>
    </div>
  );
}
