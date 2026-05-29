import { useStore } from '@/store/useStore';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function AnomalyBar() {
  const anomalies = useStore((s) => s.anomalies);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (anomalies.length === 0) return null;

  const criticals = anomalies.filter((a) => a.severity === 'critical');
  const warnings = anomalies.filter((a) => a.severity === 'warning');

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[500px] max-w-[calc(100%-200px)]">
      {criticals.length > 0 && (
        <div className="mt-2 mx-2 rounded-lg overflow-hidden border border-red-500/50
          bg-red-950/80 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,0,0.15)]">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/50">
            <AlertTriangle size={14} className="text-red-400 animate-pulse" />
            <span className="text-xs font-bold text-red-200">
              严重异常 ×{criticals.length}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {criticals.map((anomaly, idx) => (
              <div key={idx} className="px-3 py-2 border-t border-red-800/30">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded((prev) => ({ ...prev, [`c_${idx}`]: !prev[`c_${idx}`] }))}
                >
                  <span className="text-xs text-red-300 font-mono">
                    {anomaly.type === 'overlap' ? '⊕ 同点重叠' : '💥 场强爆炸'}：{anomaly.message}
                  </span>
                  {expanded[`c_${idx}`] ? <ChevronUp size={12} className="text-red-400" /> : <ChevronDown size={12} className="text-red-400" />}
                </div>
                {expanded[`c_${idx}`] && (
                  <div className="mt-1 text-[10px] text-red-300/80 font-mono leading-relaxed bg-red-950/50 p-2 rounded">
                    原因：{anomaly.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-1 mx-2 rounded-lg overflow-hidden border border-orange-500/40
          bg-orange-950/70 backdrop-blur-md shadow-[0_0_15px_rgba(255,136,0,0.1)]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/40">
            <AlertTriangle size={12} className="text-orange-400" />
            <span className="text-[11px] font-bold text-orange-200">
              警告 ×{warnings.length}
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {warnings.map((anomaly, idx) => (
              <div key={idx} className="px-3 py-1.5 border-t border-orange-800/20">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded((prev) => ({ ...prev, [`w_${idx}`]: !prev[`w_${idx}`] }))}
                >
                  <span className="text-[11px] text-orange-300 font-mono">
                    ↗ 方向反转：{anomaly.message}
                  </span>
                  {expanded[`w_${idx}`] ? <ChevronUp size={11} className="text-orange-400" /> : <ChevronDown size={11} className="text-orange-400" />}
                </div>
                {expanded[`w_${idx}`] && (
                  <div className="mt-1 text-[10px] text-orange-300/80 font-mono leading-relaxed bg-orange-950/50 p-1.5 rounded">
                    原因：{anomaly.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
