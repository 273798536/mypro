import { User, Clock, FileText, ChevronRight, Circle } from 'lucide-react';
import type { Snapshot } from '@/types';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function Timeline() {
  const { snapshotHistory, currentSnapshot, loadSnapshot } = useGatekeeperStore();
  const sorted = [...snapshotHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-blue-500 via-slate-600 to-slate-700" />
      {sorted.map((snap, idx) => {
        const isCurrent = snap.id === currentSnapshot?.id;
        return (
          <div key={snap.id} className="relative pb-8 last:pb-0">
            <div
              className={cn(
                'absolute -left-[21px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-2',
                isCurrent
                  ? 'border-blue-500 bg-slate-900 shadow-lg shadow-blue-500/30'
                  : 'border-slate-600 bg-slate-900'
              )}
            >
              <Circle
                className={cn('h-3 w-3 fill-current', isCurrent ? 'text-blue-500' : 'text-slate-600')}
              />
            </div>
            <div
              className={cn(
                'rounded-xl border p-5 transition-all duration-200 cursor-pointer',
                isCurrent
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                  : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
              )}
              onClick={() => loadSnapshot(snap)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-white">{snap.version}</h3>
                    {isCurrent && (
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        当前版本
                      </span>
                    )}
                    {idx === 1 && (
                      <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        基线版本
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-slate-400">{snap.name}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-2 text-[12px] text-slate-300">{snap.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  {snap.createdBy}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {snap.createdAt}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  {snap.samples.length} 条样本
                </span>
                {snap.overrides.length > 0 && (
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-400">
                    {snap.overrides.length} 条改判
                  </span>
                )}
                {snap.notes.length > 0 && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">
                    {snap.notes.length} 条备注
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
