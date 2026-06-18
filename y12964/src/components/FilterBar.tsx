import { cn } from '@/lib/utils';
import type { FilterState, ArchiveStatus, AnomalyType } from '@/types';
import { statusLabelMap, anomalyTypeLabelMap } from '@/types';
import { Filter, X } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.anomalyType !== 'all' ||
    filters.dateRange.start ||
    filters.dateRange.end;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">筛选条件</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
            重置筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">归档状态</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value as ArchiveStatus | 'all' })}
            className={cn(
              'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
              'bg-white focus:outline-none focus:ring-2 focus:ring-slate-200',
              'transition-colors'
            )}
          >
            {Object.entries(statusLabelMap).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5">异常类型</label>
          <select
            value={filters.anomalyType}
            onChange={(e) => onFilterChange({ anomalyType: e.target.value as AnomalyType | 'all' })}
            className={cn(
              'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
              'bg-white focus:outline-none focus:ring-2 focus:ring-slate-200',
              'transition-colors'
            )}
          >
            {Object.entries(anomalyTypeLabelMap).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5">开始日期</label>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) =>
              onFilterChange({ dateRange: { ...filters.dateRange, start: e.target.value } })
            }
            className={cn(
              'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
              'bg-white focus:outline-none focus:ring-2 focus:ring-slate-200',
              'transition-colors'
            )}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5">结束日期</label>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) =>
              onFilterChange({ dateRange: { ...filters.dateRange, end: e.target.value } })
            }
            className={cn(
              'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
              'bg-white focus:outline-none focus:ring-2 focus:ring-slate-200',
              'transition-colors'
            )}
          />
        </div>
      </div>
    </div>
  );
}
