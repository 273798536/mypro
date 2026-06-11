import { useMemo } from 'react';
import { CadRecord } from '../../types';
import { useFilterStore } from '../../store/filterStore';
import { PROCESS_STATUS_OPTIONS } from '../../utils/constants';
import { X, Filter, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  records: CadRecord[];
}

export const FilterPanel = ({ records }: FilterPanelProps) => {
  const conditions = useFilterStore((s) => s.conditions);
  const toggleProcessStatus = useFilterStore((s) => s.toggleProcessStatus);
  const toggleSource = useFilterStore((s) => s.toggleSource);
  const toggleLayer = useFilterStore((s) => s.toggleLayer);
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const setTimeRange = useFilterStore((s) => s.setTimeRange);
  const clearTimeRange = useFilterStore((s) => s.clearTimeRange);

  const availableSources = useMemo(() => {
    return [...new Set(records.map((r) => r.source))];
  }, [records]);

  const availableLayers = useMemo(() => {
    return [...new Set(records.map((r) => r.layer))];
  }, [records]);

  const timeRange = useMemo(() => {
    if (records.length < 2) return null;
    const times = records
      .filter((r) => r.timestamp)
      .map((r) => new Date(r.timestamp).getTime());
    if (times.length < 2) return null;
    return {
      min: new Date(Math.min(...times)).toISOString().slice(0, 16),
      max: new Date(Math.max(...times)).toISOString().slice(0, 16),
    };
  }, [records]);

  const hasActiveFilters =
    conditions.timeRange ||
    conditions.processStatus.length > 0 ||
    conditions.sources.length > 0 ||
    conditions.layers.length > 0;

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="font-medium text-slate-100 flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          筛选条件
        </h3>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {timeRange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 font-medium">时间范围</label>
              {conditions.timeRange && (
                <button
                  onClick={clearTimeRange}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={conditions.timeRange?.start || ''}
                  min={timeRange.min}
                  max={timeRange.max}
                  onChange={(e) =>
                    setTimeRange(
                      e.target.value,
                      conditions.timeRange?.end || timeRange.max
                    )
                  }
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={conditions.timeRange?.end || ''}
                  min={timeRange.min}
                  max={timeRange.max}
                  onChange={(e) =>
                    setTimeRange(
                      conditions.timeRange?.start || timeRange.min,
                      e.target.value
                    )
                  }
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">处理状态</label>
          <div className="flex flex-wrap gap-2">
            {PROCESS_STATUS_OPTIONS.map((option) => {
              const isActive = conditions.processStatus.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleProcessStatus(option.value)}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${option.color}`} />
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">
            数据来源
            {conditions.sources.length > 0 && (
              <span className="text-blue-400 ml-1">({conditions.sources.length})</span>
            )}
          </label>
          <div className="space-y-1">
            {availableSources.map((source) => {
              const isActive = conditions.sources.includes(source);
              return (
                <label
                  key={source}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isActive ? 'bg-blue-500/20' : 'hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleSource(source)}
                    className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-300">{source}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">
            CAD图层
            {conditions.layers.length > 0 && (
              <span className="text-blue-400 ml-1">({conditions.layers.length})</span>
            )}
          </label>
          <div className="space-y-1">
            {availableLayers.map((layer) => {
              const isActive = conditions.layers.includes(layer);
              return (
                <label
                  key={layer}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isActive ? 'bg-blue-500/20' : 'hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleLayer(layer)}
                    className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-300">{layer}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
