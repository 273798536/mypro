import { Filter, X, Search } from 'lucide-react';
import { useRecordPool } from '@/store/recordPool';
import { cn } from '@/lib/utils';
import { ANOMALY_TYPE_TEXT, STATUS_TEXT } from '@/utils/mockData';

export function FilterPanel() {
  const { filterConditions, setFilterConditions, resetFilters } = useRecordPool();

  const hasActiveFilters =
    filterConditions.anomalyType !== 'all' ||
    filterConditions.status !== 'all' ||
    filterConditions.dateFrom ||
    filterConditions.dateTo ||
    filterConditions.keyword;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="w-4 h-4" />
          <span className="font-medium text-sm">筛选条件</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索患者姓名/编号/评分项..."
            value={filterConditions.keyword}
            onChange={(e) => setFilterConditions({ keyword: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            异常类型
          </label>
          <select
            value={filterConditions.anomalyType}
            onChange={(e) =>
              setFilterConditions({
                anomalyType: e.target.value as typeof filterConditions.anomalyType,
              })
            }
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部类型</option>
            {Object.entries(ANOMALY_TYPE_TEXT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            处理状态
          </label>
          <select
            value={filterConditions.status}
            onChange={(e) =>
              setFilterConditions({
                status: e.target.value as typeof filterConditions.status,
              })
            }
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_TEXT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              开始日期
            </label>
            <input
              type="date"
              value={filterConditions.dateFrom}
              onChange={(e) => setFilterConditions({ dateFrom: e.target.value })}
              className={cn(
                'w-full px-2 py-2 text-sm border border-slate-200 rounded',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={filterConditions.dateTo}
              onChange={(e) => setFilterConditions({ dateTo: e.target.value })}
              className={cn(
                'w-full px-2 py-2 text-sm border border-slate-200 rounded',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
