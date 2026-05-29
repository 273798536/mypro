import { useCallback, useMemo } from 'react'
import { Filter, ChevronLeft, ChevronRight, Building2, Wind, PersonStanding } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { CATEGORY_LABELS, WIND_SPEED_MAX, WIND_SPEED_MIN, HEIGHT_MAX, HEIGHT_MIN } from '@/types'
import type { VoxelData } from '@/types'

const CATEGORY_CONFIG: { key: VoxelData['category']; icon: typeof Building2; color: string }[] = [
  { key: 'building', icon: Building2, color: 'bg-blue-500' },
  { key: 'wind', icon: Wind, color: 'bg-emerald-500' },
  { key: 'pedestrian', icon: PersonStanding, color: 'bg-amber-500' },
]

function RangeSlider({
  label,
  unit,
  min,
  max,
  value,
  onChange,
  step = 1,
}: {
  label: string
  unit: string
  min: number
  max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  step?: number
}) {
  const range = max - min
  const leftPct = ((value[0] - min) / range) * 100
  const rightPct = ((value[1] - min) / range) * 100

  const handleMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (v <= value[1]) onChange([v, value[1]])
    },
    [value, onChange]
  )

  const handleMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (v >= value[0]) onChange([value[0], v])
    },
    [value, onChange]
  )

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#8B949E]">{label}</span>
        <span className="text-xs font-mono text-[#E6EDF3]">
          {value[0]}–{value[1]} {unit}
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded bg-[#2D333B]">
          <div
            className="absolute h-full rounded bg-blue-500"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleMin}
          className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={handleMax}
          className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  )
}

export default function FilterPanel() {
  const voxels = useStore(state => state.voxels)
  const { filters, setFilters, filterPanelOpen, toggleFilterPanel } = useStore()

  const filteredCount = useMemo(() => {
    return voxels.filter((v) => {
      if (!filters.categories.includes(v.category)) return false
      if (v.category === 'wind' || v.category === 'pedestrian') {
        if (v.windSpeed < filters.windSpeedRange[0] || v.windSpeed > filters.windSpeedRange[1]) return false
      }
      if (v.position[1] < filters.heightSlice[0] || v.position[1] > filters.heightSlice[1]) return false
      return true
    }).length
  }, [voxels, filters])

  const toggleCategory = (key: VoxelData['category']) => {
    const next = filters.categories.includes(key)
      ? filters.categories.filter((c) => c !== key)
      : [...filters.categories, key]
    if (next.length > 0) setFilters({ categories: next })
  }

  return (
    <div
      className="flex h-full bg-[#0F1419] border-r border-[#2D333B] transition-all duration-300 ease-in-out"
      style={{ width: filterPanelOpen ? 280 : 48 }}
    >
      <div className="flex flex-col w-full overflow-hidden">
        <div className="flex items-center justify-between px-3 h-12 border-b border-[#2D333B] shrink-0">
          {filterPanelOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <Filter size={16} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-[#E6EDF3] truncate">筛选</span>
            </div>
          )}
          <button
            onClick={toggleFilterPanel}
            className="p-1.5 rounded hover:bg-[#1A1F26] text-[#8B949E] hover:text-[#E6EDF3] transition-colors ml-auto"
          >
            {filterPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {filterPanelOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">类型</span>
              {CATEGORY_CONFIG.map(({ key, icon: Icon, color }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(key)}
                      onChange={() => toggleCategory(key)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-[#2D333B] peer-checked:border-transparent peer-checked:bg-blue-500 transition-colors" />
                    <svg
                      className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <Icon size={14} className="text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors" />
                  <span className="text-sm text-[#E6EDF3]">{CATEGORY_LABELS[key]}</span>
                </label>
              ))}
            </div>

            <RangeSlider
              label="风速范围"
              unit="m/s"
              min={WIND_SPEED_MIN}
              max={WIND_SPEED_MAX}
              value={filters.windSpeedRange}
              onChange={(v) => setFilters({ windSpeedRange: v })}
              step={0.5}
            />

            <RangeSlider
              label="高度切片"
              unit="m"
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              value={filters.heightSlice}
              onChange={(v) => setFilters({ heightSlice: v })}
            />

            <div className="pt-2 border-t border-[#2D333B]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B949E]">筛选体素数</span>
                <span className="text-sm font-mono text-blue-500">{filteredCount}</span>
              </div>
            </div>
          </div>
        )}

        {!filterPanelOpen && (
          <div className="flex flex-col items-center pt-4 gap-4">
            <Filter size={16} className="text-blue-500" />
            <Building2 size={14} className="text-[#8B949E]" />
            <Wind size={14} className="text-[#8B949E]" />
            <PersonStanding size={14} className="text-[#8B949E]" />
          </div>
        )}
      </div>
    </div>
  )
}
