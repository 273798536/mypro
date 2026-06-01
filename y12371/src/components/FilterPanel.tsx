import { Search, Filter, X } from 'lucide-react'
import { useScoreStore } from '../store/scoreStore'
import type { ScoreStatus } from '../types'

export default function FilterPanel() {
  const { filters, setFilters } = useScoreStore()

  const statusOptions: { value: ScoreStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'normal', label: '正常' },
    { value: 'pending', label: '待确认' },
    { value: 'anomaly', label: '异常' },
  ]

  const handleReset = () => {
    setFilters({
      status: 'all',
      search: '',
      dateRange: {},
    })
  }

  return (
    <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gold-400" />
          <h3 className="font-semibold text-white">筛选条件</h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-sm text-navy-400 hover:text-gold-400 transition-colors"
        >
          <X className="w-4 h-4" />
          重置
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            placeholder="搜索曲谱名称或作曲家..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
          />
        </div>

        {/* 状态筛选 */}
        <div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as ScoreStatus | 'all' })}
            className="w-full px-4 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all appearance-none cursor-pointer"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 日期范围 */}
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateRange.start || ''}
            onChange={(e) =>
              setFilters({
                dateRange: { ...filters.dateRange, start: e.target.value },
              })
            }
            className="flex-1 px-3 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
          />
          <span className="flex items-center text-navy-400">至</span>
          <input
            type="date"
            value={filters.dateRange.end || ''}
            onChange={(e) =>
              setFilters({
                dateRange: { ...filters.dateRange, end: e.target.value },
              })
            }
            className="flex-1 px-3 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
          />
        </div>
      </div>
    </div>
  )
}
