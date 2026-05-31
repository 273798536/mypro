import React from 'react';
import { Search, RefreshCw, Filter } from 'lucide-react';
import { FilterConditions } from '../types';
import { statusLabels, riskTypeLabels } from '../data/mockData';

interface FilterBarProps {
  filters: FilterConditions;
  onFilterChange: (filters: FilterConditions) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onReset }) => {
  const handleChange = (key: keyof FilterConditions, value: string | null) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">筛选条件</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">项目名称</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={filters.projectName}
              onChange={(e) => handleChange('projectName', e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">批次号</label>
          <input
            type="text"
            placeholder="输入批次号..."
            value={filters.batchNo}
            onChange={(e) => handleChange('batchNo', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">匹配状态</label>
          <select
            value={filters.matchStatus}
            onChange={(e) => handleChange('matchStatus', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">风险类型</label>
          <select
            value={filters.riskType}
            onChange={(e) => handleChange('riskType', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">全部风险</option>
            <option value="none">无风险</option>
            {Object.entries(riskTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
