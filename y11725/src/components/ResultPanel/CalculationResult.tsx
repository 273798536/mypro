import { useThermoStore, useCycleResult } from '../../hooks/useThermoStore';
import { PROCESS_LABELS, PROCESS_COLORS } from '../../types';
import { AlertCircle, CheckCircle2, Zap, ThermometerSun, Activity } from 'lucide-react';

export default function CalculationResult() {
  const { processes, statePoints, selectedProcessId, setSelectedProcess, anomalies } = useThermoStore();
  const cycleResult = useCycleResult();

  const getPointLabel = (id: string) => statePoints.find(p => p.id === id)?.label || '?';

  const processAnomalies = anomalies.filter(a => a.sourceRef.type === 'process');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">计算结果</h3>

      {cycleResult && processes.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          cycleResult.isClosed
            ? 'bg-emerald-900/20 border-emerald-500/30'
            : 'bg-amber-900/20 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {cycleResult.isClosed ? (
              <CheckCircle2 className="text-emerald-400" size={18} />
            ) : (
              <AlertCircle className="text-amber-400" size={18} />
            )}
            <span className="font-medium text-slate-200">
              {cycleResult.isClosed ? '循环已闭合' : '循环未闭合'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-slate-400">净功:</span>
              <span className="font-mono text-slate-200">{cycleResult.netWork.toFixed(1)} J</span>
            </div>
            <div className="flex items-center gap-2">
              <ThermometerSun size={14} className="text-orange-400" />
              <span className="text-slate-400">净热量:</span>
              <span className="font-mono text-slate-200">{cycleResult.netHeat.toFixed(1)} J</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" />
              <span className="text-slate-400">效率:</span>
              <span className="font-mono text-slate-200">
                {cycleResult.isClosed ? `${cycleResult.efficiency.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs">吸热/放热:</span>
              <div className="font-mono text-xs">
                <span className="text-green-400">+{cycleResult.heatIn.toFixed(0)}</span>
                {' / '}
                <span className="text-red-400">-{cycleResult.heatOut.toFixed(0)}</span>
              </div>
            </div>
          </div>
          {!cycleResult.isClosed && (
            <p className="text-xs text-amber-300 mt-2">
              提示：请确保最后一个过程的终点与第一个过程的起点状态一致
            </p>
          )}
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {processes.map((process, index) => {
          const fromLabel = getPointLabel(process.from);
          const toLabel = getPointLabel(process.to);
          const isSelected = process.id === selectedProcessId;
          const hasAnomaly = processAnomalies.some(a => a.sourceRef.id === process.id);

          return (
            <div
              key={process.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-900/30 border-blue-500/50'
                  : hasAnomaly
                    ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              }`}
              onClick={() => setSelectedProcess(process.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PROCESS_COLORS[process.type] }}
                  />
                  <span className="font-mono text-slate-200 text-sm">
                    {index + 1}. {fromLabel} → {toLabel}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{PROCESS_LABELS[process.type]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">W: </span>
                  <span className={process.W > 0 ? 'text-green-400' : process.W < 0 ? 'text-red-400' : 'text-slate-300'}>
                    {process.W.toFixed(1)} J
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Q: </span>
                  <span className={process.Q > 0 ? 'text-orange-400' : process.Q < 0 ? 'text-blue-400' : 'text-slate-300'}>
                    {process.Q.toFixed(1)} J
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">ΔU: </span>
                  <span className="text-slate-300">{process.deltaU.toFixed(1)} J</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-mono">
                验证: ΔU - Q - W = {(process.deltaU - process.Q - process.W).toExponential(1)} J
                {Math.abs(process.deltaU - process.Q - process.W) < 0.01 && (
                  <span className="text-green-400 ml-2">✓ 守恒</span>
                )}
                {Math.abs(process.deltaU - process.Q - process.W) >= 0.01 && (
                  <span className="text-red-400 ml-2">⚠ 不守恒</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {processes.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/50 rounded-lg">
          <p>暂无过程数据</p>
          <p className="text-xs mt-1">创建状态点和过程后显示计算结果</p>
        </div>
      )}
    </div>
  );
}
