import { History, Edit3, RefreshCw, FileDown, ShieldCheck, Plus } from 'lucide-react';
import type { OperationLog } from '@/types';
import { actionTypeLabel, formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';

interface OperationLogListProps {
  logs: OperationLog[];
}

const iconMap: Record<string, typeof Edit3> = {
  create: Plus,
  edit: Edit3,
  update_status: ShieldCheck,
  import: FileDown,
  recalculate: RefreshCw,
  export: FileDown,
};

export function OperationLogList({ logs }: OperationLogListProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        <History className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
        暂无操作记录
      </div>
    );
  }

  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-lab-100" />
      <ol className="space-y-3">
        {sorted.map((log, idx) => {
          const Icon = iconMap[log.actionType] || Edit3;
          return (
            <li
              key={log.id}
              className={cn(
                'relative pl-8 opacity-0 animate-fade-in-up',
                `stagger-${Math.min(idx + 1, 6)}`,
              )}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-white border border-lab-200 flex items-center justify-center shadow-soft">
                <Icon className="w-3 h-3 text-lab-500" />
              </div>
              <div className="bg-lab-50/40 rounded-lg px-3 py-2 border border-lab-100/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-lab-800">{actionTypeLabel(log.actionType)}</span>
                    <span className="text-xs text-zinc-500">· {log.operator}</span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono tabular-nums">{formatDateTime(log.timestamp)}</span>
                </div>
                {log.fieldName && (
                  <div className="mt-1 text-xs flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-500">字段：<code className="bg-white px-1 rounded">{log.fieldName}</code></span>
                    {log.oldValue && (
                      <span className="text-danger-600 bg-danger-50 px-1.5 py-0.5 rounded line-through">
                        {log.oldValue}
                      </span>
                    )}
                    {log.oldValue && log.newValue && <span className="text-zinc-400">→</span>}
                    {log.newValue && (
                      <span className="text-success-700 bg-success-50 px-1.5 py-0.5 rounded font-medium">
                        {log.newValue}
                      </span>
                    )}
                  </div>
                )}
                {log.reason && (
                  <div className="mt-1 text-xs text-zinc-600 italic">
                    原因：{log.reason}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default OperationLogList;
