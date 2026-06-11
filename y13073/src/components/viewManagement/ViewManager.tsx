import { useState, useRef } from 'react';
import { SavedView, FilterConditions, ChartState } from '../../types';
import { useViewStore } from '../../store/viewStore';
import { useFilterStore } from '../../store/filterStore';
import { Save, Trash2, Eye, X, Plus } from 'lucide-react';

interface ViewManagerProps {
  chartState: ChartState;
}

export const ViewManager = ({ chartState }: ViewManagerProps) => {
  const savedViews = useViewStore((s) => s.savedViews);
  const activeViewId = useViewStore((s) => s.activeViewId);
  const saveView = useViewStore((s) => s.saveView);
  const deleteView = useViewStore((s) => s.deleteView);
  const applyView = useViewStore((s) => s.applyView);
  const filterConditions = useFilterStore((s) => s.conditions);
  const setFilters = useFilterStore((s) => s.setFilters);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!viewName.trim()) return;
    saveView(viewName.trim(), filterConditions, chartState);
    setViewName('');
    setShowSaveDialog(false);
  };

  const handleApply = (view: SavedView) => {
    const applied = applyView(view.id);
    if (applied) {
      setFilters(applied.filterConditions);
    }
  };

  const handleOpenSaveDialog = () => {
    setShowSaveDialog(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatFilterSummary = (conditions: FilterConditions): string => {
    const parts: string[] = [];
    if (conditions.processStatus.length > 0) {
      parts.push(`状态: ${conditions.processStatus.length}项`);
    }
    if (conditions.sources.length > 0) {
      parts.push(`来源: ${conditions.sources.length}项`);
    }
    if (conditions.timeRange) {
      parts.push('时间范围');
    }
    return parts.length > 0 ? parts.join(' | ') : '无筛选';
  };

  return (
    <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          视图条件
        </h4>
        <button
          onClick={handleOpenSaveDialog}
          className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          保存视图
        </button>
      </div>

      {savedViews.length === 0 ? (
        <div className="text-center py-4 text-slate-500 text-xs">
          <p>暂无保存的视图</p>
          <p className="mt-1">调整筛选条件和视角后点击"保存视图"</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {savedViews.map((view) => (
            <div
              key={view.id}
              className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
                activeViewId === view.id
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
              }`}
              onClick={() => handleApply(view)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 font-medium truncate">
                  {view.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {formatFilterSummary(view.filterConditions)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteView(view.id);
                }}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Save className="w-4 h-4 text-blue-400" />
                保存视图条件
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">视图名称</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="输入视图名称..."
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>

              <div className="bg-slate-700/50 rounded p-2 text-xs text-slate-400">
                <div className="font-medium text-slate-300 mb-1">将保存以下内容:</div>
                <ul className="space-y-0.5">
                  <li>• {formatFilterSummary(filterConditions)}</li>
                  <li>• 缩放级别: {chartState.zoom.toFixed(1)}x</li>
                  <li>• 视图中心: ({chartState.center.x.toFixed(0)}, {chartState.center.y.toFixed(0)})</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!viewName.trim()}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
