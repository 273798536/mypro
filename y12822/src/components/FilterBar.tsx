import { useOffTargetStore } from '@/store/offTargetStore'
import { Search, Filter, X, RotateCcw } from 'lucide-react'

export default function FilterBar() {
  const { filters, setFilters, resetFilters, reagentBatches } = useOffTargetStore()

  const hasActiveFilters = filters.batchNo || filters.status || filters.negControlResult || filters.search || filters.dateRange

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <Filter className="w-4 h-4" />
          筛选条件
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索样本ID、位点、处理意见..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <select
          value={filters.batchNo}
          onChange={(e) => setFilters({ batchNo: e.target.value })}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white min-w-[160px]"
        >
          <option value="">全部试剂批号</option>
          {reagentBatches.map((b) => (
            <option key={b.id} value={b.batchNo}>{b.batchNo}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white min-w-[120px]"
        >
          <option value="">全部状态</option>
          <option value="normal">正常</option>
          <option value="anomaly">异常</option>
          <option value="approved">已复核</option>
        </select>

        <select
          value={filters.negControlResult}
          onChange={(e) => setFilters({ negControlResult: e.target.value })}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white min-w-[120px]"
        >
          <option value="">全部阴性对照</option>
          <option value="normal">对照正常</option>
          <option value="abnormal">对照异常</option>
          <option value="pending">待定</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateRange?.[0] || ''}
            onChange={(e) =>
              setFilters({
                dateRange: e.target.value ? [e.target.value, filters.dateRange?.[1] || '2099-12-31'] : null,
              })
            }
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
          <span className="text-zinc-400 text-xs">至</span>
          <input
            type="date"
            value={filters.dateRange?.[1] || ''}
            onChange={(e) =>
              setFilters({
                dateRange: e.target.value ? [filters.dateRange?.[0] || '2000-01-01', e.target.value] : null,
              })
            }
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
          {filters.dateRange && (
            <button
              onClick={() => setFilters({ dateRange: null })}
              className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
