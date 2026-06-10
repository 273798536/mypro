import React from 'react';
import {
  Clock,
  PlusCircle,
  Edit3,
  RefreshCw,
  CheckCircle2,
  User,
  History,
} from 'lucide-react';
import { useReportStore } from '../store/useReportStore';
import { TrackingType } from '../types';
import { formatDateTime } from '../utils/validation';

const TYPE_CONFIG: Record<
  TrackingType,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    dotColor: string;
    lineColor: string;
    labelCls: string;
  }
> = {
  create: {
    label: '创建',
    icon: PlusCircle,
    dotColor: 'bg-brand-600',
    lineColor: 'bg-brand-200',
    labelCls: 'text-brand-700 bg-brand-50 border-brand-200',
  },
  update: {
    label: '更新',
    icon: Edit3,
    dotColor: 'bg-blue-500',
    lineColor: 'bg-blue-200',
    labelCls: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  supplement: {
    label: '补录',
    icon: RefreshCw,
    dotColor: 'bg-amber-500',
    lineColor: 'bg-amber-200',
    labelCls: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  status_change: {
    label: '状态变更',
    icon: CheckCircle2,
    dotColor: 'bg-status-pending',
    lineColor: 'bg-amber-200',
    labelCls: 'text-amber-700 bg-amber-50 border-amber-200',
  },
};

export const TrackingTimeline: React.FC = () => {
  const batches = useReportStore((s) => s.batches);
  const selectedBatchId = useReportStore((s) => s.selectedBatchId);
  const setSelectedBatchId = useReportStore((s) => s.setSelectedBatchId);

  const display =
    batches.find((b) => b.id === selectedBatchId) ||
    batches.find((b) => b.status !== 'success') ||
    batches[0];

  if (!display) {
    return (
      <div className="card-paper p-8 text-center text-gray-400">
        <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无批次追踪数据</p>
      </div>
    );
  }

  const records = [...display.tracking].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="card-paper overflow-hidden">
      <div className="p-5 border-b border-paper-200 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-brand-800 flex items-center gap-2">
            <History className="w-5 h-5" />
            批次追踪时间线
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {display.batchNo} · 共 {records.length} 条记录
          </p>
        </div>
        <select
          value={display.id}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="input-field w-auto text-xs font-mono"
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batchNo}
            </option>
          ))}
        </select>
      </div>

      <div className="p-5 max-h-[500px] overflow-y-auto">
        <div className="relative pl-4">
          <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-paper-200" />
          {records.map((r, idx) => {
            const cfg = TYPE_CONFIG[r.type];
            const Icon = cfg.icon;
            const isLast = idx === records.length - 1;
            return (
              <div key={r.id} className={`relative pb-6 ${isLast ? 'pb-0' : ''}`}>
                <div
                  className={`absolute -left-0.5 top-1 w-[18px] h-[18px] rounded-full ${cfg.dotColor} border-4 border-paper-50 shadow-soft z-10 flex items-center justify-center`}
                >
                  <Icon className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="ml-10">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.labelCls}`}>
                      <Icon className="w-3 h-3 inline mr-1" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(r.timestamp)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {r.operator}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-paper-100 border border-paper-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-serif">
                      {r.content}
                    </p>
                  </div>
                  {r.beforeData && r.afterData && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-gray-50 border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase mb-1">变更前</p>
                        <pre className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">
{JSON.stringify(
  {
    ...(r.beforeData.conditions || {}),
    selectivity: r.beforeData.selectivity,
    hasBlankControl: r.beforeData.hasBlankControl,
  },
  null,
  0,
)
  .replace(/[{}"]/g, '')
  .replace(/,/g, '\n')
  .trim()}
                        </pre>
                      </div>
                      <div className="p-2 rounded bg-brand-50 border border-brand-200">
                        <p className="text-[10px] text-brand-600 uppercase mb-1">变更后</p>
                        <pre className="text-[11px] text-brand-800 whitespace-pre-wrap leading-relaxed">
{JSON.stringify(
  {
    ...(r.afterData.conditions || {}),
    selectivity: r.afterData.selectivity,
    hasBlankControl: r.afterData.hasBlankControl,
  },
  null,
  0,
)
  .replace(/[{}"]/g, '')
  .replace(/,/g, '\n')
  .trim()}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
