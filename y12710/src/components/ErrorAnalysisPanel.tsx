import type { Draft } from '@/types';
import { ActionBadge } from './AvailabilityBadge';
import { AlertCircle, FileSearch, ArrowRight } from 'lucide-react';

export function ErrorAnalysisPanel({ draft }: { draft: Draft }) {
  const errors = draft.errorItems;
  const fillCount = errors.filter((e) => e.action === 'fill_material').length;
  const adjustCount = errors.filter((e) => e.action === 'adjust_caliber').length;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
            <AlertCircle size={14} />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-slate-800">误差分析</h3>
            <p className="text-[11px] text-slate-500">结论逐条回链到来源材料</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
            📎 补材料 {fillCount}
          </span>
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
            ⚙️ 改口径 {adjustCount}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {errors.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <AlertCircle size={28} className="mb-2 opacity-40" />
            <p className="text-sm">暂无误差项</p>
            <p className="text-[11px]">执行计算后将自动生成分析</p>
          </div>
        )}
        {errors.map((err, idx) => (
          <div
            key={err.id}
            className={`rounded-lg border p-3 transition hover:shadow-sm ${
              err.action === 'fill_material'
                ? 'border-sky-200 bg-sky-50/50 hover:border-sky-300'
                : 'border-violet-200 bg-violet-50/50 hover:border-violet-300'
            }`}
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] text-slate-500">
                ERR-{String(idx + 1).padStart(3, '0')}
              </span>
              <ActionBadge action={err.action} />
            </div>
            <p className="text-xs leading-relaxed text-slate-700">{err.description}</p>
            <div className="mt-2 flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200">
              <FileSearch size={10} className="shrink-0" />
              <span className="truncate">来源：{err.sourceRef}</span>
              <ArrowRight size={10} className="ml-auto shrink-0 text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
