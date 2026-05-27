import { useStore } from '../../store/useStore';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';

export default function AnomalyBanner() {
  const { anomalies, setSelectedRegion } = useStore();
  const [dismissed, setDismissed] = useState(false);

  if (anomalies.length === 0 || dismissed) return null;

  const critical = anomalies.filter(a => a.severity === 'critical');
  const warnings = anomalies.filter(a => a.severity === 'warning');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-amber-500/30">
        <div className="flex items-center gap-3 px-4 py-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-4 text-xs">
              {critical.length > 0 && (
                <span className="text-red-400 font-bold">{critical.length} 个严重异常</span>
              )}
              {warnings.length > 0 && (
                <span className="text-amber-400 font-bold">{warnings.length} 个警告</span>
              )}
            </div>
            <div className="flex gap-4 mt-1 overflow-x-auto scrollbar-hide">
              {anomalies.slice(0, 5).map((a, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedRegion(a.region)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 shrink-0 transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {a.region}
                  <ChevronRight size={10} />
                </button>
              ))}
              {anomalies.length > 5 && (
                <span className="text-xs text-slate-600 shrink-0">+{anomalies.length - 5} 更多</span>
              )}
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
