import type { Revision } from '@/types';
import { History, User, Clock } from 'lucide-react';

interface Props {
  revisions: Revision[];
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    arrivalRate: '到达率',
    serviceRate: '服务率',
    numCounters: '柜台数',
    queueThreshold: '排队阈值',
    lunchStart: '午休开始',
    lunchEnd: '午休结束',
    peakArrivalRate: '高峰到达率',
    avgServiceTime: '平均服务时长',
    maxServiceTime: '最长服务时长',
    switchCost: '切换成本',
  };
  return map[field] || field;
}

export default function RevisionTrace({ revisions }: Props) {
  if (revisions.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <History className="w-4 h-4" />
          <span className="text-sm">暂无修正记录</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">修正痕迹</h3>
        <span className="text-xs text-slate-500">({revisions.length} 条)</span>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {revisions.slice().reverse().map((r) => (
          <div key={r.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-200">{fieldLabel(r.field)}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{new Date(r.timestamp).toLocaleString('zh-CN')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{r.oldValue}</span>
              <span className="text-amber-400">→</span>
              <span className="text-emerald-400">{r.newValue}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <div className="flex items-center gap-1 text-slate-400">
                <User className="w-3 h-3" />
                <span>{r.source}</span>
              </div>
              <span className="text-slate-500">{r.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
