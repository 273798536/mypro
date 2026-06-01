import { AlertTriangle } from 'lucide-react';
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

export function AngleViolation() {
  const { riskPoints } = useAppStore();
  const angleRisks = riskPoints.filter((r) => r.type === 'angle_violation');

  return (
    <div className="bg-red-900/30 rounded-lg p-4 border border-red-800/50">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h4 className="text-red-400 font-semibold">角度越界</h4>
        <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
          {angleRisks.length} 处
        </span>
      </div>

      <p className="text-slate-400 text-xs mb-3">
        流线方向与来流方向夹角超过 150°，可能导致气流分离和阻力增加。
      </p>

      {angleRisks.length === 0 ? (
        <div className="text-green-400 text-sm py-2">
          ✓ 未检测到角度越界问题
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {angleRisks.map((risk) => (
            <div
              key={risk.id}
              className="bg-slate-800/50 rounded p-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${severityColors[risk.severity]}`} />
                <span className="text-slate-300">严重度: {severityLabels[risk.severity]}</span>
                <span className="text-red-400 font-mono ml-auto">{risk.value}°</span>
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
