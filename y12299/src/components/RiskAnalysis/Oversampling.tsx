import { Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Severity } from '../../types';

const severityColors: Record<Severity, string> = {
  low: 'bg-yellow-500',
  medium: 'bg-orange-500',
  high: 'bg-red-500',
};

const severityLabels: Record<Severity, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export function Oversampling() {
  const { riskPoints } = useAppStore();
  const denseRisks = riskPoints.filter((r) => r.type === 'oversampling');

  return (
    <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-800/50">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-5 h-5 text-yellow-400" />
        <h4 className="text-yellow-400 font-semibold">采样过密</h4>
        <span className="ml-auto bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full">
          {denseRisks.length} 处
        </span>
      </div>

      <p className="text-slate-400 text-xs mb-3">
        流线间距小于 0.3m，过密采样可能导致计算资源浪费和结果失真。
      </p>

      {denseRisks.length === 0 ? (
        <div className="text-green-400 text-sm py-2">
          ✓ 采样密度正常
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {denseRisks.map((risk) => (
            <div
              key={risk.id}
              className="bg-slate-800/50 rounded p-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${severityColors[risk.severity]}`} />
                <span className="text-slate-300">严重度: {severityLabels[risk.severity]}</span>
                <span className="text-yellow-400 font-mono ml-auto">{risk.value}m</span>
              </div>
              <div className="text-slate-500 font-mono text-[10px]">
                位置: ({risk.position.map((v) => v.toFixed(2)).join(', ')})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
