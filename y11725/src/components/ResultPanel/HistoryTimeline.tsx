import { Clock, Plus, Trash2, Edit3, Calculator, Upload } from 'lucide-react';
import { useThermoStore } from '../../hooks/useThermoStore';
import type { HistoryActionType } from '../../types';

const actionIcons: Record<HistoryActionType, typeof Plus> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
  calculate: Calculator,
  import: Upload,
};

const actionColors: Record<HistoryActionType, string> = {
  create: 'text-emerald-400 bg-emerald-500/20',
  update: 'text-blue-400 bg-blue-500/20',
  delete: 'text-red-400 bg-red-500/20',
  calculate: 'text-purple-400 bg-purple-500/20',
  import: 'text-amber-400 bg-amber-500/20',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function HistoryTimeline() {
  const { history } = useThermoStore();

  if (history.length === 0) {
    return (
      <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700 text-center">
        <Clock className="mx-auto text-slate-500 mb-2" size={24} />
        <p className="text-slate-400 text-sm">暂无操作记录</p>
        <p className="text-slate-500 text-xs mt-1">开始操作后，历史记录将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">操作历史</h3>
        <span className="text-xs text-slate-500">{history.length} 条记录</span>
      </div>

      <div className="relative pl-6 space-y-3 max-h-64 overflow-y-auto">
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-700" />

        {[...history].reverse().map((entry, index) => {
          const Icon = actionIcons[entry.type] || Plus;
          const colorClass = actionColors[entry.type] || 'text-slate-400 bg-slate-500/20';

          return (
            <div key={entry.id} className="relative">
              <div
                className={`absolute -left-4 top-0 w-4 h-4 rounded-full flex items-center justify-center ${colorClass}`}
              >
                <Icon size={10} />
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-800 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{entry.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
                      {entry.source && (
                        <span className="text-xs text-slate-500">· {entry.source}</span>
                      )}
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-500">
                      <span className="text-slate-400">类型: </span>
                      {entry.type === 'create' && '创建'}
                      {entry.type === 'update' && '更新'}
                      {entry.type === 'delete' && '删除'}
                      {entry.type === 'calculate' && '计算'}
                      {entry.type === 'import' && '导入'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
