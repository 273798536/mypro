import { useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { AlertTriangle, ShieldOff, ArrowDownUp, Eye } from 'lucide-react';
import type { ExtremeClaim } from '@/types';

function SeverityBadge({ severity }: { severity: 'high' | 'critical' }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
      severity === 'critical'
        ? 'bg-danger/20 text-danger-light'
        : 'bg-warn/20 text-warn-light'
    }`}>
      {severity === 'critical' ? '严重' : '高'}
    </span>
  );
}

function InterceptBadge({ type }: { type: 'deductible' | 'limit' | 'uncaught' }) {
  const config = {
    deductible: { label: '免赔拦截', color: 'bg-warn/20 text-warn-light' },
    limit: { label: '限额封顶', color: 'bg-blue-500/20 text-blue-300' },
    uncaught: { label: '未被拦截', color: 'bg-danger/20 text-danger-light' },
  };
  const c = config[type];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${c.color}`}>
      {type === 'deductible' && <ShieldOff className="w-2.5 h-2.5" />}
      {c.label}
    </span>
  );
}

export default function ExtremeClaimTable() {
  const { result } = useSimulationStore();
  const [expanded, setExpanded] = useState(false);

  if (!result || result.extremeClaims.length === 0) return null;

  const display = expanded ? result.extremeClaims : result.extremeClaims.slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warn" />
          极端赔付诊断
        </h2>
        <span className="text-xs text-gray-500 font-mono">{result.extremeClaims.length} 条记录</span>
      </div>

      <div className="rounded-lg border border-surface-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-100 text-gray-500">
                <th className="px-3 py-2 text-left font-medium">严重度</th>
                <th className="px-3 py-2 text-left font-medium">拦截类型</th>
                <th className="px-3 py-2 text-right font-medium">原始金额</th>
                <th className="px-3 py-2 text-right font-medium">调整后金额</th>
                <th className="px-3 py-2 text-right font-medium">免赔扣除</th>
                <th className="px-3 py-2 text-left font-medium">来源保单</th>
                <th className="px-3 py-2 text-left font-medium">险种</th>
                <th className="px-3 py-2 text-right font-medium">模拟轮次</th>
              </tr>
            </thead>
            <tbody>
              {display.map((claim, i) => (
                <tr key={i} className={`border-t border-surface-200/50 ${
                  claim.severity === 'critical' ? 'bg-danger/5' : 'bg-warn/5'
                } hover:bg-surface-100/80`}>
                  <td className="px-3 py-1.5"><SeverityBadge severity={claim.severity} /></td>
                  <td className="px-3 py-1.5"><InterceptBadge type={claim.interceptType} /></td>
                  <td className="px-3 py-1.5 text-right font-mono text-white">{claim.rawAmount.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{claim.cappedAmount.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-warn">{claim.deductibleApplied.toLocaleString()}</td>
                  <td className="px-3 py-1.5 font-mono text-accent">{claim.sourcePolicyId}</td>
                  <td className="px-3 py-1.5 text-gray-400">{claim.sourceField}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-500">#{claim.simulationIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.extremeClaims.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 rounded-lg border border-surface-200 hover:border-accent/40 text-gray-500 hover:text-accent text-xs font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" />
          {expanded ? '收起' : `查看全部 ${result.extremeClaims.length} 条`}
        </button>
      )}
    </div>
  );
}
