import { useStore } from '@/store/useStore'
import { STATUS_LABELS } from '@/types'
import type { RecordStatus } from '@/types'
import { Search, RotateCcw, X } from 'lucide-react'

const ALL_STATUSES: RecordStatus[] = ['normal', 'conflict', 'pending', 'resolved']

const REMARK_OPTIONS = [
  { value: null as boolean | null, label: '全部' },
  { value: true as boolean | null, label: '有后补备注' },
  { value: false as boolean | null, label: '无后补备注' },
]

export default function FilterBar() {
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const resetFilter = useStore((s) => s.resetFilter)

  const toggleStatus = (status: RecordStatus) => {
    const next = filter.status.includes(status)
      ? filter.status.filter((s) => s !== status)
      : [...filter.status, status]
    setFilter({ status: next })
  }

  const activeChips: { key: string; label: string; onRemove: () => void }[] = []

  filter.status.forEach((s) => {
    activeChips.push({
      key: `status-${s}`,
      label: STATUS_LABELS[s],
      onRemove: () => toggleStatus(s),
    })
  })

  if (filter.timecodeRangeStart) {
    activeChips.push({
      key: 'tc-start',
      label: `起点 ≥ ${filter.timecodeRangeStart}`,
      onRemove: () => setFilter({ timecodeRangeStart: '' }),
    })
  }
  if (filter.timecodeRangeEnd) {
    activeChips.push({
      key: 'tc-end',
      label: `终点 ≤ ${filter.timecodeRangeEnd}`,
      onRemove: () => setFilter({ timecodeRangeEnd: '' }),
    })
  }
  if (filter.keyword) {
    activeChips.push({
      key: 'keyword',
      label: `关键词: ${filter.keyword}`,
      onRemove: () => setFilter({ keyword: '' }),
    })
  }
  if (filter.hasSupplementaryRemark !== null) {
    activeChips.push({
      key: 'remark',
      label: filter.hasSupplementaryRemark ? '有后补备注' : '无后补备注',
      onRemove: () => setFilter({ hasSupplementaryRemark: null }),
    })
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#2d2d44', border: '1px solid #3a3a55' }}>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#e8e8e8]/70">状态:</span>
          {ALL_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-1 cursor-pointer text-sm text-[#e8e8e8]">
              <input
                type="checkbox"
                checked={filter.status.includes(s)}
                onChange={() => toggleStatus(s)}
                className="accent-[#f0a500]"
              />
              {STATUS_LABELS[s]}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#e8e8e8]/70">时码范围:</span>
          <input
            type="text"
            placeholder="起点"
            value={filter.timecodeRangeStart}
            onChange={(e) => setFilter({ timecodeRangeStart: e.target.value })}
            className="w-28 rounded-lg px-2 py-1 text-sm bg-[#1a1a2e] text-[#e8e8e8] border border-[#3a3a55] focus:border-[#f0a500] outline-none"
          />
          <span className="text-[#e8e8e8]/50">~</span>
          <input
            type="text"
            placeholder="终点"
            value={filter.timecodeRangeEnd}
            onChange={(e) => setFilter({ timecodeRangeEnd: e.target.value })}
            className="w-28 rounded-lg px-2 py-1 text-sm bg-[#1a1a2e] text-[#e8e8e8] border border-[#3a3a55] focus:border-[#f0a500] outline-none"
          />
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#e8e8e8]/50" />
          <input
            type="text"
            placeholder="搜索曲名/别名/原因"
            value={filter.keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
            className="w-48 rounded-lg pl-8 pr-2 py-1 text-sm bg-[#1a1a2e] text-[#e8e8e8] border border-[#3a3a55] focus:border-[#f0a500] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#e8e8e8]/70">后补备注:</span>
          {REMARK_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setFilter({ hasSupplementaryRemark: opt.value })}
              className="rounded-lg px-3 py-1 text-sm border transition-colors"
              style={{
                borderColor: filter.hasSupplementaryRemark === opt.value ? '#f0a500' : '#3a3a55',
                color: filter.hasSupplementaryRemark === opt.value ? '#f0a500' : '#e8e8e8/70',
                backgroundColor: filter.hasSupplementaryRemark === opt.value ? '#3d2a10' : 'transparent',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={resetFilter}
          className="rounded-lg px-3 py-1 text-sm border border-[#3a3a55] text-[#e8e8e8]/70 hover:border-[#f0a500] hover:text-[#f0a500] transition-colors flex items-center gap-1"
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs"
              style={{ backgroundColor: '#3d2a10', color: '#f0a500', border: '1px solid #f0a500' }}
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
