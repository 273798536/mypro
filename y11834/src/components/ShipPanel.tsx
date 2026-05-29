import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'
import type { Ship, ShipStatus } from '@/types'
import { cn } from '@/lib/utils'

interface ShipPanelProps {
  onSelectShip: (shipId: string) => void
  selectedShipId: string | null
}

const STATUS_STYLES: Record<ShipStatus, string> = {
  waiting: 'bg-gray-600 text-gray-300',
  arrived: 'bg-blue-600 text-blue-100',
  dispatched: 'bg-cyan-600 text-cyan-100',
  completed: 'bg-green-600 text-green-100',
  failed: 'bg-red-600 text-red-100',
}

const STATUS_LABELS: Record<ShipStatus, string> = {
  waiting: '等待',
  arrived: '已到港',
  dispatched: '已调度',
  completed: '已完成',
  failed: '已失败',
}

function TideCountdownBar({ ship, currentTime }: { ship: Ship; currentTime: number }) {
  const total = ship.tideWindowEnd - ship.tideWindowStart
  const remaining = ship.tideWindowEnd - currentTime
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0

  let barColor = 'bg-green-500'
  if (ratio < 0.33) barColor = 'bg-red-500'
  else if (ratio < 0.66) barColor = 'bg-yellow-500'

  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

function ShipCard({
  ship,
  currentTime,
  isSelected,
  onClick,
}: {
  ship: Ship
  currentTime: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={ship.status === 'arrived' ? 0 : -1}
      className={cn(
        'rounded-lg border p-3 transition-all',
        isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 'border-gray-700 hover:border-gray-500',
        ship.status === 'arrived' ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default opacity-60'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">{ship.name}</span>
          <span className="text-gray-500 text-xs">{ship.id}</span>
          {ship.isTideMissTest && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[ship.status])}>
          {STATUS_LABELS[ship.status]}
        </span>
      </div>

      <div className="flex gap-3 text-xs text-gray-400 mb-1.5">
        <span>{ship.tonnage / 10000}万吨</span>
        <span>需{ship.requiredTugs}艘拖轮</span>
      </div>

      <div className="text-xs text-gray-400">
        <span>潮汐窗口: {minutesToTime(ship.tideWindowStart)} - {minutesToTime(ship.tideWindowEnd)}</span>
      </div>

      {(ship.status === 'waiting' || ship.status === 'arrived') && (
        <TideCountdownBar ship={ship} currentTime={currentTime} />
      )}
    </div>
  )
}

export default function ShipPanel({ onSelectShip, selectedShipId }: ShipPanelProps) {
  const ships = useGameStore(s => s.ships)
  const currentTime = useGameStore(s => s.currentTime)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-3 py-2 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold">船舶列表</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {ships.map(ship => (
          <ShipCard
            key={ship.id}
            ship={ship}
            currentTime={currentTime}
            isSelected={selectedShipId === ship.id}
            onClick={() => {
              if (ship.status === 'arrived') onSelectShip(ship.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
