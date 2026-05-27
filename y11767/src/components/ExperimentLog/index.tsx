import { useState } from 'react';
import { History, Trash2, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { formatTimestamp, exportToJSON } from '../../utils/export';
import { cn } from '../../utils/cn';

export function ExperimentLog() {
  const records = useExperimentStore((state) => state.records);
  const deleteRecord = useExperimentStore((state) => state.deleteRecord);
  const loadRecord = useExperimentStore((state) => state.loadRecord);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExport = (record: any) => {
    exportToJSON(record, `experiment-${record.id}.json`);
  };

  if (records.length === 0) {
    return (
      <div className="bg-space-800 rounded-lg p-4 border border-space-700">
      <div className="flex items-center gap-2 mb-2">
        <History size={18} className="text-white/50" />
        <h3 className="text-sm font-medium text-white/70">实验记录</h3>
      </div>
      <p className="text-sm text-white/40">暂无实验记录，点击相机按钮保存实验</p>
    </div>
    );
  }

  return (
    <div className="bg-space-800 rounded-lg border border-space-700 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-space-700">
        <div className="flex items-center gap-2">
          <History size={18} className="text-cyber-400" />
          <h3 className="text-sm font-medium">实验记录</h3>
          <span className="text-xs text-white/50">({records.length})</span>
        </div>
        <button
          onClick={() => exportToJSON(records, 'all-experiments.json')}
          className="text-xs text-cyber-400 hover:text-cyber-300 transition-colors"
        >
          导出全部
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {records.map((record) => (
        <div
          key={record.id}
          className="border-b border-space-700/50 last:border-b-0"
        >
          <button
            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            className="w-full px-4 py-3 hover:bg-space-700/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-sm font-medium">
                实验 #{records.indexOf(record) + 1}
              </div>
              <div className="text-xs text-white/50 mono-text">
                {formatTimestamp(record.timestamp)}
              </div>
              </div>
              <div className="flex items-center gap-2">
                {record.errors.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-alert-orange/20 text-alert-orange text-xs rounded">
                    {record.errors.length} 异常
                  </span>
                )}
                {expandedId === record.id ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
            </div>
          </button>

          {expandedId === record.id && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-space-700/50 rounded p-2">
                  <div className="text-white/50 mb-1">初始动量</div>
                  <div className="mono-text text-cyber-400">
                    {record.momentumBefore.magnitude.toFixed(4)} kg·m/s
                  </div>
                </div>
                <div className="bg-space-700/50 rounded p-2">
                  <div className="text-white/50 mb-1">最终动量</div>
                  <div className="mono-text text-cyber-400">
                    {record.momentumAfter.magnitude.toFixed(4)} kg·m/s
                  </div>
                </div>
                <div className="bg-space-700/50 rounded p-2">
                  <div className="text-white/50 mb-1">初始动能</div>
                  <div className="mono-text text-cyber-400">
                    {record.kineticEnergyBefore.toFixed(4)} J
                  </div>
                </div>
                <div className="bg-space-700/50 rounded p-2">
                  <div className="text-white/50 mb-1">最终动能</div>
                  <div className="mono-text text-cyber-400">
                    {record.kineticEnergyAfter.toFixed(4)} J
                  </div>
                </div>
              </div>

              {record.modificationTraces.length > 0 && (
                <div className="bg-space-700/30 rounded p-2">
                  <div className="text-xs text-white/50 mb-1">修改痕迹</div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {record.modificationTraces.map((trace, idx) => (
                      <div key={idx} className="text-xs mono-text text-white/60">
                        {trace.field}: {JSON.stringify(trace.oldValue)} → {JSON.stringify(trace.newValue)}
                        <span className="text-white/40 ml-2">
                          ({trace.source || 'unknown'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadRecord(record);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-cyber-500/20 text-cyber-400 text-xs rounded hover:bg-cyber-500/30 transition-colors"
                >
                  <Eye size={14} />
                  加载
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(record);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-space-700 text-xs rounded hover:bg-space-600 transition-colors"
                >
                  <Download size={14} />
                  导出
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRecord(record.id);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
