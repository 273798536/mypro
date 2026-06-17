import { clsx } from 'clsx';
import { Clock, User, AlertTriangle } from 'lucide-react';
import type { HistoryEntry, OperationType } from '../shared/types';

interface TimelineProps {
  entries: HistoryEntry[];
}

const statusLabelMap: Record<string, string> = {
  pending: '待处理',
  approved: '已通过',
  exception: '异常',
  need_evidence: '待补证',
  suspected_duplicate: '疑似重复',
};

const operationLabelMap: Record<OperationType, string> = {
  create: '创建',
  import: '导入',
  judgment_change: '状态改判',
  attachment_add: '补录附件',
  merge: '合并',
  exception_detected: '异常检测',
};

export default function Timeline({ entries }: TimelineProps) {
  if (!entries.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无操作记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const isException = entry.operationType === 'exception_detected' || !!entry.evidence;
        const beforeValue = entry.beforeState as string;
        const afterValue = entry.afterState as string;
        return (
          <div key={entry.id} className="relative flex gap-4 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-4 h-4 rounded-full border-2 z-10 flex-shrink-0',
                  isException
                    ? 'border-accent bg-transparent'
                    : 'border-primary bg-bg-paper',
                )}
              >
                {isException && (
                  <AlertTriangle className="w-2.5 h-2.5 text-accent m-auto mt-0.5" />
                )}
              </div>
              {index < entries.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'font-semibold text-sm',
                      isException ? 'text-accent' : 'text-primary',
                    )}
                  >
                    {operationLabelMap[entry.operationType] || entry.operationType}
                  </span>
                  {isException && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                      异常节点
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.operator}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.operatedAt}
                  </span>
                </div>
              </div>
              {entry.note && (
                <p className="text-sm text-text-dark mt-1.5">{entry.note}</p>
              )}
              {beforeValue && afterValue && (
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono">
                    {statusLabelMap[beforeValue] || beforeValue}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-primary/10 px-2 py-1 rounded border border-primary/20 text-primary font-mono">
                    {statusLabelMap[afterValue] || afterValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
