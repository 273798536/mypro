import { useState, useRef, useEffect } from 'react'
import { useReviewStore } from '@/store'
import { SlidersHorizontal, X } from 'lucide-react'

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 px-3 py-1.5 bg-[#2a3544] rounded text-sm text-gray-300 hover:bg-[#3a4a5c] border border-gray-600"
        onClick={() => setOpen(!open)}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-[#60a5fa] text-white text-xs px-1.5 rounded-full">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e2d3d] border border-gray-600 rounded shadow-lg z-20 min-w-[160px] py-1">
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="rounded border-gray-500"
              />
              {opt.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar() {
  const { coordSystems, stations, filter, setFilter, resetFilter } = useReviewStore()

  const statusOptions = [
    { id: 'normal', name: '正常' },
    { id: 'warning', name: '警告' },
    { id: 'error', name: '异常' },
  ]

  const handleRangeChange = (idx: number, val: number) => {
    const newRange: [number, number] = [...filter.deviationRange]
    newRange[idx] = val
    if (newRange[0] <= newRange[1]) {
      setFilter({ deviationRange: newRange })
    }
  }

  return (
    <div className="w-full flex items-center gap-3 px-4 py-2 bg-[#1a2332] flex-wrap">
      <SlidersHorizontal size={16} className="text-gray-400" />
      <MultiSelect
        label="坐标系"
        options={coordSystems.map((c) => ({ id: c.id, name: c.name }))}
        selected={filter.coordSystemIds}
        onChange={(ids) => setFilter({ coordSystemIds: ids })}
      />
      <MultiSelect
        label="站点"
        options={stations.map((s) => ({ id: s.id, name: s.name }))}
        selected={filter.stationIds}
        onChange={(ids) => setFilter({ stationIds: ids })}
      />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2a3544] rounded border border-gray-600">
        <span className="text-sm text-gray-300">偏差</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={filter.deviationRange[0]}
          onChange={(e) => handleRangeChange(0, Number(e.target.value))}
          className="w-16 accent-blue-400"
        />
        <span className="text-xs text-gray-400 w-6">{filter.deviationRange[0]}</span>
        <span className="text-gray-500">~</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={filter.deviationRange[1]}
          onChange={(e) => handleRangeChange(1, Number(e.target.value))}
          className="w-16 accent-blue-400"
        />
        <span className="text-xs text-gray-400 w-6">{filter.deviationRange[1]}</span>
      </div>
      <MultiSelect
        label="状态"
        options={statusOptions}
        selected={filter.statuses as string[]}
        onChange={(ids) => setFilter({ statuses: ids as ('normal' | 'warning' | 'error')[] })}
      />
      <button
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        onClick={resetFilter}
      >
        <X size={14} />
        重置
      </button>
    </div>
  )
}
