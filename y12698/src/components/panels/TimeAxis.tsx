import { Clock } from 'lucide-react';
import { useReviewStore } from '../../store/reviewStore';
import { useDataStore } from '../../store/dataStore';

function formatTime(t: string): string {
  return t.slice(5, 16).replace('T', ' ');
}

export default function TimeAxis() {
  const timeParams = useReviewStore((s) => s.timeParams);
  const current = useReviewStore((s) => s.currentTimeParam);
  const setCurrent = useReviewStore((s) => s.setCurrentTimeParam);
  const records = useDataStore((s) => s.records);

  const idx = timeParams.indexOf(current);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock size={12} className="text-[#00D4AA]" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400">时间参数</span>
        <span className="ml-auto font-mono text-[10px] text-slate-400">
          {idx + 1} / {timeParams.length}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-800">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-[#00D4AA] via-[#FF6B35] to-[#FFD93D]"
          style={{ width: `${((idx + 0.5) / timeParams.length) * 100}%` }}
        />
        <div className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-slate-600" style={{ left: `${((idx + 0.5) / timeParams.length) * 100}%` }} />
        <div className="flex justify-between">
          {timeParams.map((t, i) => {
            const recCount = records.filter((r) => r.timeParam === t).length;
            const hasOob = records.some((r) => r.timeParam === t && r.isOutOfBounds);
            return (
              <button
              key={t}
              onClick={() => setCurrent(t)}
              className="group relative flex h-5 w-5 -translate-y-1/2 items-center justify-center"
              style={{ left: `${(i / (timeParams.length - 1)) * 100}%` }}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  t === current
                    ? 'scale-150 bg-[#00D4AA] ring-2 ring-[#00D4AA]/40'
                    : hasOob
                    ? 'bg-rose-500'
                    : recCount > 0
                    ? 'bg-[#FF6B35]'
                    : 'bg-slate-600 group-hover:bg-slate-500'
                }`}
              />
              {recCount > 0 && (
                <span className="absolute -top-5 rounded bg-slate-800 px-1 font-mono text-[8px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                  {formatTime(t)} · {recCount}条
                </span>
              )}
            </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => idx > 0 && setCurrent(timeParams[idx - 1])}
          disabled={idx === 0}
          className="rounded border border-slate-700 bg-slate-800/40 px-2 py-1 text-[10px] text-slate-400 transition-all hover:border-slate-600 disabled:opacity-40"
        >
          ◀ 上一时刻
        </button>
        <div className="rounded border border-[#00D4AA]/30 bg-[#00D4AA]/10 px-3 py-1 font-mono text-[11px] text-[#00D4AA]">
          {formatTime(current)}
        </div>
        <button
          onClick={() => idx < timeParams.length - 1 && setCurrent(timeParams[idx + 1])}
          disabled={idx === timeParams.length - 1}
          className="rounded border border-slate-700 bg-slate-800/40 px-2 py-1 text-[10px] text-slate-400 transition-all hover:border-slate-600 disabled:opacity-40"
        >
          下一时刻 ▶
        </button>
      </div>
    </div>
  );
}
