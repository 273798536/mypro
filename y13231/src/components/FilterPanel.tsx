import { Search, Filter, X } from 'lucide-react';
import { STATUS_LABELS } from '@/types';
import type { ConflictStatus, ConflictFilters } from '@/types';

interface FilterPanelProps {
  filters: ConflictFilters;
  onFilterChange: (filters: Partial<ConflictFilters>) => void;
  onClear: () => void;
}

export function FilterPanel({ filters, onFilterChange, onClear }: FilterPanelProps) {
  const hasActiveFilters = 
    filters.status || 
    filters.isTimecodeOffset !== undefined || 
    filters.keyword;

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary-600" />
        <h3 className="font-display font-semibold text-lg">筛选条件</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="ml-auto text-sm text-primary-500 hover:text-primary-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            清除筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="text"
            placeholder="搜索曲目名称、文件名..."
            value={filters.keyword || ''}
            onChange={(e) => onFilterChange({ keyword: e.target.value })}
            className="input-field pl-10"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ status: (e.target.value as ConflictStatus) || undefined })}
          className="select-field"
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.isTimecodeOffset === undefined ? '' : String(filters.isTimecodeOffset)}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({ 
              isTimecodeOffset: val === '' ? undefined : val === 'true' 
            });
          }}
          className="select-field"
        >
          <option value="">全部时码状态</option>
          <option value="true">时码偏半拍</option>
          <option value="false">无时码偏移</option>
        </select>
      </div>
    </div>
  );
}
