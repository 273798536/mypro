import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useFitStore } from '../hooks/useFitStore';

export default function DiagnosisPanel() {
  const { diagnosis, fitResult } = useFitStore();
  const [copied, setCopied] = useState(false);

  if (!diagnosis) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
        执行拟合后显示诊断结果
      </div>
    );
  }

  const StatusIcon = diagnosis.status === 'pass'
    ? ShieldCheck
    : diagnosis.status === 'warning'
    ? ShieldAlert
    : ShieldX;

  const statusColor = diagnosis.status === 'pass'
    ? 'text-emerald-400'
    : diagnosis.status === 'warning'
    ? 'text-amber-400'
    : 'text-red-400';

  const statusBg = diagnosis.status === 'pass'
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : diagnosis.status === 'warning'
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-red-500/10 border-red-500/30';

  const copySummary = () => {
    navigator.clipboard.writeText(diagnosis.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border ${statusBg}`}>
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-8 h-8 ${statusColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-400">
                初值发散拦截状态
              </span>
            </div>
            {diagnosis.divergenceDetected ? (
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  发散已被拦截
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  正常收敛，未检测到发散
                </span>
              </div>
            )}
            {diagnosis.divergenceDetected && (
              <p className="text-xs text-red-300/80 leading-relaxed">
                {diagnosis.divergenceReason}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-lg border ${statusBg}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm text-zinc-200 leading-relaxed">
              {diagnosis.summary}
            </p>
          </div>
          <button
            onClick={copySummary}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="复制摘要"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {diagnosis.outlierWarning && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              {diagnosis.outlierWarning}
            </p>
          </div>
        </div>
      )}

      {diagnosis.unitAnomaly && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300 leading-relaxed">
              {diagnosis.unitAnomaly}
            </p>
          </div>
        </div>
      )}

      {diagnosis.outliers.filter((o) => o.isOutlier).length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2">离群点列表</h4>
          <div className="overflow-auto max-h-48 rounded-lg border border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-800/80">
                  <th className="px-2 py-1.5 text-left text-zinc-400 font-medium">行号</th>
                  <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">X</th>
                  <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">Y</th>
                  <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">残差</th>
                </tr>
              </thead>
              <tbody>
                {diagnosis.outliers
                  .filter((o) => o.isOutlier)
                  .map((o) => (
                    <tr
                      key={o.rowIndex}
                      className="border-t border-zinc-800/50 bg-red-500/5"
                    >
                      <td className="px-2 py-1.5 text-red-400 font-mono">
                        {o.rowIndex}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-300 font-mono">
                        {o.x.toPrecision(5)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-300 font-mono">
                        {o.y.toPrecision(5)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-red-400 font-mono">
                        {o.residual.toPrecision(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fitResult && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2">拟合指标</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-zinc-800/50">
              <div className="text-[10px] text-zinc-500">R²</div>
              <div className="text-sm font-mono text-zinc-200">
                {fitResult.rSquared.toFixed(6)}
              </div>
            </div>
            <div className="p-2 rounded-md bg-zinc-800/50">
              <div className="text-[10px] text-zinc-500">调整R²</div>
              <div className="text-sm font-mono text-zinc-200">
                {fitResult.adjustedRSquared.toFixed(6)}
              </div>
            </div>
            <div className="p-2 rounded-md bg-zinc-800/50">
              <div className="text-[10px] text-zinc-500">RMSE</div>
              <div className="text-sm font-mono text-zinc-200">
                {fitResult.rmse.toPrecision(4)}
              </div>
            </div>
            <div className="p-2 rounded-md bg-zinc-800/50">
              <div className="text-[10px] text-zinc-500">迭代次数</div>
              <div className="text-sm font-mono text-zinc-200">
                {fitResult.iterations}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
