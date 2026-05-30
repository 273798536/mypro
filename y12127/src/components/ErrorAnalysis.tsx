import { useEffect, useState } from 'react';
import { useExperimentStore } from '@/store/experimentStore';
import { AlertTriangle, AlertCircle, X, TrendingUp } from 'lucide-react';
import type { Warning } from '@/types';

export default function ErrorAnalysis() {
  const currentResult = useExperimentStore((s) => s.currentResult);
  const history = useExperimentStore((s) => s.history);
  const saveSnapshot = useExperimentStore((s) => s.saveSnapshot);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissedWarnings(new Set());
  }, [currentResult?.warnings]);

  if (!currentResult) {
    return (
      <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4">
        <p className="text-xs text-white/30 text-center py-4">添加采样点后开始分析</p>
      </div>
    );
  }

  const activeWarnings = currentResult.warnings.filter(
    (w) => !dismissedWarnings.has(w.type + w.message)
  );

  const dismissWarning = (key: string) => {
    setDismissedWarnings((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-3">
      {activeWarnings.length > 0 && (
        <div className="space-y-2">
          {activeWarnings.map((w, i) => (
            <WarningBar key={i} warning={w} onDismiss={() => dismissWarning(w.type + w.message)} />
          ))}
        </div>
      )}

      <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/80">误差分析</h3>
          <button
            onClick={() => saveSnapshot(`快照 ${history.length + 1}`)}
            className="text-xs px-3 py-1 bg-white/5 text-white/50 rounded hover:bg-white/10 transition-colors flex items-center gap-1"
          >
            <TrendingUp size={12} />
            保存快照
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">最大误差</div>
            <div className="text-lg font-mono text-rose-400">{currentResult.maxError.toFixed(4)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">RMSE</div>
            <div className="text-lg font-mono text-amber-400">{currentResult.rmse.toFixed(4)}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-white/40">采样点数: {currentResult.points.length}</div>
          <div className="text-[10px] text-white/40">警告数: {currentResult.warnings.length}</div>
        </div>
      </div>

      {history.length >= 2 && (
        <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-2">
          <h4 className="text-xs font-medium text-white/60">快照对比</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">标签</th>
                  <th className="text-right py-1">函数</th>
                  <th className="text-right py-1">噪声</th>
                  <th className="text-right py-1">最大误差</th>
                  <th className="text-right py-1">RMSE</th>
                </tr>
              </thead>
              <tbody>
                {history.map((snap) => (
                  <tr key={snap.id} className="border-t border-white/5 text-white/60">
                    <td className="py-1 text-white/80">{snap.label}</td>
                    <td className="text-right font-mono">{snap.functionType}</td>
                    <td className="text-right font-mono">
                      {snap.noiseConfig ? snap.noiseConfig.amplitude.toFixed(3) : '-'}
                    </td>
                    <td className="text-right font-mono text-rose-400">{snap.result.maxError.toFixed(4)}</td>
                    <td className="text-right font-mono text-amber-400">{snap.result.rmse.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningBar({ warning, onDismiss }: { warning: Warning; onDismiss: () => void }) {
  const isError = warning.severity === 'error';
  return (
    <div
      className={`rounded-lg p-3 flex gap-3 items-start animate-in slide-in-from-top-2 ${
        isError
          ? 'bg-rose-500/10 border border-rose-500/30'
          : 'bg-amber-500/10 border border-amber-500/30'
      }`}
    >
      <div className={`mt-0.5 ${isError ? 'text-rose-400' : 'text-amber-400'}`}>
        {isError ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
      </div>
      <div className="flex-1 text-xs text-white/70 leading-relaxed">{warning.message}</div>
      <button onClick={onDismiss} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}
