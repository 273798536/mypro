import { cn } from '@/lib/utils';
import { actionLabel } from '@/utils/format';
import type { HistoryLog } from '@/types';

interface TimelineProps {
  logs: HistoryLog[];
  compact?: boolean;
}

const actionColors: Record<string, string> = {
  created: 'bg-blue-500',
  status_changed: 'bg-amber-500',
  fixed: 'bg-emerald-500',
  concluded: 'bg-purple-500',
  snapshot_added: 'bg-indigo-500',
  permission_added: 'bg-teal-500',
  duplicate_detected: 'bg-orange-500',
  merged: 'bg-pink-500',
};

export default function Timeline({ logs, compact = false }: TimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        暂无操作记录
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700" />
      <ul className={cn('space-y-4', compact && 'space-y-3')}>
        {logs.map((log) => (
          <li key={log.id} className="relative pl-8">
            <div
              className={cn(
                'absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900',
                actionColors[log.action] || 'bg-slate-500'
              )}
            />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">
                    {actionLabel(log.action)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {log.operator}
                  </span>
                </div>
                {!compact && (
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                    {log.detail}
                  </p>
                )}
              </div>
              <span className={cn(
                'text-xs text-slate-500 shrink-0',
                compact && 'hidden sm:inline'
              )}>
                {new Date(log.operatedAt).toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
