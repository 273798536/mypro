import { Search, Filter, X } from 'lucide-react';
import { useStore } from '@/store';
import { RecordStatus, STATUS_LABELS } from '@/types';

const statusOptions: { value: RecordStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'confirmed', label: STATUS_LABELS.confirmed },
  { value: 'withdrawn', label: STATUS_LABELS.withdrawn },
  { value: 'annotated', label: STATUS_LABELS.annotated },
];

export default function FilterBar() {
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const records = useStore((state) => state.records);
  const filteredRecords = useStore((state) => state.getFilteredRecords());

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '' && v !== 'all'
  );

  const clearFilters = () => {
    setFilters({
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      stallNumber: undefined,
      keyword: undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">筛选</span>
          <span className="text-xs text-gray-400">
            ({filteredRecords.length}/{records.length} 条)
          </span>
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters({ status: option.value === 'all' ? undefined : option.value })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  (filters.status || 'all') === option.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索摊位号、备注、批注关键词..."
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ keyword: e.target.value || undefined })}
              className="input-field pl-9 text-sm"
            />
          </div>

          <input
            type="text"
            placeholder="摊位号"
            value={filters.stallNumber || ''}
            onChange={(e) => setFilters({ stallNumber: e.target.value || undefined })}
            className="input-field text-sm w-28"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
              className="input-field text-sm"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
              className="input-field text-sm"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <X className="w-4 h-4" />
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
