import { RefreshCw } from 'lucide-react';
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

export function ReverseFlow() {
  const { riskPoints } = useAppStore();
  const reverseRisks = riskPoints.filter((r) => r.type === 'reverse_flow');

  return (
    <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800/50">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-blue-400" />
        <h4 className="text-blue-400 font-semibold">尾流反向</h4>
        <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
          {reverseRisks.length} 处
        </span>
      </div>

      <p className="text-slate-400 text-xs mb-3">
        尾流区域出现与来流反向的流动，可能导致气动阻力增加和升力损失。
      </p>

      {reverseRisks.length === 0 ? (
        <div className="text-green-400 text-sm py-2">
          ✓ 尾流状态正常
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {reverseRisks.map((risk) => (
            <div
              key={risk.id}
              className="bg-slate-800/50 rounded p-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${severityColors[risk.severity]}`} />
                <span className="text-slate-300">严重度: {severityLabels[risk.severity]}</span>
                <span className="text-blue-400 font-mono ml-auto">{Math.round(risk.value * 100)}%</span>
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
