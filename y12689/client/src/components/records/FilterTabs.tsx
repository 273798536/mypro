import type { RecordStatus } from '@/types'

export type FilterType = 'all' | RecordStatus

interface FilterTabsProps {
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: Record<FilterType, number>
}

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'failed', label: '不合格' },
  { key: 'review', label: '待复核' },
  { key: 'passed', label: '已通过' },
  { key: 'pending', label: '待处理' },
]

const countColorMap: Record<FilterType, string> = {
  all: 'text-primary',
  failed: 'text-danger',
  review: 'text-warning',
  passed: 'text-success',
  pending: 'text-primary',
}

function FilterTabs({ currentFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1">
      {filterTabs.map((tab) => {
        const isActive = currentFilter === tab.key
        const colorClass = countColorMap[tab.key]
        return (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-dark'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                isActive
                  ? 'bg-white/20 text-white'
                  : `bg-bg-dark ${colorClass}`
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
