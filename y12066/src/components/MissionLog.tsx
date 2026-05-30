import { useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AlertTriangle, CheckCircle, XCircle, Clock, Fuel } from 'lucide-react';

const RESULT_CONFIG: Record<string, { border: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: { border: 'border-l-green-500', icon: CheckCircle, iconColor: 'text-green-400' },
  window_missed: { border: 'border-l-yellow-500', icon: Clock, iconColor: 'text-yellow-400' },
  fuel_insufficient: { border: 'border-l-red-500', icon: XCircle, iconColor: 'text-red-400' },
  orbit_intersect: { border: 'border-l-red-500', icon: AlertTriangle, iconColor: 'text-red-400' },
};

export default function MissionLog() {
  const steps = useGameStore(s => s.steps);
  const anomalies = useGameStore(s => s.anomalies);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [steps.length]);

  return (
    <div className="bg-space-900/80 backdrop-blur-md rounded-xl p-4 flex flex-col gap-3 border border-white/5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-white/90 tracking-wide">任务日志</h3>
        <span className="text-[10px] text-white/40 font-display">{steps.length} 步</span>
      </div>

      <div
        ref={containerRef}
        className="flex flex-col gap-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
      >
        {steps.length === 0 && (
          <div className="text-xs text-white/30 text-center py-6">暂无任务记录</div>
        )}

        {steps.map((step) => {
          const config = RESULT_CONFIG[step.resultType] || RESULT_CONFIG.success;
          const Icon = config.icon;
          const isAnomaly = anomalies.some(a => a.stepIndex === step.stepIndex);

          return (
            <div
              key={step.stepIndex}
              className={`border-l-2 ${config.border} bg-white/[0.03] rounded-r px-3 py-2 hover:bg-white/[0.06] transition-colors ${isAnomaly ? 'bg-red-500/10' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] text-white/50">
                  #{step.stepIndex + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className={config.iconColor} />
                  {step.resultType === 'window_missed' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-display">
                      窗口错过
                    </span>
                  )}
                  {isAnomaly && step.resultType !== 'window_missed' && (
                    <AlertTriangle size={10} className="text-red-400" />
                  )}
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">{step.description}</p>

              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <Fuel size={10} />
                  {step.fuelConsumed.toFixed(1)}
                </span>
                <span className={step.scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
