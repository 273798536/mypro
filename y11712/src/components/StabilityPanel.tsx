import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function StabilityPanel() {
  const { stability } = useSimulationStore();

  const getStatusColor = () => {
    if (stability.errors.length > 0) return 'text-red-400 bg-red-900/20 border-red-700/50';
    if (stability.warnings.some((w) => w.severity === 'high')) return 'text-red-400 bg-red-900/20 border-red-700/50';
    if (stability.warnings.length > 0) return 'text-amber-400 bg-amber-900/20 border-amber-700/50';
    return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/50';
  };

  const getStatusIcon = () => {
    if (stability.errors.length > 0) return <AlertCircle size={16} />;
    if (stability.warnings.some((w) => w.severity === 'high')) return <AlertTriangle size={16} />;
    if (stability.warnings.length > 0) return <AlertTriangle size={16} />;
    return <CheckCircle size={16} />;
  };

  const getStatusText = () => {
    if (stability.errors.length > 0) return '参数错误';
    if (stability.warnings.some((w) => w.severity === 'high')) return '不稳定';
    if (stability.warnings.length > 0) return '有警告';
    return '稳定';
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">稳定性检查</h3>
        <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${getStatusColor()}`}>
          {getStatusIcon()}
          {getStatusText()}
        </span>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">热扩散系数 α</span>
          <span className="text-slate-200 font-mono">{stability.alpha.toExponential(3)} m²/s</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">rx (X方向)</span>
          <span className="text-slate-200 font-mono">{stability.rx.toFixed(6)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">ry (Y方向)</span>
          <span className="text-slate-200 font-mono">{stability.ry.toFixed(6)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">稳定条件 rx + ry ≤ 0.5</span>
          <span className={`font-mono ${stability.stabilityNumber > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {stability.stabilityNumber.toFixed(6)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">最大稳定时间步</span>
          <span className="text-slate-200 font-mono">{stability.maxStableTimeStep.toExponential(2)} s</span>
        </div>
      </div>

      {stability.errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={14} />
            <span>错误 ({stability.errors.length})</span>
          </div>
          {stability.errors.map((err) => (
            <div key={err.id} className="bg-red-900/20 border border-red-700/30 rounded-lg p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-300">{err.message}</p>
                  <p className="text-xs text-red-400/70 mt-1">{err.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {stability.warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle size={14} />
            <span>警告 ({stability.warnings.length})</span>
          </div>
          {stability.warnings.map((warn) => (
            <div
              key={warn.id}
              className={`rounded-lg p-2.5 border ${
                warn.severity === 'high'
                  ? 'bg-red-900/20 border-red-700/30'
                  : warn.severity === 'medium'
                  ? 'bg-amber-900/20 border-amber-700/30'
                  : 'bg-slate-800/50 border-slate-600/30'
              }`}
            >
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  warn.severity === 'high' ? 'text-red-300' : warn.severity === 'medium' ? 'text-amber-300' : 'text-slate-300'
                }`}>
                  {warn.message}
                </p>
                <p className="text-xs text-slate-400/70 mt-1">{warn.detail}</p>
                {warn.suggestedAction && (
                  <p className="text-xs text-blue-400/70 mt-1.5 flex items-center gap-1">
                    <Info size={12} />
                    {warn.suggestedAction}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
