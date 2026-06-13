import { useState } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { useAttributionStore } from '@/store'
import { cn } from '@/lib/utils'

const SEVERITY_OPTIONS = [
  { value: 'normal' as const, label: '正常', color: '#2ECC71' },
  { value: 'warning' as const, label: '警告', color: '#FF6B35' },
  { value: 'critical' as const, label: '严重', color: '#E74C3C' },
]

const COMPONENT_TYPES = ['stator', 'rotor', 'bearing', 'shaft', 'housing', 'winding', 'sensor']
const COMPONENT_LABELS: Record<string, string> = {
  stator: '定子', rotor: '转子', bearing: '轴承',
  shaft: '轴', housing: '壳体', winding: '绕组', sensor: '传感器',
}

export default function FilterPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const { filters, setFilters } = useAttributionStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const toggleSeverity = (value: 'normal' | 'warning' | 'critical') => {
    const next = filters.severity.includes(value)
      ? filters.severity.filter((s) => s !== value)
      : [...filters.severity, value]
    setFilters({ ...filters, severity: next })
  }

  const setComponentType = (value: string | null) => {
    setFilters({ ...filters, componentType: value })
    setDropdownOpen(false)
  }

  const clearAll = () => {
    setFilters({ equipmentId: null, severity: [], componentType: null, source: null })
  }

  const activeTags: { key: string; label: string; onRemove: () => void }[] = []
  filters.severity.forEach((s) => {
    const opt = SEVERITY_OPTIONS.find((o) => o.value === s)
    if (opt) activeTags.push({ key: `sev-${s}`, label: opt.label, onRemove: () => toggleSeverity(s) })
  })
  if (filters.componentType) {
    activeTags.push({
      key: 'ctype',
      label: COMPONENT_LABELS[filters.componentType] ?? filters.componentType,
      onRemove: () => setComponentType(null),
    })
  }

  return (
    <div
      className={cn(
        'flex h-full border-l border-[#2A3F6A] bg-[#1B2A4A] transition-all duration-300',
        collapsed ? 'w-10' : 'w-72'
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-10 shrink-0 text-[#8899BB] hover:text-white transition-colors"
      >
        <Filter size={16} />
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#C8D6E5]">筛选条件</h3>
            <button
              onClick={clearAll}
              className="text-xs text-[#8899BB] hover:text-[#FF6B35] transition-colors"
            >
              清除全部
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#8899BB]">严重等级</p>
            <div className="space-y-1.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <span
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      filters.severity.includes(opt.value)
                        ? 'border-transparent'
                        : 'border-[#3A5078] group-hover:border-[#5A7098]'
                    )}
                    style={{
                      backgroundColor: filters.severity.includes(opt.value) ? opt.color : 'transparent',
                    }}
                  >
                    {filters.severity.includes(opt.value) && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs text-[#C8D6E5]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#8899BB]">零部件类型</p>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between rounded-lg bg-[#0F1D35] border border-[#2A3F6A] px-3 py-1.5 text-xs text-[#C8D6E5] hover:border-[#3A5078] transition-colors"
              >
                <span>
                  {filters.componentType
                    ? COMPONENT_LABELS[filters.componentType]
                    : '全部类型'}
                </span>
                <ChevronDown
                  size={14}
                  className={cn('transition-transform', dropdownOpen && 'rotate-180')}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-lg bg-[#0F1D35] border border-[#2A3F6A] shadow-lg overflow-hidden">
                  <button
                    onClick={() => setComponentType(null)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-[#1B2A4A] transition-colors',
                      !filters.componentType ? 'text-[#FF6B35]' : 'text-[#8899BB]'
                    )}
                  >
                    全部类型
                  </button>
                  {COMPONENT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setComponentType(t)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-[#1B2A4A] transition-colors',
                        filters.componentType === t ? 'text-[#FF6B35]' : 'text-[#8899BB]'
                      )}
                    >
                      {COMPONENT_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {activeTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#8899BB]">已激活筛选</p>
              <div className="flex flex-wrap gap-1.5">
                {activeTags.map((tag) => (
                  <span
                    key={tag.key}
                    className="inline-flex items-center gap-1 rounded-full bg-[#0F1D35] border border-[#2A3F6A] px-2.5 py-0.5 text-xs text-[#C8D6E5]"
                  >
                    {tag.label}
                    <button
                      onClick={tag.onRemove}
                      className="text-[#8899BB] hover:text-[#FF6B35] transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
