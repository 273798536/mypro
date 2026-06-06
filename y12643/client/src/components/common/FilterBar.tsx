import { RecordStatus, ExceptionType, RecordType, FilterCriteria } from '@/types';
import { getStatusLabel, getExceptionTypeLabel, getRecordTypeLabel } from '@/utils/colorRules';
import { useAppStore } from '@/store/useAppStore';
import { Search, X, Filter } from 'lucide-react';

export function FilterBar() {
  const { filters, setFilters, resetFilters } = useAppStore();

  const allStatuses = Object.values(RecordStatus);
  const allExceptionTypes = Object.values(ExceptionType);
  const allRecordTypes = Object.values(RecordType);

  const toggleStatus = (status: RecordStatus) => {
    const current = filters.status || [];
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ status: next });
  };

  const toggleType = (type: ExceptionType) => {
    const current = filters.type || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ type: next });
  };

  const toggleRecordType = (type: RecordType) => {
    const current = filters.recordType || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ recordType: next });
  };

  const hasActiveFilters =
    (filters.status?.length || 0) > 0 ||
    (filters.type?.length || 0) > 0 ||
    (filters.recordType?.length || 0) > 0 ||
    filters.keyword;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter size={16} />
          <span className="text-sm font-medium">筛选条件</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
            清除全部
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-sm text-gray-500 w-20 shrink-0 pt-1.5">状态</span>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map(status => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  filters.status?.includes(status)
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-sm text-gray-500 w-20 shrink-0 pt-1.5">异常类型</span>
          <div className="flex flex-wrap gap-2">
            {allExceptionTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  filters.type?.includes(type)
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {getExceptionTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-sm text-gray-500 w-20 shrink-0 pt-1.5">数据类型</span>
          <div className="flex flex-wrap gap-2">
            {allRecordTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleRecordType(type)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  filters.recordType?.includes(type)
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {getRecordTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-sm text-gray-500 w-20 shrink-0 pt-1.5">关键词</span>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索标题、描述..."
              value={filters.keyword || ''}
              onChange={e => setFilters({ keyword: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
