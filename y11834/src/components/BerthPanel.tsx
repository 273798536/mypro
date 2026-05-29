import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'
import { cn } from '@/lib/utils'

interface BerthPanelProps {
  selectedBerthId: string | null
  onSelectBerth: (berthId: string) => void
  shipTonnage: number
}

export default function BerthPanel({ selectedBerthId, onSelectBerth, shipTonnage }: BerthPanelProps) {
  const berths = useGameStore(s => s.berths)
  const ships = useGameStore(s => s.ships)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-3 py-2 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold">泊位选择</h2>
      </div>
      <div className="flex-1 p-2 grid grid-cols-2 grid-rows-2 gap-2">
        {berths.map(berth => {
          const isOccupied = berth.status === 'occupied'
          const isTooSmall = berth.maxTonnage < shipTonnage
          const isDisabled = isOccupied || isTooSmall
          const isSelected = selectedBerthId === berth.id
          const occupiedShip = isOccupied && berth.occupiedBy
            ? ships.find(s => s.id === berth.occupiedBy)
            : null

          return (
            <div
              key={berth.id}
              onClick={() => {
                if (!isDisabled) onSelectBerth(berth.id)
              }}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              className={cn(
                'rounded-lg border p-3 transition-all',
                isSelected
                  ? 'border-cyan-400 shadow-lg shadow-cyan-400/20 bg-gray-800'
                  : 'border-gray-700 bg-gray-800',
                isDisabled && 'opacity-40 cursor-not-allowed',
                !isDisabled && !isSelected && 'cursor-pointer hover:border-gray-500'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">{berth.name}</span>
                  <span className="text-gray-500 text-xs">{berth.id}</span>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    isOccupied
                      ? 'bg-amber-600 text-amber-100'
                      : 'bg-green-600 text-green-100'
                  )}
                >
                  {isOccupied ? '占用中' : '空闲'}
                </span>
              </div>

              <div className="text-xs text-gray-400 mb-1">
                <span>最大{berth.maxTonnage / 10000}万吨</span>
              </div>

              {isOccupied && occupiedShip && (
                <div className="text-xs text-gray-400">
                  <span>{occupiedShip.name} · 释放 {minutesToTime(berth.occupiedUntil)}</span>
                </div>
              )}

              {isTooSmall && !isOccupied && (
                <div className="text-xs text-red-400">
                  <span>吨位不足</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
