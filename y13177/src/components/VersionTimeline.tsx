import { History, Plus, Edit3, Zap, User } from 'lucide-react';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { cn } from '@/lib/utils';
import type { ChangeType } from '@/types';

const changeTypeConfig: Record<ChangeType, { icon: typeof Plus; color: string; bg: string; label: string }> = {
  初始: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', label: '初始' },
  补充: { icon: Plus, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', label: '补充' },
  修正: { icon: Edit3, color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30', label: '修正' },
};

export function VersionTimeline() {
  const dataset = useSpeckleStore((s) => s.dataset);
  const selectedVersionId = useSpeckleStore((s) => s.selectedVersionId);
  const selectVersion = useSpeckleStore((s) => s.selectVersion);

  if (!dataset) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-slate-800/50 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">版本时间线</h3>
        <span className="ml-auto text-xs text-slate-500">{dataset.versions.length} 条记录</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {dataset.versions
          .slice()
          .reverse()
          .map((v, idx) => {
            const cfg = changeTypeConfig[v.changeType];
            const Icon = cfg.icon;
            const isSelected = selectedVersionId === v.id;
            const isLatest = idx === 0;

            return (
              <button
                key={v.id}
                onClick={() => selectVersion(v.id)}
                className={cn(
                  'w-full text-left relative pl-8 py-3 rounded-xl transition-all duration-200',
                  isSelected
                    ? 'bg-slate-800/80 ring-1 ring-indigo-500/30'
                    : 'hover:bg-slate-800/40'
                )}
              >
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-700/60 ml-[15px]" />
                {idx === dataset.versions.length - 1 && (
                  <div className="absolute left-0 bottom-0 h-1/2 w-0.5 bg-transparent ml-[15px]" />
                )}

                <div
                  className={cn(
                    'absolute left-[3px] top-[18px] w-6 h-6 rounded-full flex items-center justify-center border z-10',
                    cfg.bg
                  )}
                >
                  <Icon className={cn('w-3 h-3', cfg.color)} />
                </div>

                {isLatest && (
                  <span className="absolute right-3 top-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    当前
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-white">{v.version}</span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                      cfg.bg,
                      cfg.color
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed pr-16">{v.description}</p>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <User className="w-3 h-3" />
                    {v.operatorName}
                  </div>
                  <span className="text-[11px] text-slate-600">{v.timestamp}</span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
