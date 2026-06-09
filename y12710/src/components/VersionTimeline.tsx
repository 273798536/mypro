import type { Draft } from '@/types';
import { Clock, User } from 'lucide-react';

export function VersionTimeline({ draft }: { draft: Draft }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-serif text-sm font-bold text-slate-800">版本变更记录</h3>
        <p className="text-[11px] text-slate-500">评分补录、边界样例调整均留痕</p>
      </div>
      <div className="relative px-4 py-3">
        <div className="absolute left-[22px] top-6 bottom-6 w-px bg-slate-200" />
        <ol className="space-y-3">
          {[...draft.versionLogs].reverse().map((log, i) => (
            <li key={log.id} className="relative pl-9">
              <span
                className={`absolute left-3 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow ${
                  i === 0
                    ? 'bg-indigo-600 ring-2 ring-indigo-200'
                    : 'bg-slate-300'
                }`}
              />
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-700">
                  {log.version}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock size={10} />
                  {log.timestamp}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
                  <User size={10} />
                  {log.author}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-700">{log.changelog}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
