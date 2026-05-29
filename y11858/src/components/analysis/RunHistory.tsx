import { useAppStore } from '../../store/useAppStore';
import { History, Trash2, GitCompare } from 'lucide-react';
import type { ResultClassification } from '../../types';

const CLASS_COLORS: Record<ResultClassification, string> = {
  'ready': 'bg-green-400',
  'needs-review': 'bg-amber-400',
  'misleading': 'bg-red-400',
};

export function RunHistory() {
  const runHistory = useAppStore((s) => s.runHistory);
  const selectedRuns = useAppStore((s) => s.selectedRuns);
  const selectRun = useAppStore((s) => s.selectRun);
  const deselectRun = useAppStore((s) => s.deselectRun);
  const compareSelected = useAppStore((s) => s.compareSelected);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const currentParams = useAppStore((s) => s.currentParams);
  const setParams = useAppStore((s) => s.setParams);
  const setVizSettings = useAppStore((s) => s.setVizSettings);
  const setSliceSettings = useAppStore((s) => s.setSliceSettings);

  const loadRun = (run: typeof runHistory[0]) => {
    setParams(run.params);
    setVizSettings(run.vizSettings);
    setSliceSettings(run.sliceSettings);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            运行记录 ({runHistory.length})
          </h4>
        </div>
        <div className="flex gap-1">
          <button
            onClick={compareSelected}
            disabled={selectedRuns.length < 2}
            className="p-1 rounded text-slate-600 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="对比选中记录"
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearHistory}
            disabled={runHistory.length === 0}
            className="p-1 rounded text-slate-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="清空历史"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
        {runHistory.map((run) => {
          const isSelected = selectedRuns.includes(run.id);
          return (
            <div
              key={run.id}
              className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-cyan-400/10 border border-cyan-400/30'
                  : 'bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50'
              }`}
              onClick={() => {
                if (isSelected) {
                  deselectRun(run.id);
                } else {
                  selectRun(run.id);
                }
              }}
              onDoubleClick={() => loadRun(run)}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CLASS_COLORS[run.classification]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 truncate">
                  {run.params.name}
                </div>
                <div className="text-slate-600 font-mono">
                  ({run.params.n},{run.params.l},{run.params.m})
                </div>
              </div>
              <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">
                {formatTime(run.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {selectedRuns.length > 0 && (
        <div className="text-[10px] text-slate-600">
          已选 {selectedRuns.length}/4 · 单击选择 · 双击加载参数
        </div>
      )}
    </div>
  );
}
