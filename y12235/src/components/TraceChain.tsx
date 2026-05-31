import { ChevronRight, FileText, Activity, CreditCard, Layers, Clock } from 'lucide-react';
import type { RunRecord } from '@/types';

interface TraceChainProps {
  record: RunRecord;
  onNavigate?: (path: string) => void;
}

export function TraceChain({ record, onNavigate }: TraceChainProps) {
  const chainItems = [
    {
      icon: <Layers size={14} />,
      label: '关卡',
      value: record.scenarioId,
      path: `/battle/${record.scenarioId}`,
      color: '#D4A017',
    },
    {
      icon: <Activity size={14} />,
      label: '曲线形态',
      value: record.isInverted ? '反向' : '正常',
      path: `/battle/${record.scenarioId}`,
      color: record.isInverted ? '#E53935' : '#43A047',
    },
    {
      icon: <CreditCard size={14} />,
      label: '持仓债券',
      value: `${record.portfolioSnapshot.length} 只`,
      path: `/battle/${record.scenarioId}`,
      color: '#D4A017',
    },
    {
      icon: <FileText size={14} />,
      label: '结算记录',
      value: `${record.totalScore} 分`,
      path: `/settlement/${record.scenarioId}/${record.id}`,
      color: record.totalScore >= 80 ? '#43A047' : record.totalScore >= 50 ? '#FFC107' : '#E53935',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-amber rounded-full" />
        <h3 className="text-sm font-semibold text-amber font-serif">溯源链</h3>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {chainItems.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => onNavigate?.(item.path)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all hover:bg-navy-700"
              style={{ borderLeft: `2px solid ${item.color}` }}
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-neutral-slate">{item.label}</span>
              <span className="font-mono text-white">{item.value}</span>
            </button>
            {i < chainItems.length - 1 && (
              <ChevronRight size={12} className="text-navy-500" />
            )}
          </div>
        ))}
      </div>

      {record.rerunFromId && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-navy-900 border border-navy-600">
          <Clock size={14} className="text-amber" />
          <span className="text-xs text-neutral-slate">由记录</span>
          <button
            onClick={() => onNavigate?.(`/settlement/${record.scenarioId}/${record.rerunFromId}`)}
            className="text-xs font-mono text-amber hover:underline"
          >
            {record.rerunFromId.slice(0, 16)}...
          </button>
          <span className="text-xs text-neutral-slate">重跑而来</span>
        </div>
      )}

      <div className="mt-3 text-xs text-neutral-slate font-mono">
        时间: {new Date(record.timestamp).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}
