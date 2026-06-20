import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useReviewStore } from '../store'

export default function FilterBar() {
  const filters = useReviewStore((s) => s.filters)
  const updateFilter = useReviewStore((s) => s.updateFilter)
  const reviewItems = useReviewStore((s) => s.reviewItems)
  const materials = useReviewStore((s) => s.materials)
  const authorizationNotes = useReviewStore((s) => s.authorizationNotes)

  const summary = useMemo(() => {
    let items = reviewItems
    if (filters.songNumber) {
      items = items.filter((i) => i.songNumber.toLowerCase().includes(filters.songNumber.toLowerCase()))
    }
    if (filters.versionNumber) {
      items = items.filter((i) => i.versionNumber.toLowerCase().includes(filters.versionNumber.toLowerCase()))
    }
    if (filters.sourceChannel) {
      const materialIds = materials.filter((m) => m.sourceGroup.includes(filters.sourceChannel)).map((m) => m.id)
      items = items.filter((i) => materialIds.includes(i.materialId))
    }
    if (filters.dateRange) {
      const [start, end] = filters.dateRange
      items = items.filter((i) => i.reviewDate >= start && i.reviewDate <= end)
    }
    const lastAuth = authorizationNotes[authorizationNotes.length - 1]
    return {
      totalItems: items.length,
      confirmed: items.filter((i) => i.status === 'confirmed').length,
      pending: items.filter((i) => i.status === 'pending').length,
      anomaly: items.filter((i) => i.status === 'anomaly').length,
      lastAlignmentAt: lastAuth ? lastAuth.createdAt : null,
    }
  }, [reviewItems, materials, filters, authorizationNotes])

  const hasFilters = filters.songNumber || filters.versionNumber || filters.sourceChannel || filters.dateRange

  return (
    <div className="w-full border-b border-amber/30 bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-ivoryMuted">
            <Search size={16} />
            <span className="text-sm font-medium tracking-wide">筛选条件</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="曲号 (如 EN-01)"
              value={filters.songNumber}
              onChange={(e) => updateFilter({ songNumber: e.target.value })}
              className="w-32 text-xs"
            />
            <input
              type="text"
              placeholder="版本号 (如 v3.2)"
              value={filters.versionNumber}
              onChange={(e) => updateFilter({ versionNumber: e.target.value })}
              className="w-28 text-xs"
            />
            <select
              value={filters.sourceChannel}
              onChange={(e) => updateFilter({ sourceChannel: e.target.value })}
              className="text-xs"
            >
              <option value="">全部来源</option>
              <option value="第三季度排练群">第三季度排练群</option>
              <option value="琴房协调群">琴房协调群</option>
            </select>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.dateRange?.[0] || ''}
                onChange={(e) =>
                  updateFilter({
                    dateRange: e.target.value
                      ? [e.target.value, filters.dateRange?.[1] || '2099-12-31']
                      : null,
                  })
                }
                className="w-32 text-xs"
              />
              <span className="text-ivoryMuted text-xs">—</span>
              <input
                type="date"
                value={filters.dateRange?.[1] || ''}
                onChange={(e) =>
                  updateFilter({
                    dateRange: e.target.value
                      ? [filters.dateRange?.[0] || '2000-01-01', e.target.value]
                      : null,
                  })
                }
                className="w-32 text-xs"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() =>
                updateFilter({
                  songNumber: '',
                  versionNumber: '',
                  sourceChannel: '',
                  dateRange: null,
                })
              }
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-coral hover:bg-coral/10 transition-colors"
            >
              <X size={12} />
              清除筛选
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-ivoryMuted">页面摘要</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sage" />
              已确认 <span className="font-semibold text-ivory">{summary.confirmed}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-mist" />
              待复核 <span className="font-semibold text-ivory">{summary.pending}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-coral" />
              异常 <span className="font-semibold text-ivory">{summary.anomaly}</span>
            </span>
            <span className="text-ivoryMuted">|</span>
            <span className="text-ivoryMuted">
              共 <span className="font-semibold text-ivory">{summary.totalItems}</span> 条
            </span>
          </div>
          {summary.lastAlignmentAt && (
            <span className="text-amber text-xs">
              最后对齐: {new Date(summary.lastAlignmentAt).toLocaleString('zh-CN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
