import { useState, useCallback } from 'react'
import { useStore, applyFilter } from '@/store'
import { Filter, X, RotateCcw } from 'lucide-react'

export default function FilterBar() {
  const { entries, filter, setFilter, clearFilter } = useStore()
  const [expanded, setExpanded] = useState(false)

  const projects = [...new Set(entries.map((e) => e.projectName))]
  const filtered = applyFilter(entries, filter)

  const summary = {
    total: filtered.length,
    aligned: filtered.filter((e) => e.alignmentStatus === 'aligned').length,
    misaligned: filtered.filter((e) => e.alignmentStatus === 'misaligned').length,
    pending: filtered.filter((e) => e.alignmentStatus === 'pending').length,
    expired: filtered.filter((e) => e.authorization.status === 'expired').length,
    expiring: filtered.filter((e) => e.authorization.status === 'expiring').length,
    flagged: filtered.filter((e) => e.reviewStatus === 'flagged').length,
  }

  const hasFilter = filter.project || filter.status || filter.dateRange

  const handleDateStart = useCallback(
    (v: string) => {
      setFilter({
        dateRange: {
          start: v,
          end: filter.dateRange?.end || v,
        },
      })
    },
    [filter.dateRange, setFilter]
  )

  const handleDateEnd = useCallback(
    (v: string) => {
      setFilter({
        dateRange: {
          start: filter.dateRange?.start || v,
          end: v,
        },
      })
    },
    [filter.dateRange, setFilter]
  )

  return (
    <div className="bg-[#16162a] border-b border-[#2a2a4a]">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              hasFilter
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-[#2a2a4a] text-gray-300 hover:bg-[#3a3a5a]'
            }`}
          >
            <Filter size={14} />
            筛选
            {hasFilter && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
          {hasFilter && (
            <button
              onClick={clearFilter}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-[#2a2a4a] transition-colors"
            >
              <RotateCcw size={12} />
              重置
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">总计</span>
            <span className="text-gray-200 font-mono font-semibold">{summary.total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gray-400">对齐</span>
            <span className="text-emerald-400 font-mono font-semibold">{summary.aligned}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-gray-400">异常</span>
            <span className="text-red-400 font-mono font-semibold">{summary.misaligned}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-gray-400">临期</span>
            <span className="text-yellow-400 font-mono font-semibold">{summary.expiring}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-gray-400">过期</span>
            <span className="text-red-500 font-mono font-semibold">{summary.expired}</span>
          </div>
          {summary.flagged > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-gray-400">待确认</span>
              <span className="text-orange-400 font-mono font-semibold">{summary.flagged}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">项目</label>
            <div className="relative">
              <select
                value={filter.project || ''}
                onChange={(e) => setFilter({ project: e.target.value || null })}
                className="appearance-none bg-[#2a2a4a] text-gray-200 text-sm rounded-lg px-3 py-1.5 pr-8 border border-[#3a3a5a] focus:outline-none focus:border-amber-500/50"
              >
                <option value="">全部</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {filter.project && (
                <button
                  onClick={() => setFilter({ project: null })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">状态</label>
            <div className="relative">
              <select
                value={filter.status || ''}
                onChange={(e) => setFilter({ status: e.target.value || null })}
                className="appearance-none bg-[#2a2a4a] text-gray-200 text-sm rounded-lg px-3 py-1.5 pr-8 border border-[#3a3a5a] focus:outline-none focus:border-amber-500/50"
              >
                <option value="">全部</option>
                <option value="aligned">已对齐</option>
                <option value="misaligned">异常</option>
                <option value="pending">待定</option>
                <option value="expired">授权过期</option>
                <option value="expiring">授权临期</option>
                <option value="needs_confirmation">需确认</option>
                <option value="flagged">待确认</option>
              </select>
              {filter.status && (
                <button
                  onClick={() => setFilter({ status: null })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">日期起</label>
            <input
              type="date"
              value={filter.dateRange?.start || ''}
              onChange={(e) => handleDateStart(e.target.value)}
              className="bg-[#2a2a4a] text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-[#3a3a5a] focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">日期止</label>
            <input
              type="date"
              value={filter.dateRange?.end || ''}
              onChange={(e) => handleDateEnd(e.target.value)}
              className="bg-[#2a2a4a] text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-[#3a3a5a] focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      )}
    </div>
  )
}
