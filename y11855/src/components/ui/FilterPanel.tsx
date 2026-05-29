import { useMemo } from 'react';
import { Search, Building2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore, useFilteredBuildings, useSceneMaxHeight } from '../../store/useAppStore';
import {
  BUILDING_TYPE_LABELS,
  BUILDING_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
  BUILDING_TYPE_COLORS,
  type BuildingType,
  type BuildingStatus,
  type IssueType
} from '../../types';

export function FilterPanel() {
  const filters = useAppStore(state => state.filters);
  const setFilters = useAppStore(state => state.setFilters);
  const resetFilters = useAppStore(state => state.resetFilters);
  const currentScene = useAppStore(state => state.currentScene);
  const filteredBuildings = useFilteredBuildings();
  const maxHeight = useSceneMaxHeight();

  const buildingTypes = Object.keys(BUILDING_TYPE_LABELS) as BuildingType[];
  const statusTypes = Object.keys(BUILDING_STATUS_LABELS) as BuildingStatus[];
  const issueTypes = Object.keys(ISSUE_TYPE_LABELS) as IssueType[];

  const toggleBuildingType = (type: BuildingType) => {
    const current = filters.buildingTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ buildingTypes: next });
  };

  const toggleStatusType = (status: BuildingStatus) => {
    const current = filters.statusTypes;
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ statusTypes: next });
  };

  const toggleIssueType = (type: IssueType) => {
    const current = filters.issueTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ issueTypes: next });
  };

  const totalBuildings = currentScene?.buildings.length || 0;

  return (
    <div className="w-[280px] h-full bg-slate-900/95 border-r border-slate-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Building2 size={16} className="text-blue-400" />
          筛选器
        </h2>
        
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索建筑名称或ID..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>筛选结果</span>
          <span className="text-blue-400 font-mono">{filteredBuildings.length} / {totalBuildings}</span>
        </div>

        <div>
          <h3 className="text-white text-xs font-medium mb-2 flex items-center gap-2">
            建筑类型
          </h3>
          <div className="space-y-1">
            {buildingTypes.map(type => (
              <label
                key={type}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.buildingTypes.includes(type)}
                  onChange={() => toggleBuildingType(type)}
                  className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: BUILDING_TYPE_COLORS[type] }}
                />
                <span className="text-xs text-slate-300 group-hover:text-white">
                  {BUILDING_TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white text-xs font-medium mb-2">高度范围 (米)</h3>
          <div className="px-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono">{filters.heightRange[0]}m</span>
              <span className="font-mono">{filters.heightRange[1]}m</span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={maxHeight}
                value={filters.heightRange[0]}
                onChange={(e) => setFilters({
                  heightRange: [Math.min(parseInt(e.target.value), filters.heightRange[1] - 5), filters.heightRange[1]]
                })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="range"
                min={0}
                max={maxHeight}
                value={filters.heightRange[1]}
                onChange={(e) => setFilters({
                  heightRange: [filters.heightRange[0], Math.max(parseInt(e.target.value), filters.heightRange[0] + 5)]
                })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white text-xs font-medium mb-2">建筑状态</h3>
          <div className="space-y-1">
            {statusTypes.map(status => (
              <label
                key={status}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.statusTypes.includes(status)}
                  onChange={() => toggleStatusType(status)}
                  className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 group-hover:text-white">
                  {BUILDING_STATUS_LABELS[status]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white text-xs font-medium mb-2 flex items-center gap-2">
            <AlertTriangle size={12} className="text-orange-400" />
            问题类型
          </h3>
          <div className="space-y-1">
            {issueTypes.map(type => (
              <label
                key={type}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.issueTypes.includes(type)}
                  onChange={() => toggleIssueType(type)}
                  className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 group-hover:text-white">
                  {ISSUE_TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={resetFilters}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw size={14} />
          重置筛选
        </button>
      </div>
    </div>
  );
}
