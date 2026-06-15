import { History, ArrowRight } from 'lucide-react';
import { HistoryLog } from '../utils/types';
import { STATUS_LABELS } from '../utils/constants';
import { cn } from '../lib/utils';

interface HistoryLogListProps {
  logs: HistoryLog[];
  className?: string;
}

export function HistoryLogList({ logs, className }: HistoryLogListProps) {
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-slate-500" />
        <h4 className="font-semibold text-slate-700">操作历史</h4>
        <span className="text-xs text-slate-400">({logs.length}条记录)</span>
      </div>

      <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
        {sortedLogs.map((log, index) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
              <div className={cn(
                'w-2 h-2 rounded-full',
                index === 0 ? 'bg-blue-500' : 'bg-slate-300'
              )} />
            </div>
            
            <div className={cn(
              'bg-slate-50 rounded-lg p-4 transition-all',
              index === 0 && 'ring-1 ring-blue-200 bg-blue-50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700">{log.action}</span>
                <span className="text-xs text-slate-400">{log.timestamp}</span>
              </div>
              
              {log.beforeStatus && log.afterStatus && (
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs">
                    {STATUS_LABELS[log.beforeStatus]}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                    {STATUS_LABELS[log.afterStatus]}
                  </span>
                </div>
              )}
              
              {log.reason && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-500">原因：</span>{log.reason}
                </p>
              )}
              
              {log.nextStep && (
                <p className="text-sm text-slate-600 mt-1">
                  <span className="text-slate-500">下一步：</span>{log.nextStep}
                </p>
              )}
              
              <p className="text-xs text-slate-400 mt-2">
                操作人：{log.operator}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
