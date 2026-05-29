import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'
import { cn } from '@/lib/utils'

interface TugPanelProps {
  selectedTugIds: string[]
  onToggleTug: (tugId: string) => void
  requiredTugs: number
}

function FuelBar({ currentFuel, maxFuel }: { currentFuel: number; maxFuel: number }) {
  const ratio = maxFuel > 0 ? Math.max(0, Math.min(1, currentFuel / maxFuel)) : 0
  let barColor = 'bg-green-500'
  if (ratio < 0.33) barColor = 'bg-red-500'
  else if (ratio < 0.66) barColor = 'bg-yellow-500'

  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

function TugCard({
  tug,
  isSelected,
  canSelect,
  onClick,
}: {
  tug: { id: string; name: string; horsepower: number; maxFuel: number; currentFuel: number; status: 'idle' | 'busy'; busyUntil: number }
  isSelected: boolean
  canSelect: boolean
  onClick: () => void
}) {
  const isIdle = tug.status === 'idle'
  const clickable = isIdle && (isSelected || canSelect)

  return (
    <div
      onClick={clickable ? onClick : undefined}
      role="button"
      tabIndex={clickable ? 0 : -1}
      className={cn(
        'rounded-lg border p-3 transition-all',
        isSelected
          ? 'border-cyan-400 shadow-lg shadow-cyan-400/20'
          : 'border-gray-700',
        clickable ? 'cursor-pointer hover:border-gray-500 hover:bg-slate-800' : 'cursor-default opacity-60'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSelected && (
            <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-white font-medium text-sm">{tug.name}</span>
          <span className="text-gray-500 text-xs">{tug.id}</span>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isIdle ? 'bg-green-600 text-green-100' : 'bg-orange-600 text-orange-100'
          )}
        >
          {isIdle ? '待命' : '作业中'}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
        <span>{tug.horsepower}马力</span>
        <span>{tug.currentFuel}/{tug.maxFuel}</span>
      </div>

      <FuelBar currentFuel={tug.currentFuel} maxFuel={tug.maxFuel} />

      {!isIdle && tug.busyUntil > 0 && (
        <div className="text-xs text-orange-400 mt-1.5">
          忙至 {minutesToTime(tug.busyUntil)}
        </div>
      )}
    </div>
  )
}

export default function TugPanel({ selectedTugIds, onToggleTug, requiredTugs }: TugPanelProps) {
  const tugs = useGameStore(s => s.tugs)

  return (
    <div className="flex flex-col h-full bg-[#0A1628]">
      <div className="px-3 py-2 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold">拖轮列表</h2>
        <p className="text-gray-400 text-xs mt-0.5">需选择 {requiredTugs} 艘 · 已选 {selectedTugIds.length} 艘</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tugs.map(tug => (
          <TugCard
            key={tug.id}
            tug={tug}
            isSelected={selectedTugIds.includes(tug.id)}
            canSelect={selectedTugIds.length < requiredTugs}
            onClick={() => onToggleTug(tug.id)}
          />
        ))}
      </div>
    </div>
  )
}
