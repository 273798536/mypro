import React from 'react';
import { History, Clock, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import { useRLCStore } from '../store/useRLCStore';
import { getDampingTypeLabel } from '../engine/dampingAnalyzer';
import { getUnitLabel } from '../engine/unitConverter';

export const HistoryPanel: React.FC = () => {
  const { history, loadFromHistory, clearHistory, result } = useRLCStore();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (history.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <History className="w-6 h-6 text-purple-400" />
          计算历史
        </h2>
        <div className="text-center py-8">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">暂无计算记录</p>
          <p className="text-slate-500 text-xs mt-1">完成计算后记录将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-purple-400" />
          计算历史
        </h2>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          清空
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {history.map((record, index) => (
          <div
            key={record.id}
            className="bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-4 transition-colors cursor-pointer group"
            onClick={() => loadFromHistory(record.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">{formatTime(record.timestamp)}</span>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  loadFromHistory(record.id);
                }}
              >
                <ExternalLink className="w-3 h-3" />
                加载
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">R: </span>
                <span className="text-slate-300 font-mono">
                  {record.resistance.value}{getUnitLabel(record.resistance.unit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">L: </span>
                <span className="text-slate-300 font-mono">
                  {record.inductance.value}{getUnitLabel(record.inductance.unit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">C: </span>
                <span className="text-slate-300 font-mono">
                  {record.capacitance.value}{getUnitLabel(record.capacitance.unit)}
                </span>
              </div>
            </div>

            {record.corrections.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  {record.corrections.length} 次修正
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
