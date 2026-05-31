import { useState } from 'react';
import { History, Camera, Trash2, Download, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { HistoryRecord } from '../types';

export default function HistoryPanel() {
  const history = useWorkspaceStore((state) => state.history);
  const removeHistoryRecord = useWorkspaceStore((state) => state.removeHistoryRecord);
  const clearHistory = useWorkspaceStore((state) => state.clearHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const exportRecord = (record: HistoryRecord) => {
    const data = {
      formula: record.formula,
      parameters: record.parameters,
      timestamp: record.timestamp,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `implicit-surface-${record.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          历史记录
          <span className="text-[11px] text-slate-500 font-normal">({history.length})</span>
        </h3>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
          >
            清空
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700/50 flex items-center justify-center">
            <History size={20} className="text-slate-500" />
          </div>
          <p className="text-xs text-slate-400">暂无历史记录</p>
          <p className="text-[11px] text-slate-500 mt-1">保存快照后将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {history.map((record) => (
            <div
              key={record.id}
              className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(record.id)}
                className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors"
              >
                {record.screenshot ? (
                  <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img
                      src={record.screenshot}
                      alt="snapshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center">
                    <Camera size={16} className="text-slate-500" />
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {record.formula.name}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} />
                    {formatDate(record.timestamp)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {expandedId === record.id ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </div>
              </button>

              {expandedId === record.id && (
                <div className="px-3 pb-3 border-t border-slate-700/50">
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">隐函数公式</p>
                      <code className="text-[11px] text-cyan-300 font-mono block bg-slate-900 px-2 py-1.5 rounded break-all">
                        {record.formula.expression}
                      </code>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">参数配置</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(record.parameters).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded font-mono"
                          >
                            {key} = {value.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => exportRecord(record)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                      >
                        <Download size={12} />
                        导出配置
                      </button>
                      <button
                        onClick={() => removeHistoryRecord(record.id)}
                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
