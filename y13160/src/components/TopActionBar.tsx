import { useMainStore } from '@/store/useMainStore';
import { Play, RotateCw, Image as ImageIcon, Waves, AlertTriangle, X } from 'lucide-react';
import { useMemo } from 'react';
import { scanGaps } from '@/engine/gapDetector';

export default function TopActionBar() {
  const { loadSample, rerun, toggleAnnotation, photos, chainA, chainB, paramGroups, gapGroupId } =
    useMainStore();

  const hasSamples = photos.length > 0;

  const allGaps = useMemo(() => {
    return [
      ...scanGaps(chainA, paramGroups[0]),
      ...scanGaps(chainB, paramGroups[1]),
    ];
  }, [chainA, chainB, paramGroups]);

  return (
    <div className="relative z-30">
      {/* 缺口告警横幅 */}
      {hasSamples && allGaps.length > 0 && (
        <div className="glass-card !rounded-b-none border-b-0 border-neon-amber/50 bg-gradient-to-r from-neon-amber/10 via-neon-amber/5 to-transparent animate-slide-down flex items-stretch">
          <div className="flex items-center gap-2 px-4 py-2.5 border-r border-neon-amber/30 bg-neon-amber/10">
            <AlertTriangle className="w-4 h-4 text-neon-amber animate-pulse" />
            <span className="text-sm font-semibold text-neon-amber whitespace-nowrap">
              采样缺口告警
            </span>
          </div>
          <div className="flex-1 px-4 py-2.5 flex items-center gap-3 overflow-x-auto text-sm">
            {allGaps.slice(0, 3).map((g, i) => (
              <div
                key={i}
                className="shrink-0 rounded-lg px-3 py-1.5 bg-abyss-900/70 border border-neon-amber/25 text-slate-200"
              >
                <span className="text-[11px] text-neon-amber mr-2">
                  [{g.type}]
                </span>
                <span className="truncate inline-block max-w-[260px] align-middle">
                  {g.description}
                </span>
              </div>
            ))}
            {allGaps.length > 3 && (
              <span className="text-xs text-slate-400 shrink-0">
                +{allGaps.length - 3} 个更多告警（查看左侧历史栈撤回）
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400 shrink-0">
              缺口注入组：<span className="text-neon-amber font-mono">{gapGroupId ?? '无'}</span>
            </span>
          </div>
        </div>
      )}

      {/* 三件事快捷栏 */}
      <div
        className={`glass-card ${
          hasSamples && allGaps.length > 0 ? '!rounded-t-none' : ''
        } px-5 py-3.5 flex items-center justify-between flex-wrap gap-3`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan via-neon-cyan/50 to-neon-magenta/60 flex items-center justify-center shadow-neon-cyan">
              <Waves className="w-6 h-6 text-abyss-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-neon-cyan via-slate-100 to-neon-magenta bg-clip-text text-transparent">
                海浪浮标实验复算 · 训练台
              </h1>
              <div className="text-[11px] text-slate-500 mt-0.5">
                面向训练教练老唐 · 单位混写/数量级变化透明化 · 负责人A/B参数对照
              </div>
            </div>
          </div>
        </div>

        {/* 三件事 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadSample}
            className="neon-btn neon-btn-primary text-sm"
          >
            <Play className="w-4 h-4" />
            <span>
              <span className="font-bold">①</span> 放样例
            </span>
          </button>
          <button
            onClick={rerun}
            disabled={!hasSamples}
            className="neon-btn neon-btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCw className="w-4 h-4" />
            <span>
              <span className="font-bold">②</span> 重跑复算
            </span>
          </button>
          <button
            onClick={() => toggleAnnotation()}
            disabled={!hasSamples}
            className="neon-btn neon-btn-amber text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4" />
            <span>
              <span className="font-bold">③</span> 查看截图说明
            </span>
            {hasSamples && (
              <span className="ml-1 !bg-abyss-900/70 px-1.5 py-0.5 rounded text-[10px] text-neon-amber border border-neon-amber/30 tabular-nums">
                {photos.reduce((acc, p) => acc + p.annotations.length, 0)}条
              </span>
            )}
          </button>
          {hasSamples && (
            <button
              onClick={() => useMainStore.getState().reset()}
              className="p-2 rounded-xl border border-slate-500/25 text-slate-400 hover:text-slate-200 hover:border-slate-400/50 transition"
              title="清空重置"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
