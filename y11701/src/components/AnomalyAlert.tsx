import type { Anomaly } from '@/types';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  anomalies: Anomaly[];
}

function typeIcon(type: string) {
  const map: Record<string, string> = {
    arrival_spike: '到达率突增',
    long_tail: '服务时长尾',
    switch_cost: '柜台切换成本',
  };
  return map[type] || type;
}

export default function AnomalyAlert({ anomalies }: Props) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">未检测到异常，结果可靠</span>
        </div>
      </div>
    );
  }

  const critical = anomalies.filter((a) => a.severity === 'critical');
  const warnings = anomalies.filter((a) => a.severity === 'warning');

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">异常检测</h3>
        <span className="text-xs text-slate-500">({anomalies.length} 项)</span>
      </div>

      {critical.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-red-400 mb-2 font-medium">严重</div>
          {critical.map((a, i) => (
            <div key={i} className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-2">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-300">{typeIcon(a.type)}</span>
                    {a.excludedFromNormal && (
                      <span className="text-[10px] bg-red-800/50 text-red-300 px-1.5 py-0.5 rounded border border-red-700">
                      排除正常结果
                    </span>
                  )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{a.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <div className="text-xs text-amber-400 mb-2 font-medium">警告</div>
          {warnings.map((a, i) => (
            <div key={i} className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mb-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-300">{typeIcon(a.type)}</span>
                    {a.excludedFromNormal && (
                      <span className="text-[10px] bg-amber-800/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700">
                        排除正常结果
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{a.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
