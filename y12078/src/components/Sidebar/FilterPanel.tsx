import { useAppStore } from '@/store/useAppStore'
import type { IssueType } from '@/types'

const ISSUE_LABELS: Record<IssueType, { label: string; color: string; bg: string }> = {
  size_out_of_bound: { label: '尺寸越界', color: 'text-med-orange', bg: 'border-med-orange/40 bg-med-orange/10' },
  side_mismatch: { label: '侧别混淆', color: 'text-med-purple', bg: 'border-med-purple/40 bg-med-purple/10' },
  forbidden_zone_collision: { label: '禁区碰撞', color: 'text-med-red', bg: 'border-med-red/40 bg-med-red/10' },
}

export default function FilterPanel() {
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)

  const toggleIssueType = (type: IssueType) => {
    const current = filters.issueTypes
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    setFilters({ issueTypes: updated })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-med-text-dim font-mono mb-2 block">尺寸范围 (长度mm)</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={filters.sizeRange[0]}
            onChange={(e) =>
              setFilters({ sizeRange: [Number(e.target.value), filters.sizeRange[1]] })
            }
            className="flex-1 accent-med-blue h-1"
          />
          <span className="text-xs font-mono text-med-blue w-8">{filters.sizeRange[0]}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={filters.sizeRange[1]}
            onChange={(e) =>
              setFilters({ sizeRange: [filters.sizeRange[0], Number(e.target.value)] })
            }
            className="flex-1 accent-med-blue h-1"
          />
          <span className="text-xs font-mono text-med-blue w-8">{filters.sizeRange[1]}</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-med-text-dim font-mono mb-2 block">侧别筛选</label>
        <div className="flex gap-2">
          {(['all', 'left', 'right'] as const).map((lat) => {
            const labels = { all: '全部', left: '左侧', right: '右侧' }
            const isActive = filters.laterality === lat
            return (
              <button
                key={lat}
                onClick={() => setFilters({ laterality: lat })}
                className={`filter-btn ${isActive ? 'filter-btn-active' : 'filter-btn-inactive'}`}
              >
                {labels[lat]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-xs text-med-text-dim font-mono mb-2 block">问题类型</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ISSUE_LABELS) as IssueType[]).map((type) => {
            const info = ISSUE_LABELS[type]
            const isActive = filters.issueTypes.includes(type)
            return (
              <button
                key={type}
                onClick={() => toggleIssueType(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-all duration-150 ${
                  isActive ? info.bg + ' ' + info.color : 'border-med-border bg-med-dark-3/30 text-med-text-dim'
                }`}
              >
                {info.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
