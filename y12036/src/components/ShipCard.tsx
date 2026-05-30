import type { Ship } from '@/types/game'
import { Fuel, Gauge, Package, MapPin, Anchor } from 'lucide-react'

interface ShipCardProps {
  ship: Ship
  selected: boolean
  onClick: () => void
}

const STATUS_CONFIG: Record<Ship['status'], { label: string; borderColor: string; textColor: string; bg: string }> = {
  idle: { label: '待命', borderColor: 'border-tide-cyan', textColor: 'text-tide-cyan', bg: 'bg-tide-cyan/10' },
  sailing: { label: '航行中', borderColor: 'border-blue-500', textColor: 'text-blue-400', bg: 'bg-blue-500/10' },
  docking: { label: '靠泊', borderColor: 'border-tide-cyan', textColor: 'text-tide-cyan', bg: 'bg-tide-cyan/10' },
  loading: { label: '装卸中', borderColor: 'border-warn-amber', textColor: 'text-warn-amber', bg: 'bg-warn-amber/10' },
  locked: { label: '锁定', borderColor: 'border-lock-gold', textColor: 'text-lock-gold', bg: 'bg-lock-gold/10' },
}

export default function ShipCard({ ship, selected, onClick }: ShipCardProps) {
  const config = STATUS_CONFIG[ship.status]
  const fuelPercent = (ship.fuel / ship.maxFuel) * 100
  const fuelColor = fuelPercent > 50 ? 'bg-tide-cyan' : fuelPercent > 25 ? 'bg-warn-amber' : 'bg-fuel-red'
  const cargoCount = ship.cargo.reduce((s, c) => s + c.quantity, 0)
  const cargoPercent = (cargoCount / ship.capacity) * 100

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg border-l-4 ${config.borderColor}
        ${selected ? 'ring-2 ring-tide-cyan/60 bg-ocean-mid/80' : 'bg-ocean-dark/80'}
        border border-ocean-light/20 hover:border-ocean-light/50
        transition-all duration-200 p-3
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-serif-sc font-bold text-sm text-slate-100">{ship.name}</h3>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-sans-sc ${config.bg} ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-dock-gray">
          <Gauge size={12} />
          <span className="text-[10px] font-sans-sc">{ship.speed}节</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Fuel size={11} className="text-dock-gray shrink-0" />
          <div className="flex-1 h-1.5 bg-ocean-dark rounded-full overflow-hidden">
            <div
              className={`h-full ${fuelColor} rounded-full transition-all duration-300`}
              style={{ width: `${fuelPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-sans-sc text-slate-400 w-12 text-right">
            {ship.fuel}/{ship.maxFuel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Package size={11} className="text-dock-gray shrink-0" />
          <div className="flex-1 h-1.5 bg-ocean-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-lock-gold/70 rounded-full transition-all duration-300"
              style={{ width: `${cargoPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-sans-sc text-slate-400 w-12 text-right">
            {cargoCount}/{ship.capacity}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-dock-gray">
          <MapPin size={11} className="shrink-0" />
          <span className="text-[10px] font-sans-sc truncate">
            {ship.currentPortId ?? '航行中'}
          </span>
        </div>
      </div>

      {ship.cargo.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ship.cargo.map(c => (
            <span
              key={c.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-sans-sc bg-ocean-dark border border-ocean-light/20 text-slate-400"
            >
              {c.type}×{c.quantity}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <div className="absolute top-1.5 right-1.5">
          <Anchor size={12} className="text-tide-cyan" />
        </div>
      )}
    </div>
  )
}
