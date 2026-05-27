import type { Scheme } from '@/types';
import { Trash2, FileDown, Eye } from 'lucide-react';

interface Props {
  scheme: Scheme;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (scheme: Scheme) => void;
}

export default function SchemeCard({ scheme, onSelect, onDelete, onExport }: Props) {
  const hasCritical = scheme.anomalies.some((a) => a.severity === 'critical');
  const hasWarning = scheme.anomalies.some((a) => a.severity === 'warning');

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-amber-600/50 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-slate-100">{scheme.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">来源: {scheme.source || '未标注'}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onSelect(scheme.id)}
            className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExport(scheme)}
            className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
            title="导出"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(scheme.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/50 rounded p-2">
          <span className="text-slate-500">等待时间</span>
          <p className="text-amber-400 font-medium">{scheme.result.Wq.toFixed(2)} 分</p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <span className="text-slate-500">队列长度</span>
          <p className="text-slate-200">{scheme.result.Lq.toFixed(2)} 人</p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <span className="text-slate-500">柜台/到达</span>
          <p className="text-slate-200">{scheme.params.numCounters} / {scheme.params.arrivalRate}</p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <span className="text-slate-500">利用率</span>
          <p className="text-slate-200">{(scheme.result.utilization * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
        {hasCritical && (
          <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded">严重异常</span>
        )}
        {hasWarning && (
          <span className="text-[10px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded">警告</span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">{scheme.revisions.length} 次修正</span>
      </div>

      <p className="text-[10px] text-slate-600 mt-2">
        更新于 {new Date(scheme.updatedAt).toLocaleString('zh-CN')}
      </p>
    </div>
  );
}
