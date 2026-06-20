import { User, Clock, StickyNote, ArrowRight } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function OverrideRecord() {
  const { currentSnapshot } = useGatekeeperStore();
  const overrides = currentSnapshot?.overrides ?? [];

  if (overrides.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <StickyNote className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 text-[13px] text-slate-500">当前快照暂无人工改判记录</p>
        <p className="mt-1 text-[11px] text-slate-600">
          改判记录将保留在历史中，便于下一班同事追溯
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {overrides.map((o) => (
        <div
          key={o.id}
          className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">改判对象</p>
              <p className="mt-0.5 font-mono text-[12px] text-white">{o.metricName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-medium',
                  o.oldPassed
                    ? 'bg-emerald-500/20 text-emerald-400 line-through'
                    : 'bg-rose-500/20 text-rose-400 line-through'
                )}
              >
                {o.oldValue}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              <span
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-medium',
                  o.newPassed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                )}
              >
                {o.newValue}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">改判理由</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-200">{o.reason}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {o.operator}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {o.createdAt}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
