import { Wind, RotateCcw, Layers, Eye } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

export default function TopBar() {
  const currentModelVersion = useProjectStore((s) => s.currentModelVersion);
  const triggerModelChange = useProjectStore((s) => s.triggerModelChange);
  const resetAll = useProjectStore((s) => s.resetAll);
  const params = useProjectStore((s) => s.params);
  const wakeResults = useProjectStore((s) => s.wakeResults);
  const avgLoss = wakeResults.length
    ? (wakeResults.reduce((s, r) => s + r.wakeLossPercent, 0) / wakeResults.length).toFixed(2)
    : '0.00';
  const oobCount = wakeResults.filter((r) => r.isOutOfBounds).length;

  return (
    <div className="h-12 bg-gradient-to-r from-deep-sea via-ocean-slate to-deep-sea border-b border-wake-teal/20 flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-wake-teal to-ocean-slate flex items-center justify-center border border-wake-teal/40">
          <Wind size={16} className="text-sea-mist" />
        </div>
        <div>
          <div className="font-engineering text-sm text-sea-mist font-bold leading-tight">
            海上风机尾流沙盘
          </div>
          <div className="text-[10px] text-sea-mist/50 font-engineering leading-tight">
            OFFSHORE WIND WAKE SIMULATION SANDBOX
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-wake-teal/20" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-sea-mist/50">当前模型:</span>
          <span
            className={`font-engineering font-semibold px-1.5 py-0.5 rounded ${
              currentModelVersion === 'old'
                ? 'text-wake-teal bg-wake-teal/15 border border-wake-teal/30'
                : 'text-alert-orange bg-alert-orange/15 border border-alert-orange/30'
            }`}
          >
            {currentModelVersion === 'old' ? '旧模型 V1.0' : '新模型 V1.1'}
          </span>
          <button
            onClick={triggerModelChange}
            className="btn-secondary !py-0.5 !px-2 text-[10px] flex items-center gap-1"
          >
            <Layers size={10} />
            切换
          </button>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-sea-mist/50">风速:</span>
          <span className="font-engineering text-sea-mist">
            {params.windSpeed} {params.windSpeedUnit === 'm/s' ? 'm/s' : '节'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sea-mist/50">风向:</span>
          <span className="font-engineering text-sea-mist">{params.windDirection}°</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sea-mist/50">平均尾流:</span>
          <span
            className={`font-engineering font-semibold ${
              parseFloat(avgLoss) > 10 ? 'text-alert-orange' : 'text-wake-teal'
            }`}
          >
            {avgLoss}%
          </span>
        </div>
        {oobCount > 0 && (
          <div className="flex items-center gap-1 text-alert-orange animate-pulse-slow">
            <Eye size={12} />
            <span className="font-engineering font-semibold">{oobCount} 台越界</span>
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-wake-teal/20" />

      <button
        onClick={resetAll}
        className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1.5"
      >
        <RotateCcw size={12} />
        重置
      </button>
    </div>
  );
}
