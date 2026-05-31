import React from 'react';
import { X, Filter as FilterIcon } from 'lucide-react';
import type { FilterOptions, AbnormalLevel, AbnormalType } from '../types';
import { ABNORMAL_LEVEL_LABELS, ABNORMAL_TYPE_LABELS } from '../utils/constants';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onClearFilters: () => void;
  showAbnormalLevel?: boolean;
  showAbnormalType?: boolean;
  showDateRange?: boolean;
  showResult?: boolean;
  showElevator?: boolean;
  showInspector?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  showAbnormalLevel = true,
  showAbnormalType = true,
  showDateRange = true,
  showResult = true,
  showElevator = true,
  showInspector = true,
}) => {
  const abnormalLevels: AbnormalLevel[] = ['normal', 'warning', 'serious', 'overload'];
  const abnormalTypes: AbnormalType[] = ['speed_gap', 'brake_delay', 'overload', 'brake_distance', 'missing_data'];

  const toggleAbnormalLevel = (level: AbnormalLevel) => {
    const current = filters.abnormalLevel || [];
    const next = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    onFilterChange({ abnormalLevel: next.length > 0 ? next : undefined });
  };

  const toggleAbnormalType = (type: AbnormalType) => {
    const current = filters.abnormalTypes || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFilterChange({ abnormalTypes: next.length > 0 ? next : undefined });
  };

  const hasActiveFilters = Object.keys(filters).some(
    key => {
      const value = (filters as any)[key];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FilterIcon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">筛选条件</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<X className="w-4 h-4" />}
          >
            清除筛选
          </Button>
        )}
      </div>

      {showElevator && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">电梯编号</label>
          <input
            type="text"
            value={filters.elevatorNo || ''}
            onChange={e => onFilterChange({ elevatorNo: e.target.value || undefined })}
            placeholder="输入电梯编号"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          />
        </div>
      )}

      {showInspector && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">检验员</label>
          <input
            type="text"
            value={filters.inspector || ''}
            onChange={e => onFilterChange({ inspector: e.target.value || undefined })}
            placeholder="输入检验员姓名"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          />
        </div>
      )}

      {showDateRange && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">开始日期</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => onFilterChange({ dateFrom: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">结束日期</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => onFilterChange({ dateTo: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>
        </div>
      )}

      {showAbnormalLevel && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">异常等级</label>
          <div className="flex flex-wrap gap-2">
            {abnormalLevels.map(level => {
              const isActive = filters.abnormalLevel?.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleAbnormalLevel(level)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                    isActive
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-200'
                  }`}
                >
                  {ABNORMAL_LEVEL_LABELS[level]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showAbnormalType && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">异常类型</label>
          <div className="flex flex-wrap gap-2">
            {abnormalTypes.map(type => {
              const isActive = filters.abnormalTypes?.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleAbnormalType(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                    isActive
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-200'
                  }`}
                >
                  {ABNORMAL_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showResult && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">综合结果</label>
          <div className="flex gap-2">
            <button
              onClick={() => onFilterChange({ overallResult: filters.overallResult === 'pass' ? undefined : 'pass' })}
              className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-all ${
                filters.overallResult === 'pass'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-200'
              }`}
            >
              合格
            </button>
            <button
              onClick={() => onFilterChange({ overallResult: filters.overallResult === 'fail' ? undefined : 'fail' })}
              className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-all ${
                filters.overallResult === 'fail'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-red-200'
              }`}
            >
              不合格
            </button>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">已选：</span>
          {filters.abnormalLevel?.map(level => (
            <Badge key={level} size="sm" variant="info" className="cursor-pointer" onClick={() => toggleAbnormalLevel(level)}>
              {ABNORMAL_LEVEL_LABELS[level]} ×
            </Badge>
          ))}
          {filters.abnormalTypes?.map(type => (
            <Badge key={type} size="sm" variant="warning" className="cursor-pointer" onClick={() => toggleAbnormalType(type)}>
              {ABNORMAL_TYPE_LABELS[type]} ×
            </Badge>
          ))}
          {filters.overallResult && (
            <Badge size="sm" variant={filters.overallResult === 'pass' ? 'success' : 'danger'} className="cursor-pointer" onClick={() => onFilterChange({ overallResult: undefined })}>
              {filters.overallResult === 'pass' ? '合格' : '不合格'} ×
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
