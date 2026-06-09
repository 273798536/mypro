import { useSceneStore } from '@/stores/useSceneStore';
import { useReviewStore } from '@/stores/useReviewStore';
import {
  Anchor,
  Droplets,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Maximize2,
  Waves,
} from 'lucide-react';

export function Toolbar() {
  const waterLevel = useSceneStore((s) => s.waterLevel);
  const animateWaterLevel = useSceneStore((s) => s.animateWaterLevel);
  const setWaterLevel = useSceneStore((s) => s.setWaterLevel);
  const waterLevelAnimating = useSceneStore((s) => s.waterLevelAnimating);
  const anomalies = useSceneStore((s) => s.anomalies);
  const records = useReviewStore((s) => s.records);

  const dangerCount = anomalies.filter((a) => a.severity === 'danger').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;
  const reviewDone = Object.values(records).filter((r) => r.completed).length;

  const handleUpstream = () => animateWaterLevel(waterLevel.upstreamLevel, 3000);
  const handleDownstream = () => animateWaterLevel(waterLevel.downstreamLevel, 3000);
  const handleReset = () => animateWaterLevel(22.5, 1500);

  const progress = (waterLevel.currentLevel - waterLevel.minLevel) / (waterLevel.maxLevel - waterLevel.minLevel) * 100;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-cyan-500/20 bg-slate-950/95 px-4 py-2.5 backdrop-blur-xl">
      {/* Logo和标题 */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
          <Waves size={18} className="text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
            3D
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 leading-tight">
            船闸水位三维演示
          </h1>
          <p className="text-[10px] text-slate-500">
            仿真数据 · 设备坐标 · 异常结论 · 联动展示
          </p>
        </div>
      </div>

      {/* 水位快速控制 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-1.5">
          <Droplets size={14} className="text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 leading-tight">当前水位</span>
            <span className="font-mono text-sm font-bold text-cyan-300 leading-tight">
              {waterLevel.currentLevel.toFixed(1)}
              <span className="ml-0.5 text-[10px] text-slate-500">m</span>
            </span>
          </div>

          <div className="mx-2 h-8 w-px bg-slate-700" />

          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">{waterLevel.minLevel}m</span>
              <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-amber-400"
                  style={{ left: `${((waterLevel.targetLevel - waterLevel.minLevel) / (waterLevel.maxLevel - waterLevel.minLevel)) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500">{waterLevel.maxLevel}m</span>
            </div>
            <span className="text-[9px] text-amber-400">— 目标 {waterLevel.targetLevel}m</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleUpstream}
            disabled={waterLevelAnimating}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-50"
            title="充水到上游水位"
          >
            <Play size={11} />
            充水
          </button>
          <button
            onClick={handleDownstream}
            disabled={waterLevelAnimating}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-50"
            title="泄水到下游水位"
          >
            <Pause size={11} />
            泄水
          </button>
          <button
            onClick={handleReset}
            disabled={waterLevelAnimating}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-50"
            title="重置水位"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* 状态指示 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          <span className="font-bold text-rose-300">{dangerCount}</span>
          <span className="text-rose-400/80">危险</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="font-bold text-amber-300">{warningCount}</span>
          <span className="text-amber-400/80">警告</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-bold text-emerald-300">{reviewDone}/3</span>
          <span className="text-emerald-400/80">复核</span>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-700" />

        <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" title="设置">
          <Settings size={15} />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" title="全屏">
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}
