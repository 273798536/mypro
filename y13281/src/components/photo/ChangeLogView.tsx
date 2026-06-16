import { CheckCircle, Clock, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChangeLogViewProps {
  changes: string[];
  recordedAt?: string;
  recordedBy?: string;
}

export function ChangeLogView({ changes, recordedAt, recordedBy }: ChangeLogViewProps) {
  if (!changes || changes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center">
        <p className="text-sm text-slate-400">暂无变更记录</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 overflow-hidden">
      <div className="relative">
        <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/40 via-slate-600 to-slate-700" />

        <div className="p-4 space-y-3">
          {changes.map((change, index) => (
            <div key={`${change}-${index}`} className="relative pl-10">
              <div className="absolute left-2 top-1">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg border px-3 py-2.5 transition-all',
                  'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                )}
              >
                <p className="text-sm text-slate-200 leading-relaxed">{change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(recordedAt || recordedBy) && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/30">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {recordedBy && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  记录人：<span className="text-slate-300 font-medium">{recordedBy}</span>
                </span>
              </div>
            )}
            {recordedAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  记录时间：<span className="text-slate-300 font-medium">{recordedAt}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
