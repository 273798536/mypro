import { useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { FlaskConical, Plus, Loader2 } from 'lucide-react';

const PARAM_OPTIONS = [
  { key: 'deductible', label: '免赔额', delta: 5000 },
  { key: 'limit', label: '限额', delta: 100000 },
  { key: 'expenseRatio', label: '费用率', delta: 0.05 },
  { key: 'safetyLoading', label: '安全加载', delta: 0.05 },
];

export default function SensitivityPanel() {
  const { result, sensitivityResults, runSensitivity, isRunning } = useSimulationStore();
  const [selectedParam, setSelectedParam] = useState('deductible');

  if (!result) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        请先运行模拟，然后进行参数敏感度分析
      </div>
    );
  }

  const handleRun = () => {
    const opt = PARAM_OPTIONS.find(p => p.key === selectedParam);
    if (opt) runSensitivity(opt.key, opt.delta);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-accent" />
        参数敏感度
      </h2>

      <div className="flex items-center gap-3">
        <select
          value={selectedParam}
          onChange={(e) => setSelectedParam(e.target.value)}
          className="bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-accent/40"
        >
          {PARAM_OPTIONS.map(p => (
            <option key={p.key} value={p.key}>{p.label} (±{p.key === 'deductible' || p.key === 'limit' ? (p.delta / 10000).toFixed(0) + '万' : (p.delta * 100).toFixed(0) + '%'})</option>
          ))}
        </select>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          运行对比
        </button>
      </div>

      {sensitivityResults.length > 0 && (
        <div className="space-y-3">
          {sensitivityResults.map((sr, i) => (
            <div key={i} className="bg-surface-50 rounded-lg p-4 border border-surface-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-300">
                  {sr.paramName}
                  <span className="text-xs text-gray-500 ml-2">Δ = {sr.paramDelta.toLocaleString()}</span>
                </div>
                <div className={`text-sm font-mono font-semibold ${
                  sr.premiumDeltaPct > 0 ? 'text-danger' : 'text-accent'
                }`}>
                  {sr.premiumDeltaPct > 0 ? '+' : ''}{(sr.premiumDeltaPct * 100).toFixed(2)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="text-gray-500 uppercase tracking-wider text-[10px]">原始</div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">纯保费</span>
                    <span className="font-mono text-white">{sr.originalResult.purePremium.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">毛保费</span>
                    <span className="font-mono text-white">{sr.originalResult.grossPremium.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">VaR 99%</span>
                    <span className="font-mono text-white">{sr.originalResult.var99.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-gray-500 uppercase tracking-wider text-[10px]">调整后</div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">纯保费</span>
                    <span className={`font-mono ${sr.newResult.purePremium > sr.originalResult.purePremium ? 'text-danger' : 'text-accent'}`}>
                      {sr.newResult.purePremium.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">毛保费</span>
                    <span className={`font-mono ${sr.newResult.grossPremium > sr.originalResult.grossPremium ? 'text-danger' : 'text-accent'}`}>
                      {sr.newResult.grossPremium.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">VaR 99%</span>
                    <span className={`font-mono ${sr.newResult.var99 > sr.originalResult.var99 ? 'text-danger' : 'text-accent'}`}>
                      {sr.newResult.var99.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
