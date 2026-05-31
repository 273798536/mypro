import { X } from 'lucide-react'
import { useRefundStore } from '@/store/useRefundStore'

const statusOptions = ['全部', '待处理', '已计算', '已导出'] as const

const inputBase =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#1a2332] outline-none transition-shadow placeholder:text-gray-400 focus:border-[#d4943a] focus:ring-2 focus:ring-[#d4943a]/20'

export default function FilterPanel() {
  const filters = useRefundStore((s) => s.filters)
  const setFilter = useRefundStore((s) => s.setFilter)
  const resetFilters = useRefundStore((s) => s.resetFilters)

  const activeTags: { label: string; onRemove: () => void }[] = []

  if (filters.studentName) {
    activeTags.push({
      label: `学员: ${filters.studentName}`,
      onRemove: () => setFilter('studentName', ''),
    })
  }
  if (filters.courseName) {
    activeTags.push({
      label: `课程: ${filters.courseName}`,
      onRemove: () => setFilter('courseName', ''),
    })
  }
  if (filters.dateRange[0]) {
    activeTags.push({
      label: `起始: ${filters.dateRange[0]}`,
      onRemove: () => setFilter('dateRange', ['', filters.dateRange[1]]),
    })
  }
  if (filters.dateRange[1]) {
    activeTags.push({
      label: `截止: ${filters.dateRange[1]}`,
      onRemove: () => setFilter('dateRange', [filters.dateRange[0], '']),
    })
  }
  if (filters.status !== '全部') {
    activeTags.push({
      label: `状态: ${filters.status}`,
      onRemove: () => setFilter('status', '全部'),
    })
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">学员姓名</span>
          <input
            type="text"
            placeholder="搜索学员"
            value={filters.studentName}
            onChange={(e) => setFilter('studentName', e.target.value)}
            className={inputBase + ' w-40'}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">课程名称</span>
          <input
            type="text"
            placeholder="搜索课程"
            value={filters.courseName}
            onChange={(e) => setFilter('courseName', e.target.value)}
            className={inputBase + ' w-40'}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">开始日期</span>
          <input
            type="date"
            value={filters.dateRange[0]}
            onChange={(e) => setFilter('dateRange', [e.target.value, filters.dateRange[1]])}
            className={inputBase + ' w-40'}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">结束日期</span>
          <input
            type="date"
            value={filters.dateRange[1]}
            onChange={(e) => setFilter('dateRange', [filters.dateRange[0], e.target.value])}
            className={inputBase + ' w-40'}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">退款状态</span>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilter('status', e.target.value as typeof filters.status)
            }
            className={inputBase + ' w-32 appearance-none'}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {activeTags.length > 0 && (
          <button
            onClick={resetFilters}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition-colors hover:bg-gray-50"
          >
            清除筛选
          </button>
        )}
      </div>

      {activeTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex items-center gap-1 rounded-full bg-[#d4943a]/10 px-3 py-1 text-xs font-medium text-[#d4943a]"
            >
              {tag.label}
              <button
                onClick={tag.onRemove}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[#d4943a]/20"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
