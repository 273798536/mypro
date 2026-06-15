import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { useMaterialStore } from '@/store/useMaterialStore';
import { teachers, statusLabels, sourceLabels } from '@/data/mockData';
import type { MaterialStatus, MaterialSource } from '@/types';
import { cn } from '@/lib/utils';

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useMaterialStore();

  const hasActiveFilters =
    filters.search ||
    filters.teacher ||
    filters.status ||
    filters.source ||
    filters.dateRange.start ||
    filters.dateRange.end;

  const activeFilterCount = [
    filters.search,
    filters.teacher,
    filters.status,
    filters.source,
    filters.dateRange.start,
    filters.dateRange.end,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-[#0F2B4D]">
          <Filter className="w-5 h-5" />
          <h3 className="font-serif font-semibold">筛选条件</h3>
        </div>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-[#D4A853]/20 text-[#D4A853] rounded-full">
            {activeFilterCount} 个筛选
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索材料名称、老师、学生..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all"
          />
        </div>

        {/* Teacher */}
        <select
          value={filters.teacher}
          onChange={(e) => setFilters({ teacher: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all bg-white"
        >
          <option value="">全部老师</option>
          {teachers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as MaterialStatus | '' })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all bg-white"
        >
          <option value="">全部状态</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Source */}
        <select
          value={filters.source}
          onChange={(e) => setFilters({ source: e.target.value as MaterialSource | '' })}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all bg-white"
        >
          <option value="">全部来源</option>
          {Object.entries(sourceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="text-sm text-gray-500">日期范围:</span>
        <input
          type="date"
          value={filters.dateRange.start}
          onChange={(e) =>
            setFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })
          }
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all"
        />
        <span className="text-gray-400">至</span>
        <input
          type="date"
          value={filters.dateRange.end}
          onChange={(e) =>
            setFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })
          }
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all"
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={cn(
              'ml-auto flex items-center gap-1.5 px-3 py-2 text-sm',
              'text-gray-500 hover:text-[#0F2B4D] hover:bg-gray-100 rounded-lg transition-colors'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            重置筛选
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {filters.search && (
            <FilterTag label={`关键词: ${filters.search}`} onRemove={() => setFilters({ search: '' })} />
          )}
          {filters.teacher && (
            <FilterTag label={`老师: ${filters.teacher}`} onRemove={() => setFilters({ teacher: '' })} />
          )}
          {filters.status && (
            <FilterTag
              label={`状态: ${statusLabels[filters.status]}`}
              onRemove={() => setFilters({ status: '' })}
            />
          )}
          {filters.source && (
            <FilterTag
              label={`来源: ${sourceLabels[filters.source]}`}
              onRemove={() => setFilters({ source: '' })}
            />
          )}
          {filters.dateRange.start && (
            <FilterTag
              label={`开始: ${filters.dateRange.start}`}
              onRemove={() =>
                setFilters({ dateRange: { ...filters.dateRange, start: '' } })
              }
            />
          )}
          {filters.dateRange.end && (
            <FilterTag
              label={`结束: ${filters.dateRange.end}`}
              onRemove={() =>
                setFilters({ dateRange: { ...filters.dateRange, end: '' } })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#0F2B4D]/5 text-[#0F2B4D] rounded-md">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-[#0F2B4D]/10 rounded transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
